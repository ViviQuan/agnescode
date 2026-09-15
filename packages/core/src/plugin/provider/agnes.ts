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
        // Cost is per 1M tokens. Flash models are currently billed at $0 by Agnes;
        // Pro models use their listed prices.
        const models: Array<{
          id: string
          name: string
          context: number
          output: number
          status: "active" | "beta"
          cost: { input: number; output: number; cacheRead: number }
        }> = [
          {
            id: "agnes-3.0-flash",
            name: "Agnes 3.0 Flash",
            context: 524288,
            output: 65536,
            status: "active",
            cost: { input: 0, output: 0, cacheRead: 0 },
          },
          {
            id: "agnes-2.5-pro",
            name: "Agnes 2.5 Pro",
            context: 1048576,
            output: 65536,
            status: "active",
            cost: { input: 0.45, output: 0.9, cacheRead: 0.045 },
          },
          {
            id: "agnes-2.5-pro-beta",
            name: "Agnes 2.5 Pro Beta",
            context: 1048576,
            output: 65536,
            status: "beta",
            cost: { input: 0.1, output: 0.3, cacheRead: 0.01 },
          },
          {
            id: "agnes-2.5-flash",
            name: "Agnes 2.5 Flash",
            context: 524288,
            output: 65536,
            status: "active",
            cost: { input: 0, output: 0, cacheRead: 0 },
          },
        ]
        for (const m of models) {
          evt.model.update("agnes", m.id, (model) => {
            model.name = m.name
            model.api = { id: m.id, type: "aisdk", package: "@ai-sdk/openai-compatible" }
            model.capabilities = { tools: true, input: ["text", "image"], output: ["text"] }
            model.limit = { context: m.context, output: m.output }
            model.status = m.status
            model.enabled = true
            model.time = { released: Date.now() }
            model.cost = [{ input: m.cost.input, output: m.cost.output, cache: { read: m.cost.cacheRead, write: 0 } }]
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
