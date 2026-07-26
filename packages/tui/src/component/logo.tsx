import { RGBA } from "@opentui/core"
import { For, type JSX } from "solid-js"
import { useTheme } from "../context/theme"
import { logo } from "../logo"

export function Logo() {
  const { theme } = useTheme()

  const renderLine = (line: string, fg: RGBA): JSX.Element[] => {
    return Array.from(line).map((char) => (
      <text fg={fg} selectable={false}>
        {char}
      </text>
    ))
  }

  return (
    <box>
      <For each={logo}>{(line) => <box flexDirection="row">{renderLine(line, theme.text)}</box>}</For>
    </box>
  )
}
