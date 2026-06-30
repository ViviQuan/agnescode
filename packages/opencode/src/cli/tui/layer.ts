import { run as runTui, type TuiInput } from "@agnes-ai/tui"
import { Global } from "@agnes-ai/core/global"
import { Effect } from "effect"

export function run(input: TuiInput) {
  return runTui(input).pipe(Effect.provide(Global.defaultLayer))
}
