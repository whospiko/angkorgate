import test, { describe } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import ReactDOMServer from "react-dom/server"
import { UsersTable } from "./users-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { User } from "../types/users.types"

describe("features/users: UsersTable & DropdownMenu rendering", () => {
  const mockUsers: User[] = [
    {
      id: "usr-001",
      email: "admin@angkorgate.local",
      isActive: true,
      isEmailVerified: true,
      roles: ["ADMIN"],
      createdAt: "2026-11-22T00:00:00Z",
      updatedAt: "2026-11-22T00:00:00Z",
    },
    {
      id: "usr-002",
      email: "customer@example.com",
      isActive: false,
      isEmailVerified: false,
      roles: [],
      createdAt: "2026-11-22T00:00:00Z",
      updatedAt: "2026-11-22T00:00:00Z",
    },
  ]

  test("renders UsersTable without MenuGroupContext errors", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(UsersTable, { users: mockUsers })
    )
    assert.ok(html.includes("admin@angkorgate.local"))
    assert.ok(html.includes("customer@example.com"))
    assert.ok(html.includes("User Actions") === false) // Dropdown content is not open by default
  })

  test("renders DropdownMenuContent with DropdownMenuLabel inside or outside group safely", () => {
    const htmlWithGroup = ReactDOMServer.renderToString(
      React.createElement(
        DropdownMenu,
        { open: true },
        React.createElement(DropdownMenuTrigger, {
          render: React.createElement("button", null, "Trigger"),
        }),
        React.createElement(
          DropdownMenuContent,
          null,
          React.createElement(
            DropdownMenuGroup,
            null,
            React.createElement(DropdownMenuLabel, null, "User Actions"),
            React.createElement(DropdownMenuSeparator, null),
            React.createElement(DropdownMenuItem, null, "Deactivate User")
          )
        )
      )
    )
    assert.ok(htmlWithGroup.length > 0)

    const htmlWithoutGroup = ReactDOMServer.renderToString(
      React.createElement(
        DropdownMenu,
        { open: true },
        React.createElement(DropdownMenuTrigger, {
          render: React.createElement("button", null, "Trigger"),
        }),
        React.createElement(
          DropdownMenuContent,
          null,
          React.createElement(DropdownMenuLabel, null, "Standalone Action Header"),
          React.createElement(DropdownMenuItem, null, "Click Me")
        )
      )
    )
    assert.ok(htmlWithoutGroup.length > 0)
  })
})
