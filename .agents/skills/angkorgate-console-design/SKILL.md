---
name: angkorgate-console-design
description: >-
  Use this skill when developing, designing, styling, or adding new UI components and pages in angkorgate-console.
  Enforces consistency with the Claude Code theme (https://tweakcn.com/r/themes/claude.json), base-lyra style,
  terracotta primary accents, warm paper/slate surfaces, 0.5rem radius, Remixicon icons, JetBrains Mono body typography,
  Merriweather headings, sidebar-16 dashboard layout, and the Feature-Driven Modular Architecture.
---

# AngkorGate Console Design System & Architecture Guide

This skill governs the visual design, component architecture, styling rules, and code organization for `angkorgate-console`.
All UI and feature development in `angkorgate-console` must follow these conventions to maintain brand, aesthetic integrity, and maintainable architecture.

---

## 1. Theme Specifications & Design Tokens

The console is configured with the **Claude Code Theme** via tweakcn (`https://tweakcn.com/r/themes/claude.json`):

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Theme / Accent** | `claude` (Terracotta `#D97757`) | `oklch(0.6171 0.1375 39.0427)` signature Claude warm accent |
| **Surfaces** | Warm Paper / Dark Slate | Light: `oklch(0.9818 0.0054 95.0986)` · Dark: `oklch(0.2679 0.0036 106.6427)` |
| **Style Foundation** | `base-lyra` | Radix / Base-UI foundations |
| **Border Radius** | `0.5rem` (`8px`) | Refined rounded corners across cards, buttons, inputs |
| **Chart Palette** | Terracotta & Violet | `oklch(0.5583 0.1276 42.9956)` & `oklch(0.6898 0.1581 290.4107)` |
| **Icon Library** | `@remixicon/react` | Standardized on Remixicon (`Ri...Line`) |
| **Body & Code Font** | `JetBrains Mono` | Applied globally on `html` / `body` (`var(--font-mono)`) |
| **Heading Font** | `Merriweather` | Applied using `font-heading` class (`var(--font-heading)`) |
| **Menu Accent** | `subtle` | Subtle background shifts on hover |
| **Menu Color** | `inverted` | Inverted popover / menu backgrounds |
| **Shell Layout** | `sidebar-16` | Sticky header, inset collapsible sidebar |

For exact OKLCH values and CSS variable definitions, see [tokens.md](./references/tokens.md).

---

## 2. Typography Rules

1. **Body & Interface Text**:
   - Default font is **JetBrains Mono** (`var(--font-mono)`).
   - Use standard Tailwind text utilities: `text-xs`, `text-sm`, `text-base`.
   - Prefer `text-sm` for standard data tables, lists, and forms.
   - Use `text-xs text-muted-foreground font-mono` for metadata, timestamps, and metric subtitles.

2. **Headings**:
   - Always apply `font-heading` to page titles and card titles:
     ```tsx
     <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
       Route Management
     </h1>
     ```
   - Section headers: `font-heading text-lg font-semibold`.

---

## 3. Component Styling & Radius Rules

1. **Border Radius (`radius: 0.5rem`)**:
   - Components use standard rounded borders (`rounded-md`, `rounded-lg`).
   - Cards and containers use `border border-border/50 bg-card`.

2. **Borders & Elevation**:
   - Use subtle borders: `border border-border/40` or `border border-border`.
   - Clean flat surfaces with warm contrast (`bg-card`, `bg-muted/50`).

3. **Status Badges**:
   - Use `<Badge variant="outline">` or `<Badge variant="secondary">` with `font-mono text-xs`.
   - For health and state indicators, pair with small Remixicon symbols:
     ```tsx
     <Badge variant="outline" className="font-mono text-xs gap-1">
       <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
       Healthy
     </Badge>
     ```

---

## 4. Icon Usage Guidelines

- **Always** use `@remixicon/react`.
- **Do not** introduce `lucide-react` or `heroicons` unless no alternative exists.
- Preferred icon style is line/outline (`Ri<Name>Line`).
- Common mappings:
  - Terminal / Gateways: `RiTerminalBoxLine`
  - Auth / Keys / PKCE: `RiKey2Line`, `RiShieldCheckLine`
  - Servers / Upstreams: `RiServerLine`
  - Actions / Lightning: `RiFlashlightLine`
  - Trends: `RiArrowUpLine`, `RiArrowDownLine`
  - Settings: `RiSettingsLine`
  - Search: `RiSearchLine`

---

## 5. Adding New Shadcn Components

Because the workspace path may contain special characters (like spaces or colons), always use the project npm script or direct binary execution:

```bash
cd angkorgate-console
npm run shadcn add <component-name>
# or
./node_modules/.bin/shadcn add <component-name>
```

When new components are added:
1. Verify `components.json` is respected (`style: base-lyra`, `iconLibrary: remixicon`).
2. Run typecheck and build to confirm:
   ```bash
   npm run typecheck && npm run build
   ```

For a full list of existing components, see [components.md](./references/components.md).

---

## 6. Layout & Shell Rules

1. All dashboard subpages should live under `app/(dashboard)/...` or use `SidebarProvider` + `AppSidebar` + `SiteHeader` + `SidebarInset`.
2. Header height variable is `--header-height:calc(var(--spacing)*14)`.
3. Keep the sticky header pinned at `top-0 z-50` with `border-b bg-background`.
4. Wrap layout trees in `<TooltipProvider>` inside `<ThemeProvider>` in `app/layout.tsx`.

---

## 7. Feature-Driven Modular Architecture (Screaming Architecture)

For complete architectural rules and examples, see [architecture.md](./references/architecture.md).

### Golden Architectural Principles
1. **Domain-First Organization**: Place domain logic inside `features/<feature-name>/` (`auth`, `gateways`, `identity`, `telemetry`), NOT inside generic root folders.
2. **Thin Route Layer**: Route files inside `app/**/page.tsx` must remain thin orchestrators (handling params, loading boundaries, and mounting feature components). Never place heavy JSX or business logic in route files.
3. **Strict Public API (Barrel Boundaries)**: Always import feature components via `features/<name>/index.ts` (e.g. `import { LoginForm } from "@/features/auth"`). Never deep-import into internal subfolders.
4. **Server vs. Client Isolation**:
   - Server-only modules MUST start with `import "server-only"`.
   - Client components MUST start with `"use client"` and stay at the leaves of the render tree.
5. **Single Source of Truth Validation**: Back every form and API input with a Zod schema in `features/<name>/types/*.schemas.ts`.
6. **Centralized API Client**: Use `lib/api-client.ts` for all external communication with `angkorgate-core`. Never use raw `fetch()` in UI components.
