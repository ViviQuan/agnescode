import { TextAttributes } from "@opentui/core"
import { createEffect, createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js"
import { useTheme } from "../context/theme"
import type { UpdateState, UpdateTarget } from "../context/update-notification"
import { useDialog } from "../ui/dialog"
import { useBindings } from "../keymap"
import { errorMessage } from "../util/error"
import { Spinner } from "./spinner"

type Version = { current: string; latest?: string }

// A newer release uses the normal update flow. Nothing is offered when the installation is current.
export function updateTarget(version: Version): UpdateTarget | undefined {
  if (version.latest && version.latest !== version.current) return { type: "latest", version: version.latest }
  return undefined
}

type LocalState =
  | { type: "checking" }
  | { type: "available"; version: string }
  | { type: "up-to-date" }
  | { type: "installing"; target: UpdateTarget }
  | { type: "installed"; target: UpdateTarget }
  | { type: "failed"; target: UpdateTarget; message: string }
  | { type: "check-failed"; message: string }

export function DialogUpdate(props: {
  check: () => Promise<Version | undefined>
  state: () => UpdateState | undefined
  install: (target: UpdateTarget) => Promise<void>
  skip: (version: string) => void
  restart: () => void
}) {
  const dialog = useDialog()
  const { theme } = useTheme()
  const [error, setError] = createSignal<string>()
  const [active, setActive] = createSignal(0)
  const [check] = createResource(() =>
    props.check().catch((error: unknown) => {
      setError(errorMessage(error))
      return undefined
    }),
  )

  const target = () => {
    const version = check()
    if (!version) return undefined
    return updateTarget(version)
  }
  const state = createMemo<LocalState>(() => {
    const current = props.state()
    if (current?.type === "installing" || current?.type === "installed") return current
    if (check.loading) return { type: "checking" }
    if (current?.type === "failed") return current
    if (error()) return { type: "check-failed", message: error()! }
    const next = target()
    if (!next) return { type: "up-to-date" }
    return { type: "available", version: next.version }
  })
  const buttons = createMemo(() => {
    const current = state()
    if (current.type === "checking" || current.type === "installing") return []
    const next = target()
    const close = {
      label: "Skip",
      run: () => {
        if (current.type !== "installed" && next) props.skip(next.version)
        dialog.clear()
      },
    }
    if (current.type === "installed") return [{ label: "Restart", run: props.restart }]
    if (!next) return [{ label: "Close", run: () => dialog.clear() }]
    return [close, { label: "Update", run: () => props.install(next) }]
  })

  createEffect(() => setActive(Math.max(0, buttons().length - 1)))

  const move = (offset: number) => {
    const count = buttons().length
    if (count) setActive((value) => (value + offset + count) % count)
  }

  useBindings(() => ({
    bindings: [
      { key: "return", desc: "Confirm update action", group: "Dialog", cmd: () => void buttons()[active()]?.run() },
      { key: "left", desc: "Previous update action", group: "Dialog", cmd: () => move(-1) },
      { key: "shift+tab", desc: "Previous update action", group: "Dialog", cmd: () => move(-1) },
      { key: "right", desc: "Next update action", group: "Dialog", cmd: () => move(1) },
      { key: "tab", desc: "Next update action", group: "Dialog", cmd: () => move(1) },
    ],
  }))

  return (
    <box paddingLeft={2} paddingRight={2} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {state().type === "installing"
            ? "Updating AgnesCode"
            : state().type === "available" || state().type === "failed"
              ? "Update available"
              : "Update"}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box paddingBottom={1} gap={1}>
        <Show when={state()} keyed>
          {(current) => (
            <Switch>
              <Match when={current.type === "checking"}>
                <Spinner color={theme.text}>Checking for updates…</Spinner>
              </Match>
              <Match when={current.type === "available"}>
                <text fg={theme.textMuted} wrapMode="word">
                  An update is available. After installing, you'll be prompted to restart AgnesCode.
                </text>
              </Match>
              <Match when={current.type === "up-to-date"}>
                <text fg={theme.textMuted} wrapMode="word">
                  AgnesCode is up to date.
                </text>
              </Match>
              <Match when={current.type === "installing" && current} keyed>
                {(installing) => <Spinner color={theme.text}>Installing AgnesCode {installing.target.version}…</Spinner>}
              </Match>
              <Match when={current.type === "installed"}>
                <text fg={theme.textMuted} wrapMode="word">
                  Update successful! A restart is required.
                </text>
              </Match>
              <Match when={(current.type === "failed" || current.type === "check-failed") && current} keyed>
                {(failed) => (
                  <text fg={theme.error} wrapMode="word">
                    {failed.message}
                  </text>
                )}
              </Match>
            </Switch>
          )}
        </Show>
      </box>
      <Show when={buttons().length > 0}>
        <box flexDirection="row" justifyContent="flex-end" paddingBottom={1}>
          <For each={buttons()}>
            {(button, index) => (
              <box
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={active() === index() ? theme.primary : undefined}
                onMouseUp={() => void button.run()}
              >
                <text fg={active() === index() ? theme.selectedListItemText : theme.textMuted}>{button.label}</text>
              </box>
            )}
          </For>
        </box>
      </Show>
    </box>
  )
}
