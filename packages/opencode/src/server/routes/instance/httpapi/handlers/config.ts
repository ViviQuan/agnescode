import { Config } from "@/config/config"
import { Provider } from "@/provider/provider"
import * as InstanceState from "@/effect/instance-state"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { markInstanceForDisposal } from "../lifecycle"

export const configHandlers = HttpApiBuilder.group(InstanceHttpApi, "config", (handlers) =>
  Effect.gen(function* () {
    const providerSvc = yield* Provider.Service
    const configSvc = yield* Config.Service

    const get = Effect.fn("ConfigHttpApi.get")(function* () {
      return yield* configSvc.get()
    })

    const update = Effect.fn("ConfigHttpApi.update")(function* (ctx) {
      yield* configSvc.update(ctx.payload)
      yield* markInstanceForDisposal(yield* InstanceState.context)
      return ctx.payload
    })

    const providers = Effect.fn("ConfigHttpApi.providers")(function* () {
      const all = yield* providerSvc.list()
      const allProviders = Object.values(all)
      allProviders.sort((a, b) => (a.id === "agnes" ? -1 : b.id === "agnes" ? 1 : 0))
      const defaults = Provider.defaultModelIDs(all)
      defaults["agnes"] = "agnes-2.0-flash"
      return {
        providers: allProviders.map(Provider.toPublicInfo),
        default: defaults,
      }
    })

    return handlers.handle("get", get).handle("update", update).handle("providers", providers)
  }),
)
