# `@angkorgate/react`

Drop-in React SDK for **AngkorGate** OIDC/SSO authentication and RBAC permission guards.

## Installation

```bash
npm install @angkorgate/react
```

## Usage

```tsx
import {
  AngkorGateProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserProfile,
  Protect,
} from "@angkorgate/react";

export function App() {
  return (
    <AngkorGateProvider clientId="demo-app" baseUrl="http://localhost:8080">
      <SignedOut>
        <SignInButton />
      </SignedOut>

      <SignedIn>
        <UserProfile showRoles showPermissions />
        <Protect permission="billing:read" fallback={<p>Upgrade to view</p>}>
          <InvoiceList />
        </Protect>
      </SignedIn>
    </AngkorGateProvider>
  );
}
```
