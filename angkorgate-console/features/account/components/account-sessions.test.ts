import test, { describe } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import ReactDOMServer from "react-dom/server"
import {
  resolveSessionMetadata,
  formatRelativeTimestamp,
} from "@/lib/session-metadata"
import { AccountSessionsTab } from "./account-sessions-tab"

describe("features/account: Session Metadata & AccountSessionsTab", () => {
  test("resolveSessionMetadata prefers backend parsed OS/browser and falls back to UA parsing", () => {
    const backendProvided = resolveSessionMetadata({
      browser: "Chrome 131",
      os: "macOS 10.15",
      deviceType: "desktop",
      userAgent: "ignored",
    })
    assert.equal(backendProvided.label, "Chrome 131 on macOS 10.15")
    assert.equal(backendProvided.deviceType, "desktop")

    const fallback = resolveSessionMetadata({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile/15E148 Safari/604.1",
    })
    assert.equal(fallback.browser, "Safari 18")
    assert.equal(fallback.os, "iOS")
    assert.equal(fallback.deviceType, "mobile")
    assert.equal(fallback.label, "Safari 18 on iOS")
  })

  test("formatRelativeTimestamp formats recent timestamps cleanly", () => {
    const nowIso = new Date().toISOString()
    assert.equal(formatRelativeTimestamp(nowIso), "Just now")

    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    assert.equal(formatRelativeTimestamp(fiveMinAgo), "5m ago")
  })

  test("AccountSessionsTab renders cleanly on SSR", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(AccountSessionsTab)
    )
    assert.ok(html.includes("Active Browser &amp; App Sessions"))
  })
})
