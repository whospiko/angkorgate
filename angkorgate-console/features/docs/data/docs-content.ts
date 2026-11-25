import { DocsCategory, DocArticle } from "../types/docs.types"

export const DOCS_CATEGORIES: DocsCategory[] = [
  {
    id: "getting-started",
    titleEn: "Getting Started",
    titleKm: "ការចាប់ផ្តើម",
    icon: "RiRocketLine",
    order: 1,
  },
  {
    id: "oidc-protocol",
    titleEn: "OIDC & OAuth 2.0",
    titleKm: "ពិធីការ OIDC & OAuth 2.0",
    icon: "RiShieldKeyholeLine",
    order: 2,
  },
  {
    id: "client-apps",
    titleEn: "Client Management",
    titleKm: "ការគ្រប់គ្រង Client",
    icon: "RiApps2Line",
    order: 3,
  },
  {
    id: "testing-verification",
    titleEn: "Testing & Verification",
    titleKm: "ការធ្វើតេស្តផ្ទៀងផ្ទាត់",
    icon: "RiTestTubeLine",
    order: 4,
  },
  {
    id: "access-control",
    titleEn: "RBAC & Permissions",
    titleKm: "តួនាទី និងសិទ្ធិ (RBAC)",
    icon: "RiUserSharedLine",
    order: 5,
  },
  {
    id: "security",
    titleEn: "Security & MFA",
    titleKm: "សុវត្ថិភាព និង MFA",
    icon: "RiLockPasswordLine",
    order: 6,
  },
  {
    id: "developer-tools",
    titleEn: "Developer Playbook",
    titleKm: "ឧបករណ៍ Developer",
    icon: "RiTerminalBoxLine",
    order: 7,
  },
  {
    id: "troubleshooting",
    titleEn: "Troubleshooting",
    titleKm: "ការដោះស្រាយបញ្ហា",
    icon: "RiAlertLine",
    order: 8,
  },
]

export const DOCS_ARTICLES: DocArticle[] = [
  // 1. Overview
  {
    id: "overview",
    categoryId: "getting-started",
    title: {
      en: "Overview & Architecture",
      km: "ទិដ្ឋភាពទូទៅ និងស្ថាបត្យកម្ម",
    },
    subtitle: {
      en: "Enterprise-grade OpenID Connect 1.0 & OAuth 2.0 identity platform built with NestJS and Next.js 15.",
      km: "ប្រព័ន្ធអត្តសញ្ញាណ និងសិទ្ធិប្រើប្រាស់កម្រិតសហគ្រាស OpenID Connect 1.0 & OAuth 2.0 បង្កើតដោយ NestJS និង Next.js 15។",
    },
    badge: "Core Architecture",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    nextArticleId: "quickstart",
    tableOfContents: [
      { id: "what-is-angkorgate", titleEn: "What is AngkorGate?", titleKm: "តើ AngkorGate ជាអ្វី?" },
      { id: "key-capabilities", titleEn: "Key Capabilities", titleKm: "សមត្ថភាពសំខាន់ៗ" },
      { id: "system-topology", titleEn: "System Topology", titleKm: "ប្លង់ប្រព័ន្ធ (System Topology)" },
    ],
    sections: [
      {
        id: "what-is-angkorgate",
        heading: {
          en: "What is AngkorGate?",
          km: "តើ AngkorGate ជាអ្វី?",
        },
        content: {
          en: "AngkorGate is an open-source, high-performance Identity and Access Management (IAM) engine and API gateway platform. It delivers Keycloak-equivalent capabilities—such as OpenID Connect 1.0 authorization code flows, public and confidential client management, and role-based access control—while maintaining a radically lightweight, cloud-native architecture.",
          km: "AngkorGate គឺជាប្រព័ន្ធគ្រប់គ្រងអត្តសញ្ញាណ និងសិទ្ធិប្រើប្រាស់ (IAM) ព្រមទាំង API Gateway បើកទូលាយ (Open-Source) ដែលមានល្បឿនលឿន និងប្រសិទ្ធភាពខ្ពស់។ វាផ្តល់នូវមុខងារស្មើនឹង Keycloak រួមមាន OpenID Connect 1.0, ការគ្រប់គ្រង Client សាធារណៈ និងសម្ងាត់, និងការកំណត់សិទ្ធិ RBAC ប៉ុន្តែមានទម្ងន់ស្រាល និងស៊ីធនធានតិចបំផុត។",
        },
        alert: {
          type: "tip",
          textEn: "AngkorGate Core runs on NestJS (Port 8080) and AngkorGate Console runs on Next.js 15 (Port 4000), backed by PostgreSQL.",
          textKm: "AngkorGate Core ដំណើរការលើ NestJS (ច្រក 8080) ហើយ AngkorGate Console ដំណើរការលើ Next.js 15 (ច្រក 4000) ដោយប្រើប្រាស់ PostgreSQL។",
        },
      },
      {
        id: "key-capabilities",
        heading: {
          en: "Key Capabilities",
          km: "សមត្ថភាពសំខាន់ៗ",
        },
        content: {
          en: "AngkorGate combines protocol certification with modern developer ergonomics:\n- OpenID Connect 1.0 & OAuth 2.0 with RS256 JWT minting\n- Public Single Page Apps (SPA) & Mobile Client PKCE (RFC 7636)\n- Confidential Backend Microservice M2M (Client Credentials)\n- Zero-Downtime Dual-Secret Rotation with live countdown grace periods\n- Keycloak 1-Click JSON Client Import and Export\n- Granular RBAC with Role-Permission Matrix & User-level Overrides\n- Two-Factor Authentication (TOTP 2FA) and Emergency Backup Codes",
          km: "AngkorGate រួមបញ្ចូលស្តង់ដារពិធីការអន្តរជាតិជាមួយបទពិសោធន៍ Developer ទំនើប៖\n- OpenID Connect 1.0 & OAuth 2.0 ជាមួយការបង្កើត Token RS256 JWT\n- ការពារ Public Single Page Apps (SPA) និង Mobile ដោយប្រើ PKCE (RFC 7636)\n- M2M Backend Microservices ដោយប្រើ Client Credentials\n- ការប្តូរ Secret ដោយមិនរំខានសេវា (Zero-Downtime Dual-Secret Rotation) ជាមួយពេលវេលាអនុគ្រោះ\n- មុខងារ Import និង Export JSON របស់ Keycloak ដោយចុចតែម្តង\n- ប្រព័ន្ធ RBAC លម្អិតជាមួយតារាងសិទ្ធិ និងការកំណត់លើកលែងផ្ទាល់ខ្លួន (User Overrides)\n- ការពារសុវត្ថិភាព 2 ជាន់ (TOTP 2FA) និងកូដបម្រុងសង្គ្រោះបន្ទាន់",
        },
      },
      {
        id: "system-topology",
        heading: {
          en: "System Topology",
          km: "ប្លង់ប្រព័ន្ធ (System Topology)",
        },
        content: {
          en: "The architecture consists of three core components: the User Agent (Browser/Client Apps), the Core Engine (`:8080`), and the Management Console (`:4000`), connected to PostgreSQL.",
          km: "ស្ថាបត្យកម្មប្រព័ន្ធរួមមាន ៣ ផ្នែកចម្បង៖ កម្មវិធីអ្នកប្រើ (Browser/Client Apps), ម៉ាស៊ីនស្នូល Core Engine (`:8080`), និងផ្ទាំងគ្រប់គ្រង Console (`:4000`) ដែលភ្ជាប់ទៅកាន់ PostgreSQL។",
        },
        codeSnippet: {
          language: "text",
          title: "Architecture Flow",
          code: `[Browser / Third-Party Client / OIDC Debugger]
       |
       +---> [Console :4000] (Next.js 15 UI / Server Actions / Login Form)
       |
       +---> [Core :8080] (NestJS OIDC Engine / /oidc/auth / /oidc/token / /oidc/me)
                   |
                   v
             [PostgreSQL] (app_settings, scopes, roles, permissions, users)`,
        },
      },
    ],
  },

  // 2. Quickstart
  {
    id: "quickstart",
    categoryId: "getting-started",
    title: {
      en: "Quickstart & Service Booting",
      km: "មគ្គុទ្ទេសក៍ចាប់ផ្តើម និងដំណើរការសេវាកម្ម",
    },
    subtitle: {
      en: "Step-by-step setup to clone, run migrations, and start both AngkorGate Core and Console.",
      km: "ការណែនាំជាជំហានៗក្នុងការដំឡើង, រត់ migration, និងបើកដំណើរការ AngkorGate Core និង Console។",
    },
    badge: "5 Min Setup",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "overview",
    nextArticleId: "oidc-engine",
    tableOfContents: [
      { id: "prerequisites", titleEn: "Prerequisites", titleKm: "តម្រូវការជាមុន" },
      { id: "database-migration", titleEn: "1. Database Migrations", titleKm: "១. ការរត់ Database Migrations" },
      { id: "start-core", titleEn: "2. Start AngkorGate Core", titleKm: "២. បើកដំណើរការ AngkorGate Core" },
      { id: "start-console", titleEn: "3. Start AngkorGate Console", titleKm: "៣. បើកដំណើរការ AngkorGate Console" },
      { id: "default-credentials", titleEn: "Default Administrator Credentials", titleKm: "គណនី Admin លំនាំដើម" },
    ],
    sections: [
      {
        id: "prerequisites",
        heading: {
          en: "Prerequisites",
          km: "តម្រូវការជាមុន",
        },
        content: {
          en: "Ensure your development workstation has Node.js 20+ and PostgreSQL 15+ installed and active on localhost:5432.",
          km: "សូមប្រាកដថាម៉ាស៊ីនរបស់អ្នកបានដំឡើង Node.js 20+ និង PostgreSQL 15+ រួចរាល់នៅលើ localhost:5432។",
        },
      },
      {
        id: "database-migration",
        heading: {
          en: "1. Database Migrations",
          km: "១. ការរត់ Database Migrations",
        },
        content: {
          en: "Run TypeORM migrations from `angkorgate-core` to initialize all database tables and seed default scopes (`openid`, `profile`, `email`, `roles`, etc.):",
          km: "រត់ TypeORM migrations ពី `angkorgate-core` ដើម្បីបង្កើតតារាងទាំងអស់ និងបញ្ចូល scopes លំនាំដើម (`openid`, `profile`, `email`, `roles`...):",
        },
        codeSnippet: {
          language: "bash",
          title: "Run Migrations",
          code: `cd angkorgate-core
npm install
npm run migration:run`,
        },
      },
      {
        id: "start-core",
        heading: {
          en: "2. Start AngkorGate Core",
          km: "២. បើកដំណើរការ AngkorGate Core",
        },
        content: {
          en: "Start the NestJS backend API engine on port 8080:",
          km: "បើកដំណើរការ NestJS backend API នៅលើច្រក 8080៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Start Backend",
          code: `cd angkorgate-core
npm run start:dev`,
        },
        alert: {
          type: "note",
          textEn: "OIDC Discovery will be available immediately at http://localhost:8080/oidc/.well-known/openid-configuration.",
          textKm: "OIDC Discovery នឹងដំណើរការភ្លាមៗនៅ http://localhost:8080/oidc/.well-known/openid-configuration។",
        },
      },
      {
        id: "start-console",
        heading: {
          en: "3. Start AngkorGate Console",
          km: "៣. បើកដំណើរការ AngkorGate Console",
        },
        content: {
          en: "In a separate terminal, launch the Next.js 15 administrative console on port 4000:",
          km: "នៅក្នុង terminal មួយទៀត បើកដំណើរការ Next.js 15 Console នៅលើច្រក 4000៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Start Console",
          code: `cd angkorgate-console
npm install
npm run dev`,
        },
      },
      {
        id: "default-credentials",
        heading: {
          en: "Default Administrator Credentials",
          km: "គណនី Admin លំនាំដើម",
        },
        content: {
          en: "Use these pre-seeded credentials to sign into the Console at http://localhost:4000/login:\n- **Email:** `piko@angkorgate.com`\n- **Password:** `admin1234`\n- **Role:** `ADMIN` (Full System Privileges)",
          km: "ប្រើប្រាស់គណនីលំនាំដើមខាងក្រោមដើម្បីចូល Console នៅ http://localhost:4000/login៖\n- **អ៊ីមែល (Email):** `piko@angkorgate.com`\n- **ពាក្យសម្ងាត់ (Password):** `admin1234`\n- **តួនាទី (Role):** `ADMIN` (សិទ្ធិពេញលេញ)",
        },
      },
    ],
  },

  // 3. OIDC Protocol Engine
  {
    id: "oidc-engine",
    categoryId: "oidc-protocol",
    title: {
      en: "OIDC & OAuth 2.0 Engine",
      km: "ម៉ាស៊ីនពិធីការ OIDC & OAuth 2.0",
    },
    subtitle: {
      en: "Complete specification of endpoints, RS256 token minting, Single Sign-On (SSO), and claim customization.",
      km: "លក្ខណៈបច្ចេកទេសពេញលេញនៃ Endpoints, ការបង្កើត Token RS256, Single Sign-On (SSO), និងការកំណត់ Claims។",
    },
    badge: "RFC Compliant",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "quickstart",
    nextArticleId: "client-management",
    tableOfContents: [
      { id: "endpoints-catalog", titleEn: "Endpoints Catalog", titleKm: "កាតាឡុក Endpoints" },
      { id: "supported-grant-types", titleEn: "Supported Grant Types", titleKm: "Grant Types ដែលគាំទ្រ" },
      { id: "sso-mechanics", titleEn: "Single Sign-On (SSO) Mechanics", titleKm: "យន្តការ Single Sign-On (SSO)" },
      { id: "scopes-and-claims", titleEn: "Dynamic Scopes & Claims", titleKm: "Scopes និង Claims ថាមវន្ត" },
    ],
    sections: [
      {
        id: "endpoints-catalog",
        heading: {
          en: "Endpoints Catalog",
          km: "កាតាឡុក Endpoints",
        },
        content: {
          en: "AngkorGate Core provides a full suite of OpenID Connect 1.0 and OAuth 2.0 endpoints:\n- `GET /oidc/.well-known/openid-configuration`: Discovery metadata\n- `GET /oidc/jwks`: Cryptographic RS256 public key set\n- `GET /oidc/auth`: Authorization initiation endpoint\n- `POST /oidc/token`: Token exchange endpoint\n- `GET/POST /oidc/me`: UserInfo endpoint\n- `POST /oidc/introspect`: RFC 7662 token introspection\n- `POST /oidc/revoke`: RFC 7009 token revocation\n- `GET /oidc/session/end`: RP-Initiated logout",
          km: "AngkorGate Core ផ្តល់នូវ Endpoints ពេញលេញនៃស្តង់ដារ OIDC 1.0 និង OAuth 2.0៖\n- `GET /oidc/.well-known/openid-configuration`: ព័ត៌មានលម្អិត Discovery\n- `GET /oidc/jwks`: សោរសាធារណៈ RS256 JWKS សម្រាប់ផ្ទៀងផ្ទាត់ JWT\n- `GET /oidc/auth`: ច្រកចាប់ផ្តើមផ្ទៀងផ្ទាត់ Authorization\n- `POST /oidc/token`: ច្រកប្តូរយក Token (Access Token, ID Token, Refresh Token)\n- `GET/POST /oidc/me`: ច្រកទាញយកទិន្នន័យ UserInfo\n- `POST /oidc/introspect`: ច្រកពិនិត្យស្ថានភាព Token (RFC 7662)\n- `POST /oidc/revoke`: ច្រកលុបចោល Token (RFC 7009)\n- `GET /oidc/session/end`: ច្រកចាកចេញពីគណនី (RP-Initiated Logout)",
        },
      },
      {
        id: "supported-grant-types",
        heading: {
          en: "Supported Grant Types",
          km: "Grant Types ដែលគាំទ្រ",
        },
        content: {
          en: "1. **Authorization Code Flow (`grant_type=authorization_code`)**:\n   Used by user-facing web, mobile, and SPA apps. Supports PKCE (RFC 7636) and both `response_mode=query` and `response_mode=form_post`.\n\n2. **Client Credentials Flow (`grant_type=client_credentials`)**:\n   Used for secure Machine-to-Machine (M2M) communication between backend microservices without user interaction.\n\n3. **Refresh Token Flow (`grant_type=refresh_token`)**:\n   Allows clients to renew expired access tokens in the background when `offline_access` scope is granted.",
          km: "១. **Authorization Code Flow (`grant_type=authorization_code`)**៖\n   ប្រើសម្រាប់ Web, Mobile, និង SPA apps។ គាំទ្រ PKCE (RFC 7636) និងទាំង `response_mode=query` ព្រមទាំង `response_mode=form_post`។\n\n២. **Client Credentials Flow (`grant_type=client_credentials`)**៖\n   ប្រើសម្រាប់ Machine-to-Machine (M2M) រវាង Backend Microservices ដោយមិនត្រូវការវត្តមានអ្នកប្រើប្រាស់។\n\n៣. **Refresh Token Flow (`grant_type=refresh_token`)**៖\n   អនុញ្ញាតឱ្យ Client បន្តសុពលភាព Access Token ស្វ័យប្រវត្តិកាលណាមាន scope `offline_access`។",
        },
      },
      {
        id: "sso-mechanics",
        heading: {
          en: "Single Sign-On (SSO) Mechanics",
          km: "យន្តការ Single Sign-On (SSO)",
        },
        content: {
          en: "When a user logs in once at AngkorGate, an encrypted session cookie (`_session`) is established. Subsequent authorization requests from any registered client application will automatically recognize the active session, skipping the password prompt and instantly minting the authorization code. If a client explicitly requires the user to re-enter their password, it can pass `prompt=login` in the authorize request.",
          km: "នៅពេលអ្នកប្រើប្រាស់បាន Login ម្តងនៅលើ AngkorGate ប្រព័ន្ធនឹងបង្កើត session cookie (`_session`)។ ការស្នើសុំ Authorization បន្ទាប់ពី Client ផ្សេងទៀតនឹងស្គាល់ session ដោយស្វ័យប្រវត្តិ (SSO) ដោយមិនបាច់ឱ្យអ្នកប្រើវាយពាក្យសម្ងាត់ម្តងទៀតឡើយ។ ប្រសិនបើ Client ចង់បង្ខំឱ្យអ្នកប្រើវាយ Password ឡើងវិញ គេអាចបញ្ជូន `prompt=login` នៅក្នុង query។",
        },
      },
      {
        id: "scopes-and-claims",
        heading: {
          en: "Dynamic Scopes & Claims",
          km: "Scopes និង Claims ថាមវន្ត",
        },
        content: {
          en: "Tokens and UserInfo responses dynamically embed claims based on authorized client scopes:\n- `openid`: `sub` (Unique Subject ID)\n- `profile`: `name`, `preferred_username`\n- `email`: `email`, `email_verified`\n- `roles`: `roles` array and `https://angkorgate.com/roles`\n- `permissions`: `permissions` array and `https://angkorgate.com/permissions`\n- `offline_access`: Mints a long-lived `refresh_token`",
          km: "Token និង UserInfo នឹងបញ្ចូល Claims ទៅតាម Scopes ដែលបានអនុញ្ញាត៖\n- `openid`: `sub` (Subject ID តែមួយគត់)\n- `profile`: `name`, `preferred_username`\n- `email`: `email`, `email_verified`\n- `roles`: បញ្ជី Role codes និង `https://angkorgate.com/roles`\n- `permissions`: បញ្ជីសិទ្ធិ Permissions និង `https://angkorgate.com/permissions`\n- `offline_access`: បង្កើត `refresh_token` សម្រាប់បន្តសុពលភាព",
        },
      },
    ],
  },

  // 4. Client Management
  {
    id: "client-management",
    categoryId: "client-apps",
    title: {
      en: "Client Application Management",
      km: "ការគ្រប់គ្រង Client Applications",
    },
    subtitle: {
      en: "Configure public SPAs, confidential backends, zero-downtime secret rotation, and Keycloak JSON import/export.",
      km: "កំណត់រចនាសម្ព័ន្ធ Public SPAs, Confidential Backends, ការប្តូរ Secret ដោយគ្មាន Downtime, និង Keycloak JSON។",
    },
    badge: "Keycloak Parity",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "oidc-engine",
    nextArticleId: "account-portal-integration",
    tableOfContents: [
      { id: "confidential-vs-public", titleEn: "Confidential vs. Public Clients", titleKm: "Client សម្ងាត់ (Confidential) vs. Client សាធារណៈ (Public)" },
      { id: "registration-wizard", titleEn: "4-Step Registration Wizard", titleKm: "ជំហានចុះឈ្មោះ ៤ ដំណាក់កាល" },
      { id: "secret-rotation", titleEn: "Zero-Downtime Dual-Secret Rotation", titleKm: "ការប្តូរ Secret ដោយមិនរំខានសេវា (Zero-Downtime)" },
      { id: "redirect-simulator", titleEn: "Redirect URI Pattern Simulator", titleKm: "ឧបករណ៍តេស្ត Redirect URI Simulator" },
    ],
    sections: [
      {
        id: "confidential-vs-public",
        heading: {
          en: "Confidential vs. Public Clients",
          km: "Client សម្ងាត់ (Confidential) vs. Client សាធារណៈ (Public)",
        },
        content: {
          en: "AngkorGate provides distinct workflows based on application architecture:\n- **Confidential Clients** (Node.js, NestJS, Go, Python): Securely hold a 64-character `client_secret`. Capable of M2M Service Accounts (`client_credentials`).\n- **Public Clients** (React, Next.js client-side, Mobile, OIDC Debugger): Cannot hold secrets securely. PKCE (Proof Key for Code Exchange) can be enforced or made optional to protect the code exchange.",
          km: "AngkorGate បែងចែកប្រភេទ Client យ៉ាងច្បាស់លាស់៖\n- **Confidential Clients** (Node.js, NestJS, Go, Python): រក្សាទុក `client_secret` ដោយសុវត្ថិភាព។ អាចប្រើមុខងារ M2M Service Accounts (`client_credentials`)។\n- **Public Clients** (React, Next.js client-side, Mobile, OIDC Debugger): មិនអាចលាក់ Secret បានឡើយ។ អាចបើក ឬបិទ PKCE (Proof Key for Code Exchange) ដើម្បីការពារការដោះដូរ Code។",
        },
      },
      {
        id: "registration-wizard",
        heading: {
          en: "4-Step Registration Wizard",
          km: "ជំហានចុះឈ្មោះ ៤ ដំណាក់កាល",
        },
        content: {
          en: "Navigate to **Console > Client Applications** and click **'+ Register Client'**:\n1. **General:** Set Client ID (`appCode`) and Name.\n2. **Capabilities:** Toggle Client Authentication (Confidential/Public), Standard Flow, Service Accounts, and Require PKCE.\n3. **URLs:** Configure Root URL, Home URL, Valid Redirect URIs (supports wildcards like `http://localhost:4000/*`), and Web Origins (CORS).\n4. **Scopes:** Select scopes authorized for this client.",
          km: "ចូលទៅកាន់ **Console > Client Applications** រួចចុច **'+ Register Client'**៖\n១. **ទូទៅ (General):** កំណត់ Client ID (`appCode`) និងឈ្មោះកម្មវិធី។\n២. **សមត្ថភាព (Capabilities):** ជ្រើសរើសប្រភេទ Confidential ឬ Public, បើក Standard Flow, Service Accounts, និងកំណត់ PKCE។\n៣. **URLs:** បញ្ចូល Root URL, Valid Redirect URIs (គាំទ្រ wildcards ដូចជា `http://localhost:4000/*`), និង Web Origins (CORS)។\n៤. **Scopes:** ជ្រើសរើស Scopes ដែលអនុញ្ញាតសម្រាប់ Client នេះ។",
        },
      },
      {
        id: "secret-rotation",
        heading: {
          en: "Zero-Downtime Dual-Secret Rotation",
          km: "ការប្តូរ Secret ដោយមិនរំខានសេវា (Zero-Downtime)",
        },
        content: {
          en: "When rotating credentials in production, AngkorGate generates a new Primary Secret while preserving the old secret as an **Expiring Secondary Secret** with a configurable grace period (e.g. 24 hours). Distributed microservices continue operating without downtime while progressively migrating to the new secret.",
          km: "នៅពេលប្តូរ Secret ក្នុងប្រព័ន្ធផលិតកម្ម AngkorGate បង្កើត Primary Secret ថ្មីមួយភ្លាមៗ ប៉ុន្តែនៅតែរក្សាទុក Secret ចាស់ជា **Secondary Secret** ជាមួយរយៈពេលអនុគ្រោះ (ឧ. ២៤ ម៉ោង)។ Microservices នានានៅតែអាចហៅ Token បានធម្មតាដោយគ្មានការដាច់សេវា (Zero Downtime)។",
        },
      },
      {
        id: "redirect-simulator",
        heading: {
          en: "Redirect URI Pattern Simulator",
          km: "ឧបករណ៍តេស្ត Redirect URI Simulator",
        },
        content: {
          en: "Inside any client's detail sheet, switch to the **Redirect Simulator** tab to test callback URLs against your configured whitelist in real time before deployment.",
          km: "នៅក្នុងផ្ទាំងព័ត៌មានលម្អិតរបស់ Client ចូលទៅកាន់ tab **Redirect Simulator** ដើម្បីតេស្តផ្ទៀងផ្ទាត់ Callback URL ជាមួយ Whitelist ភ្លាមៗមុនពេល Deploy។",
        },
      },
    ],
  },

  // 5. OIDC Debugger Verification
  {
    id: "oidc-debugger",
    categoryId: "testing-verification",
    title: {
      en: "Live Testing with OIDC Debugger",
      km: "ការតេស្តផ្ទាល់ជាមួយ OIDC Debugger",
    },
    subtitle: {
      en: "Complete guide to testing authorization code flow, PKCE, form_post, and token exchange on https://oidcdebugger.com.",
      km: "មគ្គុទ្ទេសក៍ពេញលេញក្នុងការធ្វើតេស្ត Authorization Code, PKCE, form_post, និងការប្តូរ Token នៅលើ https://oidcdebugger.com។",
    },
    badge: "Interactive Testing",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "client-management",
    nextArticleId: "rbac-permissions",
    tableOfContents: [
      { id: "why-oidc-debugger", titleEn: "Why OIDC Debugger Works", titleKm: "ហេតុអ្វី OIDC Debugger អាចតេស្តលើ Localhost បាន?" },
      { id: "configuration-table", titleEn: "Configuration Form Values", titleKm: "តារាងតម្លៃសម្រាប់បំពេញក្នុងទម្រង់" },
      { id: "execution-steps", titleEn: "Step-by-Step Execution", titleKm: "ជំហានប្រតិបត្តិការជាក់ស្តែង" },
      { id: "understanding-sso-and-pkce", titleEn: "Understanding SSO & PKCE", titleKm: "ការយល់ដឹងអំពី SSO និង PKCE" },
    ],
    sections: [
      {
        id: "why-oidc-debugger",
        heading: {
          en: "Why OIDC Debugger Works",
          km: "ហេតុអ្វី OIDC Debugger អាចតេស្តលើ Localhost បាន?",
        },
        content: {
          en: "OIDC Debugger (https://oidcdebugger.com) runs entirely client-side inside your browser. Because requests originate from your local browser, it can reach `http://localhost:8080` without requiring public tunneling or ngrok.",
          km: "OIDC Debugger (https://oidcdebugger.com) ដំណើរការផ្ទាល់នៅក្នុង Browser របស់អ្នក។ ដោយសារការស្នើសុំចេញពី Browser ក្នុងម៉ាស៊ីនផ្ទាល់ វាអាចទាក់ទងមកកាន់ `http://localhost:8080` បានដោយមិនចាំបាច់ប្រើ ngrok ឬ Public Tunnel ឡើយ។",
        },
      },
      {
        id: "configuration-table",
        heading: {
          en: "Configuration Form Values",
          km: "តារាងតម្លៃសម្រាប់បំពេញក្នុងទម្រង់",
        },
        content: {
          en: "Open https://oidcdebugger.com and configure the following parameters:\n- **Authorize URI:** `http://localhost:8080/oidc/auth`\n- **Redirect URI:** `https://oidcdebugger.com/debug`\n- **Client ID:** `demo-app`\n- **Scope:** `openid profile email roles`\n- **Response type:** `code`\n- **Response mode:** `form_post` (or `query`)\n- **Use PKCE?:** Optional (or Checked with SHA-256)\n- **Token URI:** `http://localhost:8080/oidc/token`\n- **Client Secret:** *(leave blank for demo-app)*",
          km: "បើក https://oidcdebugger.com រួចបំពេញព័ត៌មានខាងក្រោម៖\n- **Authorize URI:** `http://localhost:8080/oidc/auth`\n- **Redirect URI:** `https://oidcdebugger.com/debug`\n- **Client ID:** `demo-app`\n- **Scope:** `openid profile email roles`\n- **Response type:** `code`\n- **Response mode:** `form_post` (ឬ `query`)\n- **Use PKCE?:** មិនបាច់ធីកក៏បាន ឬធីកជាមួយ SHA-256\n- **Token URI:** `http://localhost:8080/oidc/token`\n- **Client Secret:** *(ទុកនៅទំនេរសម្រាប់ demo-app)*",
        },
      },
      {
        id: "execution-steps",
        heading: {
          en: "Step-by-Step Execution",
          km: "ជំហានប្រតិបត្តិការជាក់ស្តែង",
        },
        content: {
          en: "Follow these steps to complete an authorization flow:\n1. Click **'Send Request'** at the bottom of OIDC Debugger.\n2. If not previously signed in, the browser navigates to `http://localhost:4000/login?interaction=<uid>`.\n3. Enter `piko@angkorgate.com` / `admin1234` and click **'Sign In'**.\n4. The server finalizes the interaction and posts the authorization code back to `https://oidcdebugger.com/debug`.\n5. Click **'Exchange code'** on OIDC Debugger to view the minted Access Token, ID Token, and decoded claims.",
          km: "អនុវត្តតាមជំហានខាងក្រោមដើម្បីបញ្ចប់ Flow៖\n១. ចុច **'Send Request'** នៅខាងក្រោម OIDC Debugger។\n២. ប្រសិនបើមិនទាន់បាន Login ទេ Browser នឹងនាំទៅកាន់ `http://localhost:4000/login?interaction=<uid>`។\n៣. បញ្ចូល `piko@angkorgate.com` / `admin1234` រួចចុច **'Sign In'**។\n៤. ប្រព័ន្ធនឹងបញ្ចប់ Interaction ហើយបញ្ជូន Authorization Code ត្រឡប់ទៅ `https://oidcdebugger.com/debug`។\n៥. ចុច **'Exchange code'** នៅលើ OIDC Debugger ដើម្បីមើល Access Token, ID Token និង Claims ដែលទទួលបាន។",
        },
        alert: {
          type: "tip",
          textEn: "If you are already logged in to AngkorGate Console, Single Sign-On (SSO) will automatically grant the code without asking for password again. To test the login form again, use an Incognito window or append prompt=login.",
          textKm: "ប្រសិនបើអ្នកបាន Login រួចហើយ Single Sign-On (SSO) នឹងចេញ Code ឱ្យភ្លាមៗដោយមិនបាច់វាយ Password ឡើងវិញឡើយ។ ដើម្បីឃើញទម្រង់ Login ម្តងទៀត សូមប្រើ Incognito Window ឬថែម prompt=login។",
        },
      },
      {
        id: "understanding-sso-and-pkce",
        heading: {
          en: "Understanding SSO & PKCE",
          km: "ការយល់ដឹងអំពី SSO និង PKCE",
        },
        content: {
          en: "AngkorGate matches Keycloak's client behavior:\n- When `Require PKCE: ON`, requests without PKCE are rejected with `invalid_request: Authorization Server policy requires PKCE`.\n- When `Require PKCE: OFF`, PKCE is optional: clients can send requests with or without PKCE freely.\n- Both `query` (URL redirect) and `form_post` (auto-submitting HTML form) response modes are supported natively.",
          km: "AngkorGate ដំណើរការដូច Keycloak បេះបិទ៖\n- នៅពេលបើក `Require PKCE: ON` ការស្នើសុំដែលគ្មាន PKCE នឹងត្រូវបដិសេធ។\n- នៅពេលបិទ `Require PKCE: OFF` PKCE គឺស្រេចចិត្ត៖ Client អាចតេស្តដោយមាន ឬគ្មាន PKCE បានយ៉ាងរលូន។\n- គាំទ្រទាំង `query` (URL redirect) និង `form_post` (HTML auto-post form)។",
        },
      },
    ],
  },

  // 6. RBAC & Permissions
  {
    id: "rbac-permissions",
    categoryId: "access-control",
    title: {
      en: "Role-Based Access Control (RBAC)",
      km: "ការគ្រប់គ្រងតួនាទី និងសិទ្ធិ (RBAC)",
    },
    subtitle: {
      en: "Two-tab management for roles, catalog permissions, checkbox assignment matrix, and user-level overrides.",
      km: "ការគ្រប់គ្រង ២ ផ្ទាំងសម្រាប់ Roles, បញ្ជីសិទ្ធិ Permissions, តារាង Checkbox, និងការលើកលែងសិទ្ធិផ្ទាល់ខ្លួន។",
    },
    badge: "Enterprise RBAC",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "oidc-debugger",
    nextArticleId: "security-mfa",
    tableOfContents: [
      { id: "two-tab-interface", titleEn: "Two-Tab Management UI", titleKm: "ផ្ទាំងគ្រប់គ្រងចែកជា ២ (Two-Tab UI)" },
      { id: "role-permission-matrix", titleEn: "Role-Permission Checkbox Matrix", titleKm: "តារាង Checkbox កំណត់សិទ្ធិឱ្យ Role" },
      { id: "user-permission-overrides", titleEn: "User Overrides & Effective Calculation", titleKm: "ការកំណត់លើកលែង និងការគណនាសិទ្ធិជាក់ស្តែង" },
    ],
    sections: [
      {
        id: "two-tab-interface",
        heading: {
          en: "Two-Tab Management UI",
          km: "ផ្ទាំងគ្រប់គ្រងចែកជា ២ (Two-Tab UI)",
        },
        content: {
          en: "Navigate to **Console > Roles & Permissions** (`/rbac`):\n- **Roles Tab:** Lists all defined realm and application roles (e.g. `ADMIN`, `DOCTOR`, `ACCOUNTANT`). Allows creating, updating, and deleting roles.\n- **Permissions Tab:** Catalogs all system-wide granular permissions (e.g. `apps:create`, `users:read`, `records:write`).",
          km: "ចូលទៅកាន់ **Console > Roles & Permissions** (`/rbac`)៖\n- **Roles Tab:** បង្ហាញតួនាទីទាំងអស់ក្នុងប្រព័ន្ធ (ឧ. `ADMIN`, `DOCTOR`, `ACCOUNTANT`)។ អាចបង្កើត កែប្រែ និងលុប Role បាន។\n- **Permissions Tab:** បង្ហាញកាតាឡុកសិទ្ធិលម្អិតទាំងអស់ (ឧ. `apps:create`, `users:read`, `records:write`)។",
        },
      },
      {
        id: "role-permission-matrix",
        heading: {
          en: "Role-Permission Checkbox Matrix",
          km: "តារាង Checkbox កំណត់សិទ្ធិឱ្យ Role",
        },
        content: {
          en: "Click any role row on the Roles tab to open the **Assign Permissions Dialog**. Use checkboxes to grant or revoke specific permissions for that role with real-time search filtering. Changes save instantly via `PUT /rbac/roles/:id/permissions`.",
          km: "ចុចលើ Role ណាមួយនៅលើ Roles Tab ដើម្បីបើកផ្ទាំង **Assign Permissions Dialog**។ ប្រើប្រាស់ Checkbox ដើម្បីកំណត់ ឬដកសិទ្ធិលម្អិតសម្រាប់ Role នោះ ព្រមទាំងមានប្រអប់ស្វែងរកភ្លាមៗ។ រាល់ការកែប្រែត្រូវរក្សាទុកតាម `PUT /rbac/roles/:id/permissions`។",
        },
      },
      {
        id: "user-permission-overrides",
        heading: {
          en: "User Overrides & Effective Calculation",
          km: "ការកំណត់លើកលែង និងការគណនាសិទ្ធិជាក់ស្តែង",
        },
        content: {
          en: "In addition to inherited role permissions, administrators can configure user-specific overrides:\n- `GRANT`: Explicitly grant a permission to a user even if their role doesn't have it.\n- `REVOKE`: Explicitly revoke a permission from a user even if their role grants it.\n- Net effective permissions are resolved at runtime via `GET /rbac/users/:userId/permissions`: `(Role Permissions + User Grants) - User Revocations`.",
          km: "ក្រៅពីសិទ្ធិដែលទទួលបានពី Role អ្នកគ្រប់គ្រងអាចកំណត់ការលើកលែងផ្ទាល់ខ្លួន (User Overrides)៖\n- `GRANT`: ផ្តល់សិទ្ធិពិសេសដល់ User ម្នាក់ ទោះបីជា Role របស់គាត់គ្មានសិទ្ធិនោះក៏ដោយ។\n- `REVOKE`: ដកសិទ្ធិពិសេសពី User ម្នាក់ ទោះបីជា Role របស់គាត់មានសិទ្ធិនោះក៏ដោយ។\n- សិទ្ធិជាក់ស្តែងត្រូវគណនានៅពេល Runtime តាម `GET /rbac/users/:userId/permissions`៖ `(សិទ្ធិតាម Role + សិទ្ធិ GRANT) - សិទ្ធិ REVOKE`។",
        },
      },
    ],
  },

  // 7. Security & MFA
  {
    id: "security-mfa",
    categoryId: "security",
    title: {
      en: "Security & Multi-Factor Authentication",
      km: "សុវត្ថិភាព និងការផ្ទៀងផ្ទាត់ពហុកត្តា (MFA)",
    },
    subtitle: {
      en: "Hardened authentication with Argon2id, brute-force lockout, and RFC 6238 TOTP Authenticator 2FA.",
      km: "ប្រព័ន្ធសុវត្ថិភាពរឹងមាំជាមួយ Argon2id, ការពារ Brute-force Lockout, និង TOTP Authenticator 2FA។",
    },
    badge: "Zero Trust",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "rbac-permissions",
    nextArticleId: "developer-playbook",
    tableOfContents: [
      { id: "password-and-session", titleEn: "Password Hashing & Secure Cookies", titleKm: "ការ Hash ពាក្យសម្ងាត់ និង Cookie សុវត្ថិភាព" },
      { id: "brute-force-protection", titleEn: "Brute-Force Lockout Protection", titleKm: "ការការពារការទាយពាក្យសម្ងាត់ (Lockout)" },
      { id: "totp-authenticator", titleEn: "TOTP 2FA & Emergency Backup Codes", titleKm: "TOTP 2FA និងកូដបម្រុងសង្គ្រោះបន្ទាន់" },
      { id: "passkeys-fido2", titleEn: "Passkeys & WebAuthn (FIDO2)", titleKm: "Passkeys និង WebAuthn (FIDO2)" },
    ],
    sections: [
      {
        id: "password-and-session",
        heading: {
          en: "Password Hashing & Secure Cookies",
          km: "ការ Hash ពាក្យសម្ងាត់ និង Cookie សុវត្ថិភាព",
        },
        content: {
          en: "Passwords are salted and hashed using cryptographic Argon2id / multi-round Bcrypt. Session and token cookies enforce `httpOnly: true`, `sameSite: 'lax'`, and isolated path scopes to eliminate XSS and CSRF risks.",
          km: "ពាក្យសម្ងាត់ត្រូវបានការពារដោយក្បួន Cryptographic Argon2id / Bcrypt។ Session cookies ទាំងអស់ប្រើ `httpOnly: true`, `sameSite: 'lax'` ដើម្បីលុបបំបាត់ហានិភ័យ XSS និង CSRF ទាំងស្រុង។",
        },
      },
      {
        id: "brute-force-protection",
        heading: {
          en: "Brute-Force Lockout Protection",
          km: "ការការពារការទាយពាក្យសម្ងាត់ (Lockout)",
        },
        content: {
          en: "Accounts are automatically locked for 15 minutes after 5 consecutive failed login attempts. Any authentication attempt during lockout is rejected with HTTP 403 and the exact remaining countdown.",
          km: "គណនីនឹងត្រូវចាក់សោរដោយស្វ័យប្រវត្តិចំនួន ១៥ នាទី ប្រសិនបើវាយខុស ៥ ដងជាប់គ្នា។ រាល់ការប៉ុនប៉ង Login ក្នុងកំឡុងពេលចាក់សោរនឹងត្រូវបដិសេធជាមួយ HTTP 403 និងបង្ហាញនាទីដែលនៅសល់។",
        },
      },
      {
        id: "totp-authenticator",
        heading: {
          en: "TOTP 2FA & Emergency Backup Codes",
          km: "TOTP 2FA និងកូដបម្រុងសង្គ្រោះបន្ទាន់",
        },
        content: {
          en: "Users can pair any standard authenticator app (Google Authenticator, Microsoft Authenticator, 1Password) via QR code (RFC 6238). Upon activation, 10 single-use cryptographically hashed backup codes are generated for account recovery.",
          km: "អ្នកប្រើប្រាស់អាចភ្ជាប់ Authenticator App (Google Authenticator, 1Password, etc.) តាមរយៈ QR code (RFC 6238)។ នៅពេលបើកប្រើប្រាស់ ប្រព័ន្ធនឹងបង្កើតកូដបម្រុងចំនួន ១០ សន្លឹកសម្រាប់ប្រើពេលសង្គ្រោះបន្ទាន់។",
        },
      },
      {
        id: "passkeys-fido2",
        heading: {
          en: "Passkeys & WebAuthn (FIDO2 / Biometrics)",
          km: "Passkeys និង WebAuthn (FIDO2 / ស្កេនម្រាមដៃ និងផ្ទៃមុខ)",
        },
        content: {
          en: "AngkorGate natively supports WebAuthn / FIDO2 Passkeys. Users can register Touch ID, Face ID, Windows Hello, or hardware security keys (e.g. YubiKey) for instant zero-phishing passwordless login. Passkey credentials use public-key cryptography (ES256, RS256, EdDSA) where private keys never leave the secure hardware enclave of the user device.",
          km: "AngkorGate គាំទ្រ WebAuthn / FIDO2 Passkeys ពីកំណើត។ អ្នកប្រើប្រាស់អាចចុះឈ្មោះ Touch ID, Face ID, Windows Hello, ឬ hardware security keys (YubiKey) សម្រាប់ចូលប្រើប្រាស់ដោយគ្មានពាក្យសម្ងាត់ (Passwordless) និងការពារពីការលួច Phishing 100% ដោយប្រើ Public-Key Cryptography។",
        },
      },
    ],
  },

  // 8. Developer Playbook
  {
    id: "developer-playbook",
    categoryId: "developer-tools",
    title: {
      en: "Developer CLI & cURL Playbook",
      km: "កម្រងពាក្យបញ្ជា cURL សម្រាប់ Developer",
    },
    subtitle: {
      en: "Copy-pasteable cURL command recipes for authenticating, exchanging tokens, and querying APIs.",
      km: "រូបមន្តពាក្យបញ្ជា cURL សម្រាប់ចម្លងយកទៅប្រើក្នុងការ Login, ដោះដូរ Token, និងហៅ APIs។",
    },
    badge: "CLI Reference",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "security-mfa",
    nextArticleId: "troubleshooting",
    tableOfContents: [
      { id: "admin-login-recipe", titleEn: "1. Admin Login & JWT Export", titleKm: "១. ការ Login Admin និងទាញយក JWT" },
      { id: "m2m-token-recipe", titleEn: "2. M2M Token Exchange", titleKm: "២. ការប្តូរ Token M2M (Client Credentials)" },
      { id: "token-introspection-recipe", titleEn: "3. Token Introspection", titleKm: "៣. ការត្រួតពិនិត្យ Token (Introspection)" },
      { id: "userinfo-recipe", titleEn: "4. UserInfo Query", titleKm: "៤. ការហៅទិន្នន័យ UserInfo" },
    ],
    sections: [
      {
        id: "admin-login-recipe",
        heading: {
          en: "1. Admin Login & JWT Export",
          km: "១. ការ Login Admin និងទាញយក JWT",
        },
        content: {
          en: "Sign in with the administrator account and export the Bearer token for subsequent requests:",
          km: "ចូលដោយប្រើគណនី Admin និងរក្សាទុក Bearer token សម្រាប់ហៅ APIs បន្ទាប់៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Admin Login",
          code: `ADMIN_TOKEN=$(curl -s -X POST "http://localhost:8080/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"piko@angkorgate.com","password":"admin1234"}' | jq -r .accessToken)

echo "JWT: $ADMIN_TOKEN"`,
        },
      },
      {
        id: "m2m-token-recipe",
        heading: {
          en: "2. M2M Token Exchange",
          km: "២. ការប្តូរ Token M2M (Client Credentials)",
        },
        content: {
          en: "Request an access token for a confidential microservice using client credentials:",
          km: "ស្នើសុំ Access Token សម្រាប់ Microservice ដោយប្រើ Client ID និង Secret៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Client Credentials Grant",
          code: `curl -s -X POST "http://localhost:8080/oidc/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -u "clinic-api:69d2776ab1ad6dd956d967d8176e46550c3e18a13243b0bb45fb58ca234214c9" \\
  -d "grant_type=client_credentials&scope=openid roles" | jq .`,
        },
      },
      {
        id: "token-introspection-recipe",
        heading: {
          en: "3. Token Introspection",
          km: "៣. ការត្រួតពិនិត្យ Token (Introspection)",
        },
        content: {
          en: "Verify whether an access token is active and view its associated client, subject, and expiration:",
          km: "ត្រួតពិនិត្យមើលថាតើ Token នៅមានសុពលភាពឬអត់ និងពិនិត្យទិន្នន័យដែលភ្ជាប់ជាមួយវា៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Introspect Token",
          code: `curl -s -X POST "http://localhost:8080/oidc/introspect" \\
  -u "clinic-api:69d2776ab1ad6dd956d967d8176e46550c3e18a13243b0bb45fb58ca234214c9" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "token=YOUR_ACCESS_TOKEN" | jq .`,
        },
      },
      {
        id: "userinfo-recipe",
        heading: {
          en: "4. UserInfo Query",
          km: "៤. ការហៅទិន្នន័យ UserInfo",
        },
        content: {
          en: "Retrieve claims for the authenticated user using their bearer access token:",
          km: "ទាញយក Claims របស់អ្នកប្រើប្រាស់ដោយប្រើ Bearer Access Token៖",
        },
        codeSnippet: {
          language: "bash",
          title: "Get UserInfo",
          code: `curl -s "http://localhost:8080/oidc/me" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .`,
        },
      },
    ],
  },

  // 9. Troubleshooting
  {
    id: "troubleshooting",
    categoryId: "troubleshooting",
    title: {
      en: "Troubleshooting Matrix & FAQ",
      km: "ការដោះស្រាយបញ្ហា និងសំណួរញឹកញាប់",
    },
    subtitle: {
      en: "Common error codes, root causes, and immediate resolutions.",
      km: "កំហុសទូទៅ មូលហេតុដើមចម និងវិធីដោះស្រាយភ្លាមៗ។",
    },
    badge: "FAQ & Diagnostics",
    lastUpdated: "2026-11-23",
    version: "1.0.0",
    prevArticleId: "developer-playbook",
    tableOfContents: [
      { id: "common-issues-table", titleEn: "Common Diagnostics Matrix", titleKm: "តារាងវិភាគបញ្ហាទូទៅ" },
      { id: "faq-sso-login", titleEn: "Why was the login screen skipped?", titleKm: "ហេតុអ្វីមិនឃើញផ្ទាំង Login?" },
      { id: "faq-cors-preflight", titleEn: "Browser CORS Blocks", titleKm: "បញ្ហា Browser CORS Block" },
    ],
    sections: [
      {
        id: "common-issues-table",
        heading: {
          en: "Common Diagnostics Matrix",
          km: "តារាងវិភាគបញ្ហាទូទៅ",
        },
        content: {
          en: "- **`redirect_uri_mismatch`:** The callback URL sent in query string does not match `valid_redirect_uris` in client settings. Add the exact URL or wildcard pattern.\n- **`Authorization Server policy requires PKCE`:** The client has `Require PKCE: ON` but the request omitted `code_challenge`. Either check 'Use PKCE?' or disable Require PKCE in client settings.\n- **`invalid_client` (401):** The client secret is incorrect or was passed for a public client. Public clients must not send client secrets.\n- **Redirect to port 5173 instead of 4000:** Set `CONSOLE_URL=http://localhost:4000` and `APP_WEB_URL=http://localhost:4000` in `angkorgate-core/.env`.",
          km: "- **`redirect_uri_mismatch`៖** Callback URL មិនត្រូវគ្នានឹង `valid_redirect_uris` របស់ Client។ សូមបន្ថែម URL ពេញលេញ ឬ Wildcard។\n- **`Authorization Server policy requires PKCE`៖** Client បានកំណត់ `Require PKCE: ON` ប៉ុន្តែមិនបានបញ្ជូន `code_challenge`។ សូមធីក 'Use PKCE?' ឬបិទ Require PKCE លើ Client។\n- **`invalid_client` (401)៖** Client Secret ខុស ឬបានបញ្ជូន Secret មកឱ្យ Public Client។ Public Client មិនត្រូវប្រើ Client Secret ឡើយ។\n- **Redirect ទៅច្រក 5173 ជំនួសឱ្យ 4000៖** សូមកំណត់ `CONSOLE_URL=http://localhost:4000` និង `APP_WEB_URL=http://localhost:4000` ក្នុង `angkorgate-core/.env`។",
        },
      },
      {
        id: "faq-sso-login",
        heading: {
          en: "Why was the login screen skipped?",
          km: "ហេតុអ្វីមិនឃើញផ្ទាំង Login?",
        },
        content: {
          en: "If you have already signed in to AngkorGate Console in the same browser, AngkorGate recognizes your active session cookie (`_session`) and performs Single Sign-On (SSO). To force the login screen to appear, test inside a Private/Incognito browser tab, or pass `prompt=login` in the authorize parameters.",
          km: "ប្រសិនបើអ្នកធ្លាប់បាន Login ក្នុង Browser នោះរួចហើយ AngkorGate នឹងស្គាល់ session cookie (`_session`) ហើយដំណើរការ Single Sign-On (SSO) ដោយស្វ័យប្រវត្តិ។ ដើម្បីឃើញផ្ទាំង Login ម្តងទៀត សូមប្រើ Private/Incognito Window ឬបន្ថែម `prompt=login` ក្នុង query។",
        },
      },
      {
        id: "faq-cors-preflight",
        heading: {
          en: "Browser CORS Blocks",
          km: "បញ្ហា Browser CORS Block",
        },
        content: {
          en: "When testing from browser-based tools like OIDC Debugger, your backend must permit cross-origin OPTIONS preflight requests. AngkorGate Core enables this out of the box via `app.enableCors({ origin: true, credentials: true })` in `src/main.ts` and `clientBasedCORS` in `oidc.service.ts`.",
          km: "នៅពេលតេស្តពី Browser Tool ដូចជា OIDC Debugger ម៉ាស៊ីន Backend ត្រូវតែបើក CORS OPTIONS Preflight។ AngkorGate Core បានរៀបចំរួចជាស្រេចតាមរយៈ `app.enableCors({ origin: true, credentials: true })` ក្នុង `src/main.ts` និង `clientBasedCORS` ក្នុង `oidc.service.ts`។",
        },
      },
    ],
  },

  // 10. External Frontend Account Linking & Self-Service Portal
  {
    id: "account-portal-integration",
    categoryId: "client-apps",
    title: {
      en: "External Frontend Account Linking & Self-Service Portal",
      km: "ការភ្ជាប់ Frontend ខាងក្រៅ និងទំព័រគ្រប់គ្រងគណនី (Self-Service Portal)",
    },
    subtitle: {
      en: "Learn how client applications link users to AngkorGate's hosted self-service account portal or consume headless profile REST APIs.",
      km: "ស្វែងយល់ពីរបៀបដែល Client Application ភ្ជាប់អ្នកប្រើប្រាស់មកកាន់ Self-Service Account Portal ឬប្រើប្រាស់ Headless Profile REST APIs។",
    },
    badge: "Self-Service & APIs",
    lastUpdated: "2026-11-25",
    version: "1.0.0",
    prevArticleId: "client-management",
    nextArticleId: "oidc-debugger",
    tableOfContents: [
      { id: "two-patterns", titleEn: "Hosted Portal vs Headless APIs", titleKm: "Hosted Portal vs Headless APIs" },
      { id: "pattern-1-hosted-portal", titleEn: "Pattern 1: Hosted Account Portal URL", titleKm: "ទម្រង់ទី ១៖ Hosted Account Portal URL" },
      { id: "pattern-2-headless-api", titleEn: "Pattern 2: Headless REST Profile APIs", titleKm: "ទម្រង់ទី ២៖ Headless REST Profile APIs" },
      { id: "security-and-passkeys", titleEn: "Passkeys, MFA & Session Revocation", titleKm: "Passkeys, MFA និងការលុប Session" },
    ],
    sections: [
      {
        id: "two-patterns",
        heading: {
          en: "Hosted Portal vs Headless REST APIs",
          km: "Hosted Portal vs Headless REST APIs",
        },
        content: {
          en: "When building external frontend apps (Next.js, React, Vue, mobile apps) authenticated via AngkorGate OIDC, you have two flexible architectural patterns for allowing users to update their profile and security settings:\n\n1. **Hosted Account Portal (`/account`)**: Redirect or link the user to AngkorGate's built-in, responsive self-service portal. Zero frontend code required in your app; supports biometrics/Passkeys, sessions, password change, and a convenient **Return to [App Name]** button.\n2. **Headless Self-Service REST APIs**: Your application builds its own native UI and directly calls AngkorGate's `GET /auth/me` and `PATCH /auth/me` endpoints using the user's OIDC access token.",
          km: "នៅពេលបង្កើត Frontend ខាងក្រៅ (Next.js, React, Vue, Mobile) ដែល Login តាមរយៈ AngkorGate OIDC អ្នកមានជម្រើស ២ បែបដើម្បីឱ្យអ្នកប្រើប្រាស់កែប្រែ Profile និង Security៖\n\n1. **Hosted Account Portal (`/account`)**៖ បញ្ជូនអ្នកប្រើមកកាន់ទំព័រ Self-Service ស្រាប់របស់ AngkorGate ដោយផ្ទាល់។ មិនបាច់សរសេរ UI ថ្មី គាំទ្រទាំង Passkeys/Biometrics, Sessions, Password Change និងមានប៊ូតុង **Return to [App Name]** ត្រឡប់ទៅវិញ។\n2. **Headless Self-Service REST APIs**៖ Application របស់អ្នកបង្កើត UI ផ្ទាល់ខ្លួន ហើយហៅ API `GET /auth/me` និង `PATCH /auth/me` ដោយប្រើ OIDC Access Token។",
        },
      },
      {
        id: "pattern-1-hosted-portal",
        heading: {
          en: "Pattern 1: Linking to Hosted Account Portal",
          km: "ទម្រង់ទី ១៖ ការភ្ជាប់ទៅកាន់ Hosted Account Portal",
        },
        content: {
          en: "In your client application's navigation header or user avatar menu, link directly to AngkorGate's account portal passing `return_url` and `app_name` query parameters:\n\n```tsx\n// In your React / Next.js Navbar:\nexport function UserProfileLink() {\n  const portalUrl = new URL('http://localhost:4000/account');\n  portalUrl.searchParams.set('return_url', window.location.href);\n  portalUrl.searchParams.set('app_name', 'Acme Store');\n\n  return (\n    <a\n      href={portalUrl.toString()}\n      className=\"btn btn-outline\"\n    >\n      Manage Account & Security\n    </a>\n  );\n}\n```\n\nIf the user is already authenticated in AngkorGate, the portal displays immediately. If not, they are prompted to sign in and immediately redirected back to `/account`.",
          km: "នៅក្នុង Navbar ឬ Menu របស់ Client App អ្នកអាចដាក់ Link ទៅកាន់ Account Portal ដោយបញ្ជូន `return_url` និង `app_name`៖\n\n```tsx\n// ឧទាហរណ៍ក្នុង React / Next.js Navbar:\nexport function UserProfileLink() {\n  const portalUrl = new URL('http://localhost:4000/account');\n  portalUrl.searchParams.set('return_url', window.location.href);\n  portalUrl.searchParams.set('app_name', 'Acme Store');\n\n  return (\n    <a\n      href={portalUrl.toString()}\n      className=\"btn btn-outline\"\n    >\n      គ្រប់គ្រងគណនី និងសុវត្ថិភាព\n    </a>\n  );\n}\n```\n\nប្រសិនបើអ្នកប្រើបាន Login រួចហើយ ទំព័រនេះនឹងបង្ហាញភ្លាមៗ។ ប្រសិនបើមិនទាន់ Login ប្រព័ន្ធនឹងនាំទៅ Login រួច redirect មកកាន់ `/account` ដោយស្វ័យប្រវត្តិ។",
        },
      },
      {
        id: "pattern-2-headless-api",
        heading: {
          en: "Pattern 2: Headless Self-Service REST APIs",
          km: "ទម្រង់ទី ២៖ Headless Self-Service REST APIs",
        },
        content: {
          en: "If you want a 100% custom UI inside your own application, call AngkorGate's REST endpoints using the user's Bearer access token:\n\n### 1. Fetch Rich Profile (`GET /auth/me`)\n```http\nGET http://localhost:8080/auth/me\nAuthorization: Bearer <accessToken>\n```\n**Response:**\n```json\n{\n  \"id\": \"a1b2c3d4-...\",\n  \"email\": \"user@example.com\",\n  \"phone\": \"+85512345678\",\n  \"fullName\": \"Dara Sok\",\n  \"roles\": [\"CUSTOMER\"],\n  \"permissions\": [\"orders:read\"],\n  \"isEmailVerified\": true,\n  \"isPhoneVerified\": true,\n  \"mfaEnabled\": false,\n  \"passkeysCount\": 2,\n  \"createdAt\": \"2026-01-15T08:00:00Z\",\n  \"customer\": { \"id\": \"...\", \"customerCode\": \"CUS-0001\", \"type\": \"CUSTOMER\" }\n}\n```\n\n### 2. Update Profile (`PATCH /auth/me`)\n```http\nPATCH http://localhost:8080/auth/me\nAuthorization: Bearer <accessToken>\nContent-Type: application/json\n\n{\n  \"fullName\": \"Dara Sok\",\n  \"phone\": \"+85598765432\"\n}\n```",
          km: "ប្រសិនបើអ្នកចង់បង្កើត UI ក្នុង App របស់អ្នក ១០០% សូមហៅ API REST របស់ AngkorGate ដោយភ្ជាប់ Bearer Access Token៖\n\n### 1. ទាញយក Profile (`GET /auth/me`)\n```http\nGET http://localhost:8080/auth/me\nAuthorization: Bearer <accessToken>\n```\n**Response ត្រឡប់មកវិញ៖**\n```json\n{\n  \"id\": \"a1b2c3d4-...\",\n  \"email\": \"user@example.com\",\n  \"phone\": \"+85512345678\",\n  \"fullName\": \"Dara Sok\",\n  \"roles\": [\"CUSTOMER\"],\n  \"permissions\": [\"orders:read\"],\n  \"isEmailVerified\": true,\n  \"isPhoneVerified\": true,\n  \"mfaEnabled\": false,\n  \"passkeysCount\": 2,\n  \"createdAt\": \"2026-01-15T08:00:00Z\",\n  \"customer\": { \"id\": \"...\", \"customerCode\": \"CUS-0001\", \"type\": \"CUSTOMER\" }\n}\n```\n\n### 2. កែប្រែឈ្មោះ និងលេខទូរស័ព្ទ (`PATCH /auth/me`)\n```http\nPATCH http://localhost:8080/auth/me\nAuthorization: Bearer <accessToken>\nContent-Type: application/json\n\n{\n  \"fullName\": \"Dara Sok\",\n  \"phone\": \"+85598765432\"\n}\n```",
        },
      },
      {
        id: "security-and-passkeys",
        heading: {
          en: "Security, Sessions & Passkeys APIs",
          km: "API សម្រាប់ Passkeys, សុវត្ថិភាព និង Sessions",
        },
        content: {
          en: "External clients can also access dedicated self-service security endpoints:\n- **Change Password**: `POST /auth/change-password` with `{ oldPassword, newPassword }`\n- **Active Sessions**: `GET /auth/sessions` and `DELETE /auth/sessions/:id`\n- **Logout All Devices**: `POST /auth/logout-all`\n- **Biometric Passkeys**: `POST /auth/passkey/register/options`, `POST /auth/passkey/register/verify`, `GET /auth/passkey/list`, and `DELETE /auth/passkey/:id`",
          km: "Client ខាងក្រៅក៏អាចហៅ Endpoints សម្រាប់គ្រប់គ្រងសុវត្ថិភាពផ្ទាល់ខ្លួនបានផងដែរ៖\n- **ប្តូរពាក្យសម្ងាត់**៖ `POST /auth/change-password` ជាមួយ `{ oldPassword, newPassword }`\n- **បញ្ជី Sessions សកម្ម**៖ `GET /auth/sessions` និង `DELETE /auth/sessions/:id`\n- **ចាកចេញពីគ្រប់ឧបករណ៍**៖ `POST /auth/logout-all`\n- **ចុះឈ្មោះ Passkeys / Biometrics**៖ `POST /auth/passkey/register/options`, `POST /auth/passkey/register/verify`, `GET /auth/passkey/list` និង `DELETE /auth/passkey/:id`",
        },
      },
    ],
  },
]

export function getDocArticleById(id: string): DocArticle | undefined {
  return DOCS_ARTICLES.find((article) => article.id === id)
}

export function getDocArticlesByCategory(categoryId: string): DocArticle[] {
  return DOCS_ARTICLES.filter((article) => article.categoryId === categoryId)
}
