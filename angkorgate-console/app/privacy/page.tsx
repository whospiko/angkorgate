import { Metadata } from "next"
import { getBranding } from "@/features/system"
import { LegalDocumentLayout, type LegalSection } from "@/components/legal-document-layout"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Privacy Policy | AngkorGate IAM",
  description: "Open-source Privacy Policy explaining how AngkorGate handles identity, authentication, and session data.",
}

export default async function PrivacyPolicyPage() {
  const branding = await getBranding()
  const appName = branding.appName || "AngkorGate"
  const org = branding.organizationName || `${appName} Maintainers`
  const contact = branding.supportEmail || "the instance administrator"

  const sections: LegalSection[] = [
    {
      id: "overview",
      title: "Overview & Data Controller",
      content: (
        <>
          <p>
            This Privacy Policy explains how <strong className="text-foreground">{org}</strong>{" "}
            collects, processes, and protects personal data when you use this{" "}
            <strong className="text-foreground">{appName}</strong> Identity &amp; Access
            Management (IAM) instance. Because <strong className="text-foreground">{appName}</strong>{" "}
            is open-source and self-hostable, your data is stored and controlled by the operator of
            this specific instance—not transmitted to upstream open-source authors.
          </p>
        </>
      ),
    },
    {
      id: "data-we-collect",
      title: "Information We Collect",
      content: (
        <>
          <p>Depending on how you authenticate and how your administrator configures the system, we process:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Account &amp; Profile Data:</strong> Email
              address, full name, phone number (e.g., for Telegram or SMS verification), user UUID,
              assigned roles, and email/phone verification flags.
            </li>
            <li>
              <strong className="text-foreground">Authentication Credentials:</strong> Cryptographically
              hashed passwords (never stored in plaintext) and WebAuthn/FIDO2 Passkey public-key
              credentials (credential ID, public key, counter, and user-assigned device label—your
              raw biometric data never leaves your device).
            </li>
            <li>
              <strong className="text-foreground">Connected Social Identities:</strong> Provider
              identifier and external account ID/username when you sign in via Google, GitHub,
              Discord, Microsoft, or Telegram.
            </li>
            <li>
              <strong className="text-foreground">Security &amp; Audit Logs:</strong> IP address,
              user-agent/device metadata, login timestamps, failed login counters, token issuance,
              and administrative actions recorded for security monitoring and compliance.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "how-we-use-data",
      title: "How We Use Your Information",
      content: (
        <>
          <p>We process identity data strictly to operate and secure authentication:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Verify your identity and issue short-lived JWT access tokens and refresh tokens.</li>
            <li>Enforce Role-Based Access Control (RBAC) across connected applications and consoles.</li>
            <li>Detect and prevent unauthorized access, brute-force attempts, and session hijacking.</li>
            <li>Provide self-service account management (profile updates, passkey management, and active session revocation) at <code className="font-mono text-xs text-foreground">/account</code>.</li>
          </ul>
        </>
      ),
    },
    {
      id: "cookies-and-sessions",
      title: "Essential Cookies & Session Storage",
      content: (
        <>
          <p>
            <strong className="text-foreground">{appName}</strong> uses strictly necessary
            first-party cookies (such as <code className="font-mono text-xs text-foreground">angkorgate_token</code>,{" "}
            <code className="font-mono text-xs text-foreground">angkorgate_refresh_token</code>, and{" "}
            <code className="font-mono text-xs text-foreground">angkorgate_user</code>) to maintain
            authenticated sessions and protect against CSRF attacks. We do not use third-party
            advertising or cross-site tracking cookies.
          </p>
        </>
      ),
    },
    {
      id: "data-sharing",
      title: "Data Sharing & OIDC Consent",
      content: (
        <>
          <p>
            We do not sell or rent your personal information. Your identity claims (such as user
            ID, email, name, and roles) are shared only with:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Authorized client applications you sign into via OAuth 2.0 / OpenID Connect, limited
              to the scopes configured for those applications.
            </li>
            <li>
              Authorized system administrators of <strong className="text-foreground">{org}</strong>{" "}
              for account support, access governance, and security auditing.
            </li>
            <li>
              Legal authorities when required by valid legal process or to protect system integrity.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "security-and-retention",
      title: "Security & Data Retention",
      content: (
        <>
          <p>
            Credentials, OAuth client secrets, and session tokens are protected using industry-standard
            cryptographic hashing, signed JWTs (RS256/JWKS), and HTTP-only cookies. Account and
            audit records are retained only as long as necessary to provide access, maintain
            security audit trails, and satisfy organizational or legal retention requirements.
          </p>
        </>
      ),
    },
    {
      id: "your-rights",
      title: "Your Privacy Rights",
      content: (
        <>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, export, or
            request deletion of your personal data, as well as the right to unlink social identity
            providers or revoke passkeys and active sessions. Many of these actions can be
            performed directly in your <strong className="text-foreground">/account</strong> portal,
            or by contacting <strong className="text-foreground">{contact}</strong>.
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalDocumentLayout
      kind="privacy"
      title="Privacy Policy"
      subtitle={`How ${appName} collects, processes, and safeguards authentication, passkey, and session data.`}
      effectiveDate="November 26, 2026"
      appName={appName}
      logoUrl={branding.logoUrl}
      organizationName={branding.organizationName}
      supportEmail={branding.supportEmail}
      footerText={branding.footerText}
      sections={sections}
    />
  )
}
