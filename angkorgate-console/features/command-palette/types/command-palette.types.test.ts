import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  CommandSearchQuerySchema,
  STATIC_COMMAND_ENTRIES,
  filterStaticCommands,
} from "./command-palette.types"

describe("CommandPalette types & filtering", () => {
  it("validates and trims command search queries", () => {
    const res = CommandSearchQuerySchema.parse({ query: "  alice@example.com  " })
    assert.equal(res.query, "alice@example.com")
  })

  it("rejects queries exceeding 120 characters", () => {
    const res = CommandSearchQuerySchema.safeParse({ query: "a".repeat(121) })
    assert.equal(res.success, false)
  })

  it("filters static commands by title, subtitle, or keywords", () => {
    const redisMatches = filterStaticCommands(STATIC_COMMAND_ENTRIES, "redis")
    assert.equal(redisMatches.length, 1)
    assert.equal(redisMatches[0].id, "action:purge-cache")

    const maintenanceMatches = filterStaticCommands(STATIC_COMMAND_ENTRIES, "maintenance")
    assert.ok(maintenanceMatches.some((e) => e.id === "action:toggle-maintenance"))

    const apiKeyMatches = filterStaticCommands(STATIC_COMMAND_ENTRIES, "create api")
    assert.ok(apiKeyMatches.some((e) => e.id === "action:create-api-key"))
  })

  it("returns all static commands when query is empty", () => {
    const all = filterStaticCommands(STATIC_COMMAND_ENTRIES, "   ")
    assert.equal(all.length, STATIC_COMMAND_ENTRIES.length)
  })
})
