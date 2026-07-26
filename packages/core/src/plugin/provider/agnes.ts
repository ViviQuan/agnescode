import { Effect } from "effect"
import { ProviderV2 } from "../../provider"
import { ModelV2 } from "../../model"
import { define } from "../internal"

export const AgnesPlugin = define({
  id: "agnes",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.aisdk.sdk(
      Effect.fn(function* (evt) {
        if (evt.sdk) return
        if (!evt.package.includes("@ai-sdk/openai-compatible")) return
        if (evt.options.includeUsage !== false) evt.options.includeUsage = true
        const mod = yield* Effect.promise(() => import("@ai-sdk/openai-compatible"))
        evt.sdk = mod.createOpenAICompatible(evt.options as any)
      }),
    )

    yield* ctx.catalog.transform(
      Effect.fn(function* (evt) {
        evt.provider.update("agnes", (provider) => {
          provider.name = "Agnes AI"
          provider.api = {
            type: "aisdk",
            package: "@ai-sdk/openai-compatible",
            url: "https://apihub.agnes-ai.com/v1",
          }
        })
        const models: Array<{ id: string; name: string; context: number; output: number }> = [
          { id: "agnes-2.5-flash", name: "Agnes 2.5 Flash", context: 524288, output: 65536 },
          { id: "agnes-2.0-flash", name: "Agnes 2.0 Flash", context: 524288, output: 65536 },
        ]
        for (const m of models) {
          evt.model.update("agnes", m.id, (model) => {
            model.name = m.name
            model.api = { id: m.id, type: "aisdk", package: "@ai-sdk/openai-compatible" }
            model.capabilities = { tools: true, input: ["text", "image"], output: ["text"] }
            model.limit = { context: m.context, output: m.output }
            model.status = "active"
            model.enabled = true
            model.time = { released: Date.now() }
            model.cost = [{ input: 0, output: 0, cache: { read: 0, write: 0 } }]
          })
        }
      }),
    )
    yield* ctx.aisdk.language(
      Effect.fn(function* (evt) {
        if (evt.model.providerID !== ProviderV2.ID.agnes) return
        evt.language = evt.sdk.chat(evt.model.api.id)
      }),
    )
  }),
})
