# `@angkorgate/nextjs`

Drop-in Next.js App Router SDK for **AngkorGate** OIDC/SSO, middleware route protection, server auth verification, and RBAC UI components.

## Installation

```bash
npm install @angkorgate/nextjs
```

## 1. Wrap your Root Layout

```tsx
// app/layout.tsx
import { AngkorGateProvider } from "@angkorgate/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AngkorGateProvider
          clientId="demo-app"
          baseUrl={process.env.NEXT_PUBLIC_ANGKORGATE_URL!}
        >
          {children}
        </AngkorGateProvider>
      </body>
    </html>
  );
}
```

## 2. Protect Routes in `middleware.ts`

```ts
import { angkorgateMiddleware } from "@angkorgate/nextjs/server";

export default angkorgateMiddleware({
  protectedRoutes: ["/dashboard"],
});
```

## 3. Use Drop-in Components & RBAC Guards

```tsx
import { Protect, UserProfile, SignInButton } from "@angkorgate/nextjs";

<Protect permission="billing:read" fallback={<p>Upgrade to view</p>}>
  <UserProfile showRoles showPermissions />
</Protect>
```

## 4. Verify Requests in API Route Handlers

```ts
import { verifyAngkorGateRequest } from "@angkorgate/nextjs/server";

const user = await verifyAngkorGateRequest(request, {
  baseUrl: process.env.NEXT_PUBLIC_ANGKORGATE_URL!,
});
```
