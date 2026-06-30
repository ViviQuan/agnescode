import { Config } from "effect"

export function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

const copy = process.env["AGNESCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
const fff = process.env["AGNESCODE_DISABLE_FFF"]

function enabledByExperimental(key: string) {
  return process.env[key] === undefined ? truthy("AGNESCODE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  AGNESCODE_AUTO_HEAP_SNAPSHOT: truthy("AGNESCODE_AUTO_HEAP_SNAPSHOT"),
  AGNESCODE_GIT_BASH_PATH: process.env["AGNESCODE_GIT_BASH_PATH"],
  AGNESCODE_CONFIG: process.env["AGNESCODE_CONFIG"],
  AGNESCODE_CONFIG_CONTENT: process.env["AGNESCODE_CONFIG_CONTENT"],
  AGNESCODE_DISABLE_AUTOUPDATE: truthy("AGNESCODE_DISABLE_AUTOUPDATE"),
  AGNESCODE_ALWAYS_NOTIFY_UPDATE: truthy("AGNESCODE_ALWAYS_NOTIFY_UPDATE"),
  AGNESCODE_DISABLE_PRUNE: truthy("AGNESCODE_DISABLE_PRUNE"),
  AGNESCODE_DISABLE_TERMINAL_TITLE: truthy("AGNESCODE_DISABLE_TERMINAL_TITLE"),
  AGNESCODE_SHOW_TTFD: truthy("AGNESCODE_SHOW_TTFD"),
  AGNESCODE_DISABLE_AUTOCOMPACT: truthy("AGNESCODE_DISABLE_AUTOCOMPACT"),
  AGNESCODE_DISABLE_MODELS_FETCH: truthy("AGNESCODE_DISABLE_MODELS_FETCH"),
  AGNESCODE_DISABLE_MOUSE: truthy("AGNESCODE_DISABLE_MOUSE"),
  AGNESCODE_FAKE_VCS: process.env["AGNESCODE_FAKE_VCS"],
  AGNESCODE_SERVER_PASSWORD: process.env["AGNESCODE_SERVER_PASSWORD"],
  AGNESCODE_SERVER_USERNAME: process.env["AGNESCODE_SERVER_USERNAME"],
  AGNESCODE_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("AGNESCODE_DISABLE_FFF"),

  // Experimental
  AGNESCODE_EXPERIMENTAL_FILEWATCHER: Config.boolean("AGNESCODE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  AGNESCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: Config.boolean("AGNESCODE_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.withDefault(false),
  ),
  AGNESCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("AGNESCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  AGNESCODE_MODELS_URL: process.env["AGNESCODE_MODELS_URL"],
  AGNESCODE_MODELS_PATH: process.env["AGNESCODE_MODELS_PATH"],
  AGNESCODE_DB: process.env["AGNESCODE_DB"],

  AGNESCODE_WORKSPACE_ID: process.env["AGNESCODE_WORKSPACE_ID"],
  AGNESCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("AGNESCODE_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get AGNESCODE_DISABLE_PROJECT_CONFIG() {
    return truthy("AGNESCODE_DISABLE_PROJECT_CONFIG")
  },
  get AGNESCODE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("AGNESCODE_EXPERIMENTAL_REFERENCES")
  },
  get AGNESCODE_TUI_CONFIG() {
    return process.env["AGNESCODE_TUI_CONFIG"]
  },
  get AGNESCODE_CONFIG_DIR() {
    return process.env["AGNESCODE_CONFIG_DIR"]
  },
  get AGNESCODE_PURE() {
    return truthy("AGNESCODE_PURE")
  },
  get AGNESCODE_PERMISSION() {
    return process.env["AGNESCODE_PERMISSION"]
  },
  get AGNESCODE_PLUGIN_META_FILE() {
    return process.env["AGNESCODE_PLUGIN_META_FILE"]
  },
  get AGNESCODE_CLIENT() {
    return process.env["AGNESCODE_CLIENT"] ?? "cli"
  },
}
