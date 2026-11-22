<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AngkorGate Console Agent Rules & Design System

## 1. Design System Standards (Discord Theme)
- **Theme**: Discord (`https://tweakcn.com/r/themes/cmn4wp9hz000104lbgtucaj5m`), signature Blurple primary accent (`oklch(0.5774 0.2091 273.8504)`).
- **Surfaces**: Discord light mode (`oklch(0.9881 0 0)`) and Discord dark slate (`oklch(0.3225 0.0107 278.2517)`).
- **Style**: `base-lyra` (Radix / Base UI foundations).
- **Icons**: Always import `@remixicon/react` (`Ri*Line`). Do not use lucide-react.
- **Typography**:
  - Body & UI text: `JetBrains Mono` (`font-mono`, `var(--font-mono)`).
  - Headings: `Merriweather` (`font-heading`, `var(--font-heading)`).
- **Border Radius**: `0.625rem` (`10px` / `rounded-md` / `rounded-lg`).
- **Sidebar**: Based on `sidebar-16` with sticky site header, top search bar, and inset layout.

## 2. CLI Execution in this Workspace
Due to colons in directory paths, always execute commands via npm scripts or explicit local paths:
- Add components: `npm run shadcn add <component>`
- Build: `npm run build`
- Typecheck: `npm run typecheck`
- Dev server: `npm run dev`

## 3. Architecture & Code Organization
- **Feature-Driven Modular Architecture**: Group business domains under `features/<feature-name>/` (`auth`, `gateways`, `identity`, `telemetry`).
- **Thin Route Layer**: Route pages in `app/**/page.tsx` must only handle route params, suspense wrappers, and mount feature components.
- **Barrel Boundaries**: Features must expose their public components and actions strictly through `features/<feature-name>/index.ts`. Never deep-import feature internals.
- **Dumb Atomic Primitives**: Keep `components/ui/` domain-agnostic (shadcn base-lyra primitives only).
- **Server/Client Isolation**: Explicitly tag `"server-only"` for data actions/queries and `"use client"` for leaf interactive components.
- **Type-Safe Validation**: Use Zod schemas for all form and API inputs in `features/<name>/types/*.schemas.ts`.

Detailed rules and guides are maintained in `.agents/skills/angkorgate-console-design/SKILL.md` and `.agents/skills/angkorgate-console-design/references/architecture.md`.
