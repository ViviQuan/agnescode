export * as File from "./file"

import { Revert } from "@agnes-ai/schema/revert"

export const Diff = Revert.FileDiff
export type Diff = typeof Diff.Type
