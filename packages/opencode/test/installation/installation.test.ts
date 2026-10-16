import { describe, expect, test } from "bun:test"
import { makeGlobalNode } from "@agnes-ai/core/effect/app-node"
import { LayerNode } from "@agnes-ai/core/effect/layer-node"
import { httpClient } from "@agnes-ai/core/effect/app-node-platform"
import { Effect, Exit, Fiber, Layer, Stream } from "effect"
import * as TestClock from "effect/testing/TestClock"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationVersion } from "@agnes-ai/core/installation/version"
import { AppProcess } from "@agnes-ai/core/process"
import { testEffect } from "../lib/effect"

const encoder = new TextEncoder()

// A handler that returns undefined never responds.
function mockHttpClient(handler: (request: HttpClientRequest.HttpClientRequest) => Response | undefined) {
  const client = HttpClient.make((request) => {
    const response = handler(request)
    return response ? Effect.succeed(HttpClientResponse.fromWeb(request, response)) : Effect.never
  })
  return Layer.succeed(HttpClient.HttpClient, client)
}

function mockSpawner(
  handler: (cmd: string, args: readonly string[]) => string | { code: number; stdout?: string; stderr?: string } = () =>
    "",
) {
  const spawner = ChildProcessSpawner.make((command) => {
    const std = ChildProcess.isStandardCommand(command) ? command : undefined
    const result = handler(std?.command ?? "", std?.args ?? [])
    const output = typeof result === "string" ? { code: 0, stdout: result, stderr: "" } : result
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(0),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(output.code)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: { [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") } as any,
        stdout: output.stdout ? Stream.make(encoder.encode(output.stdout)) : Stream.empty,
        stderr: output.stderr ? Stream.make(encoder.encode(output.stderr)) : Stream.empty,
        all: Stream.empty,
        getInputFd: () => ({ [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") }) as any,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void),
      }),
    )
  })
  return Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function testLayer(
  httpHandler: (request: HttpClientRequest.HttpClientRequest) => Response | undefined,
  spawnHandler?: (cmd: string, args: readonly string[]) => string | { code: number; stdout?: string; stderr?: string },
) {
  const spawnerNode = makeGlobalNode({
    service: ChildProcessSpawner.ChildProcessSpawner,
    layer: mockSpawner(spawnHandler),
    deps: [],
  })
  const appProcessNode = makeGlobalNode({ service: AppProcess.Service, layer: AppProcess.layer, deps: [spawnerNode] })
  return LayerNode.compile(Installation.node, [
    [httpClient, mockHttpClient(httpHandler)],
    [AppProcess.node, appProcessNode],
  ])
}

describe("installation", () => {
  describe("isUpdate", () => {
    test("only counts newer releases in the installed major version", () => {
      expect(Installation.isUpdate("0.2.6", "0.2.7")).toBe(true)
      expect(Installation.isUpdate("0.2.6", "0.3.0")).toBe(true)
      expect(Installation.isUpdate("0.2.6", "0.2.6")).toBe(false)
      expect(Installation.isUpdate("0.2.6", "0.2.5")).toBe(false)
      expect(Installation.isUpdate("0.2.6", "1.0.0")).toBe(false)
      expect(Installation.isUpdate("0.9.0", "0.10.0")).toBe(true)
    })

    test("source builds only accept releases on the current line", () => {
      expect(Installation.isUpdate("local", "0.2.7")).toBe(true)
      expect(Installation.isUpdate("local", "1.0.0")).toBe(false)
      expect(Installation.isUpdate("0.2.6", "not-a-version")).toBe(false)
    })
  })

  describe("latest", () => {
    const npm = "https://registry.npmjs.org/agnescode/latest"
    const choco = "https://community.chocolatey.org/api/v2/Packages"
    const tap = (cmd: string, args: readonly string[]) =>
      cmd === "brew" && args.join(" ") === "list --formula anomalyco/tap/agnescode" ? "agnescode" : ""
    const core = (cmd: string, args: readonly string[]) =>
      cmd === "brew" && args.join(" ") === "list --formula agnescode" ? "agnescode" : ""
    const registry = (version: string, calls: string[], feed: string[] = [version]) =>
      testLayer((request) => {
        calls.push(request.url)
        if (request.url.startsWith(choco))
          return jsonResponse({
            d: { results: feed.filter((v) => request.url.includes(`%27${v}%27`)).map((Version) => ({ Version })) },
          })
        return jsonResponse({ version })
      })

    const methods = ["curl", "yarn", "unknown", "npm", "bun", "pnpm", "scoop", "choco"] as const
    for (const method of methods) {
      const calls: string[] = []
      testEffect(registry("0.2.7", calls)).effect(`reads ${method} versions from the agnescode npm package`, () =>
        Effect.gen(function* () {
          calls.length = 0
          expect(yield* Installation.use.latest(method)).toBe("0.2.7")
          expect(calls[0]).toBe(npm)
          expect(calls.slice(1).every((url) => url.startsWith(choco))).toBe(true)
        }),
      )

      testEffect(registry("1.0.0", [])).effect(`ignores releases in another major version for ${method}`, () =>
        Effect.gen(function* () {
          expect(yield* Installation.use.latest(method)).toBe(InstallationVersion)
        }),
      )
    }

    const tapCalls: string[] = []
    testEffect(
      testLayer((request) => {
        tapCalls.push(request.url)
        return jsonResponse({ version: "0.2.7" })
      }, tap),
    ).effect("reads Homebrew tap versions from the agnescode npm package", () =>
      Effect.gen(function* () {
        tapCalls.length = 0
        expect(yield* Installation.use.latest("brew")).toBe("0.2.7")
        expect(tapCalls).toEqual([npm])
      }),
    )

    const coreCalls: string[] = []
    testEffect(
      testLayer((request) => {
        coreCalls.push(request.url)
        return jsonResponse({ version: "0.2.7" })
      }, core),
    ).effect("never offers an update Homebrew Core can't install", () =>
      Effect.gen(function* () {
        coreCalls.length = 0
        expect(yield* Installation.use.latest("brew")).toBe(InstallationVersion)
        expect(coreCalls).toEqual([])
      }),
    )

    testEffect(registry("0.2.7", [], ["0.2.6"])).effect("waits until Chocolatey has published the npm version", () =>
      Effect.gen(function* () {
        expect(yield* Installation.use.latest("choco")).toBe(InstallationVersion)
      }),
    )

    const errorCalls: string[] = []
    testEffect(
      testLayer((request) => {
        errorCalls.push(request.url)
        return new Response("unavailable", { status: 503 })
      }),
    ).live("fails when the npm registry fails", () =>
      Effect.gen(function* () {
        errorCalls.length = 0
        expect(Exit.isFailure(yield* Installation.use.latest("curl").pipe(Effect.exit))).toBe(true)
        expect(errorCalls.length).toBeGreaterThan(0)
        expect(errorCalls.every((url) => url === npm)).toBe(true)
      }),
    )

    testEffect(testLayer(() => jsonResponse({ name: "agnescode" }))).effect(
      "fails when the npm registry returns no version",
      () =>
        Effect.gen(function* () {
          expect(Exit.isFailure(yield* Installation.use.latest("npm").pipe(Effect.exit))).toBe(true)
        }),
    )

    testEffect(testLayer(() => undefined)).effect("gives up when the npm registry doesn't answer in time", () =>
      Effect.gen(function* () {
        const fiber = yield* Installation.use.latest("curl").pipe(Effect.exit, Effect.forkChild)
        yield* TestClock.adjust("10 seconds")
        expect(Exit.isFailure(yield* Fiber.join(fiber))).toBe(true)
      }),
    )
  })

  describe("upgrade", () => {
    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd) => {
          if (cmd === "npm") return { code: 1, stderr: "token=secret command output" }
          return ""
        },
      ),
    ).effect("returns sanitized typed errors for failed package upgrades", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Installation.use.upgrade("npm", "0.99.9"))
        expect(error).toBeInstanceOf(Installation.UpgradeFailedError)
        expect(error.stderr).toBe("Upgrade failed for npm (exit code 1).")
        expect(error.message).toBe(error.stderr)
        expect(error.stderr).not.toContain("secret")
        expect(error.stderr).not.toContain("command output")
      }),
    )

    testEffect(
      testLayer(
        () => new Response("install script with token=secret", { status: 200 }),
        (cmd, args) => {
          if (cmd === "bash" && args[0] === "--version") return "GNU bash"
          if (cmd === "bash" || cmd === "sh") return { code: 1, stderr: "script output with token=secret" }
          return ""
        },
      ),
    ).effect("returns sanitized typed errors when the curl install script fails", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(Installation.use.upgrade("curl", "0.99.9"))
        expect(error).toBeInstanceOf(Installation.UpgradeFailedError)
        expect(error.stderr).toBe("Upgrade failed for curl (exit code 1).")
        expect(error.message).toBe(error.stderr)
        expect(error.stderr).not.toContain("secret")
        expect(error.stderr).not.toContain("script output")
      }),
    )

    testEffect(
      testLayer(
        () => new Response("install script", { status: 200 }),
        (cmd, args) => {
          if (cmd === "bash" && args[0] === "--version") return { code: 1, stderr: "missing" }
          if (cmd === "bash") return { code: 1, stderr: "should not execute installer with bash" }
          if (cmd === "sh") return "ok"
          return ""
        },
      ),
    ).effect("falls back to sh when bash is unavailable during curl upgrade", () =>
      Effect.gen(function* () {
        yield* Installation.use.upgrade("curl", "0.99.9")
      }),
    )
  })

  describe("upgrade per method", () => {
    const packageCalls: string[] = []
    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          packageCalls.push([cmd, ...args].join(" "))
          return ""
        },
      ),
    ).effect("installs the agnescode package with each package manager", () =>
      Effect.gen(function* () {
        for (const method of ["npm", "pnpm", "bun", "yarn"] as const) {
          packageCalls.length = 0
          yield* Installation.use.upgrade(method, "0.2.7")
          expect(packageCalls[0]).toContain("agnescode@0.2.7")
        }
      }),
    )

    const coreCalls: string[] = []
    testEffect(
      testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          coreCalls.push([cmd, ...args].join(" "))
          if (args.join(" ") === "list --formula agnescode") return "agnescode"
          return ""
        },
      ),
    ).effect("never runs brew upgrade for Homebrew Core", () =>
      Effect.gen(function* () {
        coreCalls.length = 0
        const error = yield* Effect.flip(Installation.use.upgrade("brew", "0.2.7"))
        expect(error.stderr).toContain("Homebrew Core")
        expect(coreCalls.some((call) => call.startsWith("brew upgrade"))).toBe(false)
      }),
    )

    const tap = (stable: string, calls: string[]) =>
      testLayer(
        () => jsonResponse({}),
        (cmd, args) => {
          calls.push([cmd, ...args].join(" "))
          if (args.join(" ") === "list --formula anomalyco/tap/agnescode") return "agnescode"
          if (args.join(" ") === "--repo anomalyco/tap") return "/tmp/agnescode-test-tap"
          if (args.includes("--json=v2")) return JSON.stringify({ formulae: [{ versions: { stable } }] })
          return ""
        },
      )

    const tapCalls: string[] = []
    testEffect(tap("0.2.7", tapCalls)).effect("upgrades the Homebrew tap once it has the version", () =>
      Effect.gen(function* () {
        tapCalls.length = 0
        yield* Installation.use.upgrade("brew", "0.2.7")
        expect(tapCalls).toContain("git pull --ff-only")
        expect(tapCalls).toContain("brew upgrade anomalyco/tap/agnescode")
      }),
    )

    for (const stable of ["0.2.6", "1.0.0"]) {
      const calls: string[] = []
      testEffect(tap(stable, calls)).effect(`asks to retry when the Homebrew tap is at ${stable}`, () =>
        Effect.gen(function* () {
          calls.length = 0
          const error = yield* Effect.flip(Installation.use.upgrade("brew", "0.2.7"))
          expect(error.stderr).toContain("Try again in a few minutes")
          expect(calls.some((call) => call.startsWith("brew upgrade"))).toBe(false)
        }),
      )
    }
  })
})
