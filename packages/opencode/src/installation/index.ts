import { LayerNode } from "@agnes-ai/core/effect/layer-node"
import { AppNodeBuilder } from "@agnes-ai/core/effect/app-node-builder"
import { httpClient } from "@agnes-ai/core/effect/app-node-platform"
import { Effect, Layer, Schema, Context, Stream } from "effect"
import { serviceUse } from "@agnes-ai/core/effect/service-use"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { withTransientReadRetry } from "@/util/effect-http-client"
import { errorMessage } from "@/util/error"
import { ChildProcess } from "effect/unstable/process"
import { AppProcess } from "@agnes-ai/core/process"
import path from "path"
import { makeRuntime } from "@agnes-ai/core/effect/runtime"
import semver from "semver"
import { InstallationChannel, InstallationVersion } from "@agnes-ai/core/installation/version"
import { NpmConfig } from "@agnes-ai/core/npm-config"
import { InstallationEvent } from "@agnes-ai/schema/installation-event"

export type Method = "curl" | "npm" | "yarn" | "pnpm" | "bun" | "brew" | "scoop" | "choco" | "unknown"

export type ReleaseType = "patch" | "minor" | "major"

export const Event = InstallationEvent

export function getReleaseType(current: string, latest: string): ReleaseType {
  const currMajor = semver.major(current)
  const currMinor = semver.minor(current)
  const newMajor = semver.major(latest)
  const newMinor = semver.minor(latest)

  if (newMajor > currMajor) return "major"
  if (newMinor > currMinor) return "minor"
  return "patch"
}

export const Info = Schema.Struct({
  version: Schema.String,
  latest: Schema.String,
}).annotate({ identifier: "InstallationInfo" })
export type Info = Schema.Schema.Type<typeof Info>

export function userAgent(client = "cli") {
  return `agnescode/${InstallationChannel}/${InstallationVersion}/${client}`
}

export const USER_AGENT = userAgent()

export function isPreview() {
  return InstallationChannel !== "latest"
}

export function isLocal() {
  return InstallationChannel === "local"
}

export class UpgradeFailedError extends Schema.TaggedErrorClass<UpgradeFailedError>()("UpgradeFailedError", {
  stderr: Schema.String,
}) {
  override get message() {
    return this.stderr
  }
}

// Only a newer release in the installed major version is a normal update. Source builds (`local`) have
// no installed major, so they follow the current 0.x line.
export function isUpdate(current: string, latest: string) {
  if (!semver.valid(latest)) return false
  if (!semver.valid(current)) return semver.major(latest) === 0
  return semver.major(latest) === semver.major(current) && semver.gt(latest, current)
}

// Releases are discovered from npm. Preview builds follow their own dist-tag, source builds follow latest.
const NPM_TAG = InstallationChannel === "local" ? "latest" : InstallationChannel

// Response schemas for external version APIs
const NpmPackage = Schema.Struct({ version: Schema.String })
const BrewInfoV2 = Schema.Struct({
  formulae: Schema.Array(Schema.Struct({ versions: Schema.Struct({ stable: Schema.String }) })),
})
const ChocoPackage = Schema.Struct({
  d: Schema.Struct({ results: Schema.Array(Schema.Struct({ Version: Schema.String })) }),
})

export interface Interface {
  readonly info: () => Effect.Effect<Info>
  readonly method: () => Effect.Effect<Method>
  readonly latest: (method?: Method) => Effect.Effect<string>
  readonly upgrade: (method: Method, target: string) => Effect.Effect<void, UpgradeFailedError>
}

export class Service extends Context.Service<Service, Interface>()("@agnescode/Installation") {}

export const use = serviceUse(Service)

const layer: Layer.Layer<Service, never, HttpClient.HttpClient | AppProcess.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const httpOk = HttpClient.filterStatusOk(withTransientReadRetry(http))
    const appProcess = yield* AppProcess.Service

    const text = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const result = yield* appProcess.run(
          ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          }),
        )
        return result.stdout.toString("utf8")
      },
      Effect.catch(() => Effect.succeed("")),
    )

    const run = Effect.fnUntraced(
      function* (cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
        const result = yield* appProcess.run(
          ChildProcess.make(cmd[0], cmd.slice(1), {
            cwd: opts?.cwd,
            env: opts?.env,
            extendEnv: true,
          }),
        )
        return {
          code: result.exitCode,
          stdout: result.stdout.toString("utf8"),
          stderr: result.stderr.toString("utf8"),
        }
      },
      Effect.catch((err) => Effect.succeed({ code: 1, stdout: "", stderr: errorMessage(err) })),
    )

    const getBrewFormula = Effect.fnUntraced(function* () {
      const tapFormula = yield* text(["brew", "list", "--formula", "anomalyco/tap/agnescode"])
      if (tapFormula.includes("agnescode")) return "anomalyco/tap/agnescode"
      const coreFormula = yield* text(["brew", "list", "--formula", "agnescode"])
      if (coreFormula.includes("agnescode")) return "agnescode"
      return "agnescode"
    })

    const npmLatest = Effect.fnUntraced(function* () {
      const response = yield* httpOk.execute(
        HttpClientRequest.get(`${yield* NpmConfig.registry(process.cwd())}/agnescode/${NPM_TAG}`).pipe(
          HttpClientRequest.acceptJson,
        ),
      )
      const data = yield* HttpClientResponse.schemaBodyJson(NpmPackage)(response)
      return data.version
    })

    // Chocolatey can only install versions its moderated community feed has published.
    const chocoHas = Effect.fnUntraced(function* (version: string) {
      const response = yield* httpOk.execute(
        HttpClientRequest.get(
          `https://community.chocolatey.org/api/v2/Packages?$filter=Id%20eq%20%27agnescode%27%20and%20Version%20eq%20%27${encodeURIComponent(version)}%27&$select=Version`,
        ).pipe(HttpClientRequest.setHeaders({ Accept: "application/json;odata=verbose" })),
      )
      const data = yield* HttpClientResponse.schemaBodyJson(ChocoPackage)(response)
      return data.d.results.length > 0
    })

    const tapVersion = Effect.fnUntraced(
      function* (formula: string) {
        const infoJson = yield* text(["brew", "info", "--json=v2", formula])
        const info = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(BrewInfoV2))(infoJson)
        return info.formulae[0].versions.stable
      },
      Effect.orElseSucceed(() => undefined),
    )

    const upgradeFailure = (method: Method, result?: { code: number; stdout: string; stderr: string }) => {
      if (method === "choco") return "not running from an elevated command shell"
      if (result) return `Upgrade failed for ${method} (exit code ${result.code}).`
      return `Upgrade failed for ${method}.`
    }

    const upgradeScriptShell = Effect.fnUntraced(function* () {
      const bashVersion = yield* text(["bash", "--version"])
      if (bashVersion) return "bash"
      return "sh"
    })

    const upgradeCurl = Effect.fnUntraced(
      function* (target: string) {
        const response = yield* httpOk.execute(HttpClientRequest.get("https://agnescode.ai/install"))
        const body = yield* response.text
        const bodyBytes = new TextEncoder().encode(body)
        const shell = yield* upgradeScriptShell()
        const result = yield* appProcess.run(
          ChildProcess.make(shell, [], {
            stdin: Stream.make(bodyBytes),
            env: { VERSION: target },
            extendEnv: true,
          }),
        )
        return {
          code: result.exitCode,
          stdout: result.stdout.toString("utf8"),
          stderr: result.stderr.toString("utf8"),
        }
      },
      Effect.mapError(() => new UpgradeFailedError({ stderr: upgradeFailure("curl") })),
    )

    const result: Interface = {
      info: Effect.fn("Installation.info")(function* () {
        return {
          version: InstallationVersion,
          latest: yield* result.latest(),
        }
      }),
      method: Effect.fn("Installation.method")(function* () {
        if (process.execPath.includes(path.join(".agnescode", "bin"))) return "curl" as Method
        if (process.execPath.includes(path.join(".local", "bin"))) return "curl" as Method
        const exec = process.execPath.toLowerCase()

        const checks: Array<{ name: Method; command: () => Effect.Effect<string> }> = [
          { name: "npm", command: () => text(["npm", "list", "-g", "--depth=0"]) },
          { name: "yarn", command: () => text(["yarn", "global", "list"]) },
          { name: "pnpm", command: () => text(["pnpm", "list", "-g", "--depth=0"]) },
          { name: "bun", command: () => text(["bun", "pm", "ls", "-g"]) },
          { name: "brew", command: () => text(["brew", "list", "--formula", "agnescode"]) },
          { name: "scoop", command: () => text(["scoop", "list", "agnescode"]) },
          { name: "choco", command: () => text(["choco", "list", "--limit-output", "agnescode"]) },
        ]

        checks.sort((a, b) => {
          const aMatches = exec.includes(a.name)
          const bMatches = exec.includes(b.name)
          if (aMatches && !bMatches) return -1
          if (!aMatches && bMatches) return 1
          return 0
        })

        for (const check of checks) {
          const output = yield* check.command()
          if (output.includes("agnescode")) {
            return check.name
          }
        }

        return "unknown" as Method
      }),
      // Reports the installed version when there's no update this install method can deliver.
      latest: Effect.fn("Installation.latest")(function* (installMethod?: Method) {
        const method = installMethod || (yield* result.method())
        // Homebrew Core's agnescode formula can't deliver a tap release, so it can't be a normal update.
        if (method === "brew" && !(yield* getBrewFormula()).includes("/")) return InstallationVersion
        return yield* Effect.gen(function* () {
          const found = yield* npmLatest()
          if (!isUpdate(InstallationVersion, found)) return InstallationVersion
          if (method === "choco" && !(yield* chocoHas(found))) return InstallationVersion
          return found
        }).pipe(Effect.timeout("10 seconds"))
      }, Effect.orDie),
      upgrade: Effect.fn("Installation.upgrade")(function* (m: Method, target: string) {
        let upgradeResult: { code: number; stdout: string; stderr: string } | undefined
        switch (m) {
          case "curl":
            upgradeResult = yield* upgradeCurl(target)
            break
          case "npm":
            upgradeResult = yield* run(["npm", "install", "-g", `agnescode@${target}`])
            break
          case "pnpm":
            upgradeResult = yield* run(["pnpm", "install", "-g", `agnescode@${target}`])
            break
          case "bun":
            upgradeResult = yield* run(["bun", "install", "-g", `agnescode@${target}`])
            break
          case "yarn":
            upgradeResult = yield* run(["yarn", "global", "add", `agnescode@${target}`])
            break
          case "brew": {
            const formula = yield* getBrewFormula()
            const env = { HOMEBREW_NO_AUTO_UPDATE: "1" }
            if (!formula.includes("/"))
              return yield* new UpgradeFailedError({
                stderr: `Homebrew Core can't install agnescode ${target}. Reinstall from anomalyco/tap/agnescode to keep receiving updates.`,
              })
            const tap = yield* run(["brew", "tap", "anomalyco/tap"], { env })
            if (tap.code !== 0) {
              upgradeResult = tap
              break
            }
            const repo = yield* text(["brew", "--repo", "anomalyco/tap"])
            const dir = repo.trim()
            if (dir) {
              const pull = yield* run(["git", "pull", "--ff-only"], { cwd: dir, env })
              if (pull.code !== 0) {
                upgradeResult = pull
                break
              }
            }
            // The tap is updated shortly after npm, so a just-published release may not be installable yet.
            const available = yield* tapVersion(formula)
            if (!available || semver.major(available) !== semver.major(target) || semver.lt(available, target))
              return yield* new UpgradeFailedError({
                stderr: `Homebrew can't install agnescode ${target} yet: ${formula} is at ${available ?? "an unknown version"}. Try again in a few minutes.`,
              })
            upgradeResult = yield* run(["brew", "upgrade", formula], { env })
            break
          }
          case "choco":
            upgradeResult = yield* run(["choco", "upgrade", "agnescode", `--version=${target}`, "-y"])
            break
          case "scoop":
            upgradeResult = yield* run(["scoop", "install", `agnescode@${target}`])
            break
          default:
            return yield* new UpgradeFailedError({ stderr: `Unknown installation method: ${m}` })
        }
        if (!upgradeResult || upgradeResult.code !== 0) {
          return yield* new UpgradeFailedError({ stderr: upgradeFailure(m, upgradeResult) })
        }
        yield* Effect.logInfo("upgraded", {
          method: m,
          target,
          stdout: upgradeResult.stdout,
          stderr: upgradeResult.stderr,
        })
        yield* text([process.execPath, "--version"])
      }),
    }

    return Service.of(result)
  }),
)

export const node = LayerNode.make({ service: Service, layer: layer, deps: [httpClient, AppProcess.node] })

const { runPromise } = makeRuntime(Service, AppNodeBuilder.build(node))

export const latest = (...args: Parameters<Interface["latest"]>) => runPromise((s) => s.latest(...args))
export const method = () => runPromise((s) => s.method())
export const upgrade = (...args: Parameters<Interface["upgrade"]>) => runPromise((s) => s.upgrade(...args))

export * as Installation from "."
