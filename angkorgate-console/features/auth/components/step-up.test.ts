import test, { describe } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import ReactDOMServer from "react-dom/server"
import { SecretDisplayField, SecretInputField } from "@/components/secret-field"

describe("features/auth & components/secret-field: Masked Secret UI", () => {
  test("SecretDisplayField masks value as dots by default and never leaks plaintext into initial markup", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SecretDisplayField, {
        value: "super_secret_client_value_12345",
        maskedDots: 16,
        requireStepUp: true,
      })
    )

    assert.ok(html.includes("••••••••••••••••"))
    assert.ok(!html.includes("super_secret_client_value_12345"))
    assert.ok(html.includes("Reveal secret"))
    assert.ok(html.includes("Copy Secret"))
  })

  test("SecretInputField renders password-masked input with show/hide eye button", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SecretInputField, {
        id: "smtp-pass",
        value: "",
        onChange: () => {},
        hasStoredSecret: true,
        placeholder: "•••••••• (leave unchanged to keep)",
      })
    )

    assert.ok(html.includes('type="password"'))
    assert.ok(html.includes("Show value"))
    assert.ok(html.includes("••••••••"))
  })
})
