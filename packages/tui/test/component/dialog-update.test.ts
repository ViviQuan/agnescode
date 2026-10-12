import { describe, expect, test } from "bun:test"
import { updateTarget } from "../../src/component/dialog-update"
import { isVersionGreater, visibleNotice } from "../../src/context/update-notification"

describe("dialog update", () => {
  test("uses the normal update when a newer release exists", () => {
    expect(updateTarget({ current: "1.4.0", latest: "1.4.2" })).toEqual({ type: "latest", version: "1.4.2" })
  })

  test("offers nothing when the installation is up to date", () => {
    expect(updateTarget({ current: "1.4.2", latest: "1.4.2" })).toBeUndefined()
    expect(updateTarget({ current: "1.4.2" })).toBeUndefined()
  })

  test("skipping a version hides it until a newer one ships", () => {
    expect(visibleNotice({ type: "available", version: "1.4.2" }, {})).toEqual({ type: "available", version: "1.4.2" })
    expect(visibleNotice({ type: "available", version: "1.4.2" }, { skippedVersion: "1.4.2" })).toBeUndefined()
    expect(visibleNotice({ type: "available", version: "1.4.3" }, { skippedVersion: "1.4.2" })).toEqual({
      type: "available",
      version: "1.4.3",
    })
  })

  test("compares versions for skipping", () => {
    expect(isVersionGreater("1.4.2", "1.4.2")).toBe(false)
    expect(isVersionGreater("1.4.3", "1.4.2")).toBe(true)
    expect(isVersionGreater("1.5.0", "1.10.0")).toBe(false)
    expect(isVersionGreater("1.4.2", "1.4.2-beta.1")).toBe(true)
  })
})
