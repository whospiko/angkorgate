import { Metadata } from "next"
import { getBranding } from "@/features/system"
import { LegalDocumentLayout, type LegalSection } from "@/components/legal-document-layout"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Terms of Service | AngkorGate IAM",
  description: "Open-source Terms of Service governing access to AngkorGate Identity & Access Management.",
}

export default async function TermsOfServicePage() {
  const branding = await getBranding()
  const appName = branding.appName || "AngkorGate"
  const org = branding.organizationName || `${appName} Maintainers`
  const contact = branding.supportEmail || "the instance administrator"

  const sections: LegalSection[] = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      content: (
        <>
          <p>
            By creating an account, authenticating, or otherwise accessing this{" "}
            <strong className="text-foreground">{appName}</strong> Identity &amp; Access
            Management (IAM) instance operated by <strong className="text-foreground">{org}</strong>,
            you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our{" "}
            Privacy Policy. If you are accessing this service on behalf of an organization, you
            represent that you have authority to bind that organization to these Terms.
          </p>
        </>
      ),
    },
    {
      id: "open-source-license",
      title: "Open-Source Software & Deployment Model",
      content: (
        <>
          <p>
            <strong className="text-foreground">{appName}</strong> is built on open-source
            identity and access management software. Your right to inspect, modify, or self-host
            the underlying source code is governed by the applicable open-source license distributed
            with the project repository.
          </p>
          <p>
            Each <strong className="text-foreground">{appName}</strong> deployment is operated
            independently by its instance administrator (<strong className="text-foreground">{org}</strong>).
            The upstream open-source contributors and maintainers do not operate third-party
            self-hosted instances and assume no responsibility for how individual operators
            configure, host, or govern their deployments.
          </p>
        </>
      ),
    },
    {
      id: "accounts-and-credentials",
      title: "Accounts, Passkeys & Connected Identities",
      content: (
        <>
          <p>
            Authentication may be performed using a password, WebAuthn/FIDO2 Passkey (biometrics
            or hardware security key), or an enabled third-party OAuth / social identity provider
            (such as Google, GitHub, Discord, Microsoft, or Telegram).
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              You are responsible for safeguarding your credentials, passkey devices, and active
              sessions, and for promptly revoking compromised devices or reporting unauthorized
              access to <strong className="text-foreground">{contact}</strong>.
            </li>
            <li>
              You must provide accurate account information and must not impersonate another
              person or misrepresent your affiliation.
            </li>
            <li>
              Administrators may assign, modify, or revoke roles and permissions (including Admin
              Console access) at any time in accordance with organizational security policy.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use & Prohibited Conduct",
      content: (
        <>
          <p>You agree not to misuse the authentication service or connected client applications. Specifically, you must not:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Attempt to bypass authentication, role-based access controls (RBAC), OAuth/OIDC
              consent checks, rate limits, or session protections.
            </li>
            <li>
              Probe, scan, or test the vulnerability of this instance without explicit written
              authorization from <strong className="text-foreground">{org}</strong>.
            </li>
            <li>
              Forge tokens, replay intercepted authorization codes/tickets, or use automated
              credential-stuffing or brute-force tools against login endpoints.
            </li>
            <li>
              Use the platform to distribute malware, conduct phishing, or violate applicable laws.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "oidc-client-apps",
      title: "Connected Client Applications (OAuth 2.0 / OIDC)",
      content: (
        <>
          <p>
            When you use <strong className="text-foreground">{appName}</strong> to sign into
            third-party or internal client applications via OAuth 2.0 / OpenID Connect, your use of
            each client application is also subject to that application&apos;s own terms and
            privacy practices. Only authorize client applications you trust with the requested
            scopes.
          </p>
        </>
      ),
    },
    {
      id: "availability-and-termination",
      title: "Service Availability, Suspension & Termination",
      content: (
        <>
          <p>
            The instance operator may suspend, restrict, or terminate your account or active
            sessions if you violate these Terms, pose a security risk, or if required by law or
            organizational policy. You may request account deactivation or deletion by contacting{" "}
            <strong className="text-foreground">{contact}</strong>.
          </p>
        </>
      ),
    },
    {
      id: "disclaimer-and-liability",
      title: "Disclaimer of Warranties & Limitation of Liability",
      content: (
        <>
          <p className="uppercase font-mono text-xs text-foreground/90">
            To the maximum extent permitted by applicable law, this open-source software and
            service are provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;, without
            warranties of any kind, whether express, implied, or statutory, including implied
            warranties of merchantability, fitness for a particular purpose, title, and
            non-infringement.
          </p>
          <p>
            In no event shall the upstream open-source authors, contributors, or{" "}
            <strong className="text-foreground">{org}</strong> be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of data, profits,
            or revenue arising from your use of or inability to use the service.
          </p>
        </>
      ),
    },
    {
      id: "changes-and-contact",
      title: "Changes to Terms & Contact",
      content: (
        <>
          <p>
            We may update these Terms from time to time to reflect operational, legal, or security
            updates. Continued use of <strong className="text-foreground">{appName}</strong> after
            updated Terms are posted constitutes acceptance of the revised Terms. For questions,
            contact <strong className="text-foreground">{contact}</strong>.
          </p>
        </>
      ),
    },
  ]

  return (
    <LegalDocumentLayout
      kind="terms"
      title="Terms of Service"
      subtitle={`Governing access to ${appName} authentication, single sign-on (SSO), passkeys, and account management services.`}
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
