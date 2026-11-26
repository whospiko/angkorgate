<div align="center">

<img src="angkorgate-console/public/logo.jpeg" alt="AngkorGate Logo" width="128" style="border-radius: 16px;" />

# 🇰🇭 AngkorGate

**One Gateway. Every Identity.**

An open-source, self-hostable Identity & Access Management (IAM) platform inspired by Cambodia — engineered to make authentication, OAuth 2.0 / OIDC, Passkeys, and RBAC effortless for modern applications.

[![Next.js](https://img.shields.io/badge/Console-Next.js%2016-000000?style=flat-square&logo=next.js)](angkorgate-console/package.json)
[![NestJS](https://img.shields.io/badge/Core-NestJS%2012-E0234E?style=flat-square&logo=nestjs)](angkorgate-core/package.json)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20SQLite-4169E1?style=flat-square&logo=postgresql&logoColor=white)](angkorgate-core/package.json)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](angkorgate-core/package.json)
[![License](https://img.shields.io/badge/License-MIT%20(planned)-blue?style=flat-square)](#-license)

[Features](#-features) • [Architecture](#️-architecture) • [Quick Start](#-quick-start) • [Configuration](#️-environment-configuration) • [Origin](#-origin)

</div>

---

## ✨ Why AngkorGate?

AngkorGate gives developers and organizations a clean, self-hosted alternative to heavy enterprise IAM suites. It pairs a high-security **NestJS Core Engine** with a **Next.js Admin Console & Self-Service Account Portal**, complete with white-label CMS branding and pluggable social identity providers.

## 🚀 Features

| Category | Capabilities |
| :--- | :--- |
| **Authentication & SSO** | Email/password auth, RS256 JWT access & refresh tokens, first-time Setup Wizard, and OAuth 2.0 / OpenID Connect (OIDC Discovery & JWKS). |
| **Passkeys & MFA** | Passwordless WebAuthn / FIDO2 Passkeys (Touch ID, Face ID, Security Keys) and Time-based One-Time Passwords (MFA / TOTP). |
| **Pluggable Social Identity Hub** | Dynamic, DB-managed OAuth & social login supporting **Google**, **GitHub**, **Discord**, **Microsoft Entra ID**, and **Telegram** with per-provider credentials and global callback/redirect settings. |
| **Self-Service Account Portal** | Hosted `/account` portal for end users (`CUSTOMER` / non-admin roles) to manage their profile, registered passkeys, and active sessions without accessing the admin dashboard. |
| **RBAC & Governance** | Granular `resource:action` permissions, role assignment, per-user permission overrides, and configurable console access roles. |
| **User, Staff & CRM Directory** | Manage auth accounts, sign-in method visibility, Employee profiles, and Customer CRM records in one place. |
| **API Keys & Audit Logs** | Developer API Keys gateway and tamper-evident audit logging for authentication and administrative events. |
| **White-Label CMS & Legal Pages** | Built-in Content Management (`/settings/content`) for app name, custom logo, support email, and CMS-aware `/terms` and `/privacy` pages. |

### Non-Features
- **Multi-Tenant** — AngkorGate is intentionally designed as a focused, single-tenant IAM gateway.

---

## 🏗️ Architecture

```text
angkorgate/
├── angkorgate-core/       # NestJS 12 IAM Engine (Auth, OIDC Provider, WebAuthn, RBAC, Audit, CRM)
├── angkorgate-console/    # Next.js 16 Admin Console, Account Portal (/account), Docs & Legal Pages
├── docs/                  # Architecture & integration documentation
└── docker-compose.example.yaml
```

### 🛠️ Tech Stack

- **Frontend Console:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn / Base UI, Remixicon, Zod
- **Backend Core:** NestJS 12, TypeORM, `oidc-provider`, `@simplewebauthn/server`, Passport.js
- **Database:** PostgreSQL (production) / SQLite (zero-config local dev)
- **Cache & Sessions:** Redis (`ioredis`)

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 20+ and **npm**
- **PostgreSQL** & **Redis** (optional for local dev — `angkorgate-core` supports SQLite out of the box)

### 1. Start the Core Engine (`angkorgate-core`)

```bash
cd angkorgate-core
npm install

# Zero-config local development (SQLite + auto dev admin)
npm run start:dev

# Or run against PostgreSQL
npm run start:dev:postgres
```

The Core API runs on `http://localhost:8080` by default (Swagger & OIDC discovery available from the core server).

### 2. Start the Admin Console (`angkorgate-console`)

```bash
cd angkorgate-console
cp .env.example .env
npm install
npm run dev
```

The Console runs on `http://localhost:4000`:
- **Login:** `http://localhost:4000/login`
- **Admin Dashboard:** `http://localhost:4000/dashboard`
- **User Self-Service Portal:** `http://localhost:4000/account`
- **Interactive Docs:** `http://localhost:4000/docs`

---

## ⚙️ Environment Configuration

`angkorgate-console/.env.example`:

```env
CORE_API_URL=http://localhost:8080
NEXT_PUBLIC_CORE_API_URL=http://localhost:8080
NEXT_PUBLIC_CONSOLE_URL=http://localhost:4000
```

- `CORE_API_URL`: Server-side endpoint used by Next.js Server Actions and Route Handlers to reach `angkorgate-core`.
- `NEXT_PUBLIC_CORE_API_URL`: Browser-facing Core API URL for OAuth initiation and public redirects.
- `NEXT_PUBLIC_CONSOLE_URL`: Public URL of `angkorgate-console` used for post-auth redirects (ideal for local ports, reverse proxies, or ngrok/Cloudflare tunnels).

---

## 🧪 Verification & Testing

```bash
# Console unit tests, typecheck & production build
cd angkorgate-console
npm test
npm run typecheck
npm run build

# Core unit tests, e2e tests & linting
cd ../angkorgate-core
npm test
npm run lint
```

---

## 🔭 Vision

To provide developers with a simple, secure, and extensible open-source identity platform for managing authentication and access across modern applications.

## 🇰🇭 Origin

Inspired by **Angkor** — a timeless symbol of Cambodian heritage, strength, and architectural precision.

**Built with passion in Cambodia.**

## 📄 License

MIT License (planned).
