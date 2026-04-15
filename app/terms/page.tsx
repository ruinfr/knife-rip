import { PageShell } from "@/components/page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of Arivix and arivix.org.",
};

export default function TermsPage() {
  return (
    <PageShell
      title="Terms of Service"
      description="Last updated: April 4, 2026"
    >
      <p>
        These Terms of Service (&quot;Terms&quot;) govern access to and use of
        Arivix (&quot;Arivix&quot;, &quot;we&quot;, &quot;us&quot;, or
        &quot;our&quot;), including the website at arivix.org, related APIs, and
        the Discord bot and integrations we offer (collectively, the
        &quot;Service&quot;). By accessing or using the Service, you agree to be
        bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Eligibility and accounts</h2>
      <p>
        You must be old enough to enter a binding contract where you live (and
        at least consistent with Discord&apos;s minimum age requirements) to
        use the Service. If you use the Service on behalf of an organization,
        you represent that you have authority to bind that organization. You may
        authenticate using Discord. You are responsible for safeguarding your
        credentials and for all activity under your account. You must comply with
        Discord&apos;s Terms of Service and Community Guidelines when using the
        Service with Discord.
      </p>

      <h2>2. The Service</h2>
      <p>
        Arivix provides software and related services for Discord communities.
        Features, limits, availability, and documentation may change during
        development or after launch. We may modify, suspend, or discontinue any
        part of the Service with reasonable notice where practicable, or
        immediately if needed for security, legal compliance, or abuse
        prevention.
      </p>

      <h2>3. Payments</h2>
      <p>
        Arivix Pro, where offered, is a one-time purchase processed by Stripe.
        Pricing, taxes, and refunds are governed by the terms presented at
        checkout and Stripe&apos;s terms. You can view receipts through the
        billing tools we provide. Chargebacks or payment disputes may result in
        suspension or loss of paid features where permitted by law and our
        policies.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Violate applicable law or third-party rights;</li>
        <li>
          Use the Service to harass, threaten, dox, spam, or distribute malware;
        </li>
        <li>
          Attempt to probe, scan, or test the vulnerability of the Service, or
          bypass security or access controls;
        </li>
        <li>
          Reverse engineer, decompile, or disassemble the Service except where
          prohibited by law;
        </li>
        <li>
          Use the Service in a way that materially harms Discord, other users,
          or our infrastructure.
        </li>
      </ul>
      <p>
        We may investigate and suspend or terminate access for violations or
        suspected abuse.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The Service, including its software, branding, and content (excluding
        content you or third parties provide), is owned by Arivix or its licensors
        and is protected by intellectual property laws. Subject to these Terms,
        we grant you a limited, non-exclusive, non-transferable, revocable
        license to use the Service for its intended purpose. You retain rights in
        content you submit; you grant us a license to host, process, and display
        such content only as needed to operate the Service.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        The Service relies on third parties such as Discord and Stripe. Their
        terms and privacy practices apply to your use of their platforms. We are
        not responsible for third-party services.
      </p>

      <h2>7. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
        INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT
        PERMITTED BY LAW.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL ARIVIX OR ITS
        SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
        GOODWILL, ARISING FROM OR RELATED TO THE SERVICE OR THESE TERMS, EVEN IF
        ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR
        CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE OR THESE TERMS WILL NOT
        EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE
        TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY U.S. DOLLARS (USD $50), EXCEPT
        WHERE LIABILITY CANNOT BE LIMITED UNDER APPLICABLE LAW.
      </p>

      <h2>9. Indemnity</h2>
      <p>
        You will defend, indemnify, and hold harmless Arivix and its affiliates,
        officers, and agents from claims, damages, losses, and expenses
        (including reasonable attorneys&apos; fees) arising from your use of the
        Service, your content, or your violation of these Terms, except to the
        extent caused by our willful misconduct.
      </p>

      <h2>10. Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        your access if you materially breach these Terms or if we must do so
        under law. Provisions that by their nature should survive (including
        intellectual property, disclaimers, limitation of liability, indemnity,
        and governing law) will survive termination.
      </p>

      <h2>11. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the{" "}
        <strong className="text-foreground">United States</strong> and the{" "}
        <strong className="text-foreground">State of Delaware</strong>, without
        regard to conflict-of-law rules. Subject to mandatory consumer
        protections where you live, you agree that exclusive jurisdiction and
        venue for any dispute arising from these Terms or the Service lies in
        the state or federal courts located in Delaware. If you believe a
        provision is unenforceable where you reside, the remainder of these Terms
        still applies to the fullest extent permitted by law.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms from time to time. We will post the updated
        Terms on this page and update the &quot;Last updated&quot; date. If
        changes are material, we will provide additional notice where reasonable
        (for example, by email or a notice on the Service). Continued use after the
        effective date constitutes acceptance of the revised Terms.
      </p>

      <h2>13. Contact</h2>
      <p>
        For questions about these Terms, email{" "}
        <a href="mailto:support@arivix.org" className="text-foreground underline">
          support@arivix.org
        </a>
        .
      </p>
    </PageShell>
  );
}
