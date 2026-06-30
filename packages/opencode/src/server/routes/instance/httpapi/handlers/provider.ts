import { ProviderAuth } from "@/provider/auth"
import { Config } from "@/config/config"
import { ModelsDev } from "@agnes-ai/core/models-dev"
import { Provider } from "@/provider/provider"

import { mapValues } from "remeda"
import { Effect, Schema } from "effect"
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { ProviderAuthApiError } from "../groups/provider"
import { ProviderV2 } from "@agnes-ai/core/provider"
import { ModelV2 } from "@agnes-ai/core/model"

function mapProviderAuthError<A, R>(self: Effect.Effect<A, ProviderAuth.Error, R>) {
  return self.pipe(
    Effect.mapError((error) => {
      if (error instanceof ProviderAuth.OauthMissing) {
        return new ProviderAuthApiError({ name: error._tag, data: { providerID: error.providerID } })
      }
      if (error instanceof ProviderAuth.OauthCodeMissing) {
        return new ProviderAuthApiError({ name: error._tag, data: { providerID: error.providerID } })
      }
      if (error instanceof ProviderAuth.OauthCallbackFailed) {
        return new ProviderAuthApiError({ name: error._tag, data: {} })
      }
      if (error instanceof ProviderAuth.ValidationFailed) {
        return new ProviderAuthApiError({ name: error._tag, data: { field: error.field, message: error.message } })
      }
      return new ProviderAuthApiError({ name: "BadRequest", data: {} })
    }),
  )
}

export const providerHandlers = HttpApiBuilder.group(InstanceHttpApi, "provider", (handlers) =>
  Effect.gen(function* () {
    const cfg = yield* Config.Service
    const provider = yield* Provider.Service
    const svc = yield* ProviderAuth.Service

    const list = Effect.fn("ProviderHttpApi.list")(function* () {
      const config = yield* cfg.get()
      const all = yield* ModelsDev.Service.use((s) => s.get())
      const disabled = new Set(config.disabled_providers ?? [])
      const enabled = config.enabled_providers ? new Set(config.enabled_providers) : undefined
      const filtered: Record<string, (typeof all)[string]> = {}
      for (const [key, value] of Object.entries(all)) {
        if ((enabled ? enabled.has(key) : true) && !disabled.has(key)) filtered[key] = value
      }
      const connected = yield* provider.list()
      const providers = Object.assign(
        mapValues(filtered, (item) => Provider.fromModelsDevProvider(item)),
        connected,
      )
      if (!providers.agnes && !config.disabled_providers?.includes("agnes") && !(config.enabled_providers && !config.enabled_providers.includes("agnes"))) {
        providers.agnes = {
          id: ProviderV2.ID.make("agnes"),
          name: "Agnes AI",
          source: "custom",
          env: [],
          options: {},
          models: {
            "agnes-2.0-flash": {
              id: ModelV2.ID.make("agnes-2.0-flash"),
              providerID: ProviderV2.ID.make("agnes"),
              name: "Agnes 2.0 Flash",
              api: { id: "agnes-2.0-flash", url: "https://apihub.agnes-ai.com/v1", npm: "@ai-sdk/openai-compatible" },
              capabilities: {
                temperature: true,
                reasoning: true,
                attachment: true,
                toolcall: true,
                input: { text: true, audio: false, image: true, video: false, pdf: false },
                output: { text: true, audio: false, image: false, video: false, pdf: false },
                interleaved: { field: "reasoning_content" },
              },
              cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
              limit: { context: 524288, output: 65536 },
              status: "active",
              variants: {},
              headers: {},
              options: {},
              family: "",
              release_date: "2026-01-01",
            },
            "agnes-1.5-flash": {
              id: ModelV2.ID.make("agnes-1.5-flash"),
              providerID: ProviderV2.ID.make("agnes"),
              name: "Agnes 1.5 Flash",
              api: { id: "agnes-1.5-flash", url: "https://apihub.agnes-ai.com/v1", npm: "@ai-sdk/openai-compatible" },
              capabilities: {
                temperature: true,
                reasoning: false,
                attachment: true,
                toolcall: false,
                input: { text: true, audio: false, image: true, video: false, pdf: false },
                output: { text: true, audio: false, image: false, video: false, pdf: false },
                interleaved: false,
              },
              cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
              limit: { context: 262144, output: 65536 },
              status: "active",
              variants: {},
              headers: {},
              options: {},
              family: "",
              release_date: "2026-01-01",
            },
          },
        }
      }
      const allProviders = Object.values(providers)
      allProviders.sort((a, b) => (a.id === "agnes" ? -1 : b.id === "agnes" ? 1 : 0))
      return {
        all: allProviders.map(Provider.toPublicInfo),
        default: Provider.defaultModelIDs(providers),
        connected: Object.keys(connected),
      }
    })

    const auth = Effect.fn("ProviderHttpApi.auth")(function* () {
      return yield* svc.methods()
    })

    const authorize = Effect.fn("ProviderHttpApi.authorize")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      payload: ProviderAuth.AuthorizeInput
    }) {
      return yield* mapProviderAuthError(
        svc.authorize({
          providerID: ctx.params.providerID,
          method: ctx.payload.method,
          inputs: ctx.payload.inputs,
        }),
      )
    })

    const authorizeRaw = Effect.fn("ProviderHttpApi.authorizeRaw")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      request: HttpServerRequest.HttpServerRequest
    }) {
      const body = yield* Effect.orDie(ctx.request.text)
      const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(ProviderAuth.AuthorizeInput))(body).pipe(
        Effect.mapError(() => new ProviderAuthApiError({ name: "BadRequest", data: {} })),
      )
      // Match legacy route behavior: when authorize() resolves without a
      // result (e.g. no further redirect), serialize as JSON `null` instead
      // of an empty body so clients can `.json()` parse the response.
      const result = yield* authorize({ params: ctx.params, payload })
      return HttpServerResponse.jsonUnsafe(result ?? null)
    })

    const callback = Effect.fn("ProviderHttpApi.callback")(function* (ctx: {
      params: { providerID: ProviderV2.ID }
      payload: ProviderAuth.CallbackInput
    }) {
      yield* mapProviderAuthError(
        svc.callback({
          providerID: ctx.params.providerID,
          method: ctx.payload.method,
          code: ctx.payload.code,
        }),
      )
      return true
    })

    return handlers
      .handle("list", list)
      .handle("auth", auth)
      .handleRaw("authorize", authorizeRaw)
      .handle("callback", callback)
  }),
)
