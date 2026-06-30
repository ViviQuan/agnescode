import { Schema } from "effect"

export { CatalogModelStatus } from "@agnes-ai/core/models-dev"

export const ModelStatus = Schema.Literals(["alpha", "beta", "deprecated", "active"])
export type ModelStatus = typeof ModelStatus.Type

export * as ProviderModelStatus from "./model-status"
