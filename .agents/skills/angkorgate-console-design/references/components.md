# Component Inventory & Expansion Guide

## Installed UI Primitives (`components/ui/`)

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **Sidebar (sidebar-16)** | `components/ui/sidebar.tsx`, `components/app-sidebar.tsx` | Main collapsible application navigation |
| **SiteHeader** | `components/site-header.tsx` | Sticky top app bar with breadcrumbs and trigger |
| **Breadcrumb** | `components/ui/breadcrumb.tsx` | Hierarchical navigation paths |
| **Button** | `components/ui/button.tsx` | Primary, secondary, outline, ghost actions |
| **Badge** | `components/ui/badge.tsx` | Status and category tags |
| **Card** | `components/ui/card.tsx` | Container for metrics, widgets, forms |
| **Table** | `components/ui/table.tsx` | Data tables for apps, users, roles, audit logs |
| **Dialog** | `components/ui/dialog.tsx` | Modal dialogs for creation and configuration |
| **Tabs** | `components/ui/tabs.tsx` | Tabbed navigation for views and filters |
| **Select** | `components/ui/select.tsx` | Accessible dropdown selectors |
| **Switch** | `components/ui/switch.tsx` | Boolean toggles for app feature flags |
| **Input** | `components/ui/input.tsx` | Form text fields and search inputs |
| **Label** | `components/ui/label.tsx` | Accessible field labels |
| **DropdownMenu** | `components/ui/dropdown-menu.tsx` | Action menus and user profile menu |
| **Avatar** | `components/ui/avatar.tsx` | User and service icons |
| **Collapsible** | `components/ui/collapsible.tsx` | Expandable sidebar groups |
| **Separator** | `components/ui/separator.tsx` | Divider lines |
| **Skeleton** | `components/ui/skeleton.tsx` | Loading placeholders |
| **Sheet** | `components/ui/sheet.tsx` | Off-canvas drawers (mobile sidebar) |
| **Tooltip** | `components/ui/tooltip.tsx` | Hover tips (wrapped in root TooltipProvider) |
| **Field** | `components/ui/field.tsx` | Accessible form field groups and descriptions |

## Integrated Feature Modules (`features/`)

| Domain Module | Path | Linked OpenAPI Endpoints |
| :--- | :--- | :--- |
| **System** | `features/system` | `GET /`, `GET /cache/status` |
| **Auth** | `features/auth` | `POST /auth/login`, sessions, tokens |
| **Apps** | `features/apps` | `GET /admin/apps`, `POST /admin/apps`, `PATCH /admin/apps/{code}/toggle`, `POST /admin/apps/{code}/regenerate-secret`, `DELETE /admin/apps/{code}` |
| **Users** | `features/users` | `GET /users`, `POST /users`, `GET /users/{id}`, `PATCH /users/{id}/activate`, `/deactivate`, `/unlock`, `DELETE /users/{id}` |
| **RBAC** | `features/rbac` | `GET /rbac/roles`, `POST /rbac/roles`, `DELETE /rbac/roles/{id}`, `GET /rbac/permissions`, `PUT /rbac/roles/{id}/permissions` |
| **OAuth Providers** | `features/oauth-providers` | `GET /admin/oauth/providers`, `POST /admin/oauth/providers`, `PATCH /admin/oauth/providers/{code}/toggle`, `DELETE /admin/oauth/providers/{code}` |
| **Audit Logs** | `features/audit` | `GET /audit-logs`, `GET /audit-logs/actions`, `GET /audit-logs/entity/{entity}/{entityId}` |
| **Customers** | `features/customers` | `GET /customers`, `POST /customers`, `GET /customers/{customerId}/contacts` |
| **Organization** | `features/employees` | `GET /departments`, `GET /job-titles`, `GET /employees` |
| **OIDC Engine** | `features/oidc` | `GET /oidc/.well-known/openid-configuration`, `GET /oidc/jwks` |

## Adding Future Components

To add any other shadcn component:

```bash
cd angkorgate-console
npm run shadcn add <component-name>
```

After adding a component:
1. Verify it inherits `base-lyra` styling and `remixicon` icons automatically.
2. Ensure border radius conforms to `--radius: 0.5rem` (`rounded-md` / `rounded-lg`).
3. Run `npm run typecheck` and `npm run build` to validate.
