import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Arivix collects and uses personal data.",
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      description="Last updated: April 4, 2026"
    >
      <p>
        This Privacy Policy explains how Arivix (&quot;we&quot;, &quot;us&quot;)
        collects, uses, shares, and protects information when you visit
        arivix.org, use our Discord bot or related integrations, or otherwise
        interact with our services (the &quot;Service&quot;). By using the
        Service, you acknowledge the practices described here.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The Service is operated in connection with the Arivix Project and the
        arivix.org website. For privacy requests, contact{" "}
        <a href="mailto:support@arivix.org" className="text-foreground underline">
          support@arivix.org
        </a>
        . If you need a formal legal entity name, registered address, or EU/UK
        representative for compliance, confirm those details with counsel and
        publish them in this section.
      </p>

      <h2>2. Information we collect</h2>
      <p>Depending on how you use the Service, we may process:</p>
      <ul>
        <li>
          <strong className="text-foreground">Account and profile data:</strong>{" "}
          When you sign in with Discord, we receive identifiers Discord provides
          (such as user ID, username, avatar, and, if your app configuration
          requests it, email). We store account records needed to maintain your
          session and link your profile to purchases.
        </li>
        <li>
          <strong className="text-foreground">Guild / server metadata:</strong>{" "}
          For features like the dashboard, we may request and cache information
          about Discord servers your account can manage (for example, server IDs,
          names, icons, and permission-related flags) as returned by
          Discord&apos;s APIs.
        </li>
        <li>
          <strong className="text-foreground">Billing data:</strong> If you
          purchase Arivix Pro, Stripe processes payment details. We store Stripe
          customer identifiers and purchase-related status—not full payment card
          numbers (Stripe holds those).
        </li>
        <li>
          <strong className="text-foreground">Technical and security data:</strong>{" "}
          Standard server logs, IP address, device/browser type, timestamps, and
          similar diagnostics used to secure and operate the Service.
        </li>
        <li>
          <strong className="text-foreground">Analytics:</strong> If{" "}
          <code>NEXT_PUBLIC_PLAUSIBLE_DOMAIN</code> is configured, we load
          Plausible Analytics to understand traffic in a privacy-oriented way.
          See plausible.io for how their product handles data.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <p>We use information to:</p>
      <ul>
        <li>Provide, operate, and improve the Service;</li>
        <li>Authenticate users and personalize the dashboard;</li>
        <li>Process payments and record Pro access;</li>
        <li>Detect, prevent, and respond to fraud, abuse, and security issues;</li>
        <li>Comply with legal obligations and enforce our terms;</li>
        <li>Communicate with you about the Service where appropriate.</li>
      </ul>

      <h2>4. Legal bases (EEA/UK visitors)</h2>
      <p>
        If the GDPR or UK GDPR applies, we rely on one or more of:{" "}
        <strong className="text-foreground">contract</strong> (providing the
        Service you request), <strong className="text-foreground">
          legitimate interests
        </strong>{" "}
        (security, product improvement, analytics balanced against your rights),{" "}
        <strong className="text-foreground">legal obligation</strong>, and where
        required <strong className="text-foreground">consent</strong> (for example,
        certain cookies or marketing, if offered). You may withdraw consent where
        processing is consent-based.
      </p>

      <h2>5. How we share information</h2>
      <p>
        We share information with service providers who process it on our
        instructions, including:
      </p>
      <ul>
        <li>Discord (authentication and API data);</li>
        <li>Stripe (payments and billing portal);</li>
        <li>Hosting and infrastructure providers;</li>
        <li>Plausible Analytics, if enabled.</li>
      </ul>
      <p>
        We may also disclose information if required by law, to protect rights and
        safety, or in connection with a merger, acquisition, or asset sale (with
        notice where required).
      </p>

      <h2>6. International transfers</h2>
      <p>
        We and our subprocessors may process data in countries other than where
        you live. Where required, we use appropriate safeguards (such as Standard
        Contractual Clauses) for transfers from the EEA, UK, or Switzerland.
        Details can be provided on request where applicable.
      </p>

      <h2>7. Retention</h2>
      <p>
        We retain personal information for as long as necessary to fulfill the
        purposes in this Policy, including legal, accounting, and security
        requirements. When data is no longer needed, we delete or anonymize it in
        line with our practices, subject to legal holds.
      </p>

      <h2>8. Your rights and choices</h2>
      <p>
        Depending on your location, you may have rights to access, correct,
        delete, restrict, or object to certain processing, and to data
        portability. You may also lodge a complaint with a supervisory authority.
        To exercise rights, contact us using the footer support channel. We may
        need to verify your request.
      </p>

      <h2>9. California residents (CPRA summary)</h2>
      <p>
        California consumers may have additional rights under the CPRA, including
        to know categories of personal information collected, to delete certain
        information, to correct inaccuracies, and to opt out of certain
        &quot;sale&quot; or &quot;sharing&quot; (we do not sell personal
        information for money; adjust this sentence if your practices change).
        Authorized agents may submit requests as permitted by law.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is not directed to children under 13 (or the minimum age
        required in your jurisdiction). We do not knowingly collect personal
        information from children. If you believe we have, contact us and we will
        take appropriate steps to delete it.
      </p>

      <h2>11. Security</h2>
      <p>
        We implement technical and organizational measures designed to protect
        personal information. No method of transmission or storage is completely
        secure; we cannot guarantee absolute security.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. We will post the revised
        version here and update the &quot;Last updated&quot; date. For material
        changes, we will provide additional notice where appropriate.
      </p>

      <h2>13. Contact</h2>
      <p>
        For privacy-related requests, contact us using the support email or link
        in the site footer.
      </p>

      <Card
        padding="md"
        className="!mt-8 border-warning-border bg-warning-muted text-sm text-warning-foreground"
      >
        <strong className="text-warning-foreground">Important:</strong> This is
        not legal advice. The Policy is detailed starter text for a
        Discord-related web app with Stripe billing—it must be reviewed by
        qualified counsel for GDPR, CPRA, cookie/consent requirements,
        subprocessors list, DPA needs, and any bot-specific data processing
        before high-traffic or regulated use.
      </Card>
    </PageShell>
  );
}
