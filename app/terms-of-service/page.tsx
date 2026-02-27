"use client";

import Footer from "@/components/Footer";

// ── Section component ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-black text-white mb-4">{title}</h2>
      <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.018) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-20">
        {/* Header */}
        <div className="mb-14">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-5"
            style={{
              background: "rgba(0,163,255,0.1)",
              border: "1px solid rgba(0,163,255,0.25)",
              color: "#00A3FF",
            }}
          >
            Legal
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight">
            Terms of Service
          </h1>
          <p className="text-slate-500 text-sm">Last updated: February 2026</p>
        </div>

        {/* Intro */}
        <div
          className="rounded-xl px-6 py-5 mb-10"
          style={{ background: "rgba(0,163,255,0.06)", border: "1px solid rgba(0,163,255,0.15)" }}
        >
          <p className="text-slate-300 text-sm leading-relaxed">
            These Terms of Service govern your use of the Clipt platform at cliptapp.com. By using
            Clipt, you agree to these terms. Please read them carefully.
          </p>
        </div>

        {/* Sections */}
        <div
          className="rounded-2xl p-8 sm:p-12"
          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Clipt, you agree to be bound by these Terms of Service. If you do
              not agree to these terms, please do not use the platform. We may update these terms from
              time to time. Continued use of the platform after changes means you accept the updated
              terms.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Clipt is a web-based platform that helps student athletes create professional highlight
              reels from their sports footage. The service includes:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Video upload and clip organization tools</li>
              <li>Reel customization with title cards, music, and transitions</li>
              <li>Reel export in landscape and portrait formats</li>
              <li>
                AI-powered highlight detection from full game film (coming soon, available to waitlist
                members first)
              </li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of the service at
              any time with reasonable notice.
            </p>
          </Section>

          <Section title="3. User Accounts and Eligibility">
            <p>
              You must be at least 13 years old to use Clipt. If you are under 18, you represent
              that your parent or legal guardian has reviewed and agreed to these terms on your behalf.
            </p>
            <p>
              You are responsible for maintaining the security of any account credentials and for all
              activities that occur under your account. You agree to provide accurate information when
              using the platform.
            </p>
          </Section>

          <Section title="4. User Content">
            <p>
              <span className="text-white font-semibold">You own your content.</span> Athletes retain
              full ownership of all video clips, images, and other content they upload to Clipt. By
              uploading content, you grant Clipt a limited, non-exclusive license to process, store,
              and display your content solely for the purpose of delivering the service to you.
            </p>
            <p>
              You represent that you have the right to upload the content you submit, and that it does
              not violate any third-party rights (including copyright) or any applicable laws.
            </p>
            <p>
              We may remove content that violates these terms or that we determine, in our sole
              discretion, is harmful to other users or the platform.
            </p>
          </Section>

          <Section title="5. Prohibited Uses">
            <p>You agree not to use Clipt to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Upload content you do not have rights to use</li>
              <li>Post content that is abusive, threatening, defamatory, or otherwise harmful</li>
              <li>Attempt to gain unauthorized access to other accounts or platform systems</li>
              <li>Use the platform to send spam or unsolicited communications</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the platform</li>
              <li>Use automated tools to scrape or access the platform in bulk without permission</li>
              <li>Use the service for any illegal purpose</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The Clipt brand, logo, design, and underlying software are owned by Clipt and protected
              by applicable intellectual property laws. You may not use our trademarks, trade names,
              or branding without our prior written consent.
            </p>
            <p>
              Any feedback or suggestions you provide about Clipt may be used by us to improve the
              service without any obligation to you.
            </p>
          </Section>

          <Section title="7. Disclaimer of Warranties">
            <p>
              Clipt is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
              express or implied. We do not warrant that the platform will be uninterrupted, error-free,
              or free of viruses or other harmful components.
            </p>
            <p>
              We do not guarantee that your reel will result in any recruiting outcomes, athletic
              opportunities, or coach responses. Clipt is a tool to help you present your abilities —
              results depend on many factors outside our control.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Clipt and its team shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your use
              of the platform.
            </p>
            <p>
              Our total liability to you for any claims arising from your use of Clipt shall not exceed
              the amount you have paid to us in the twelve months preceding the claim (if any). Clipt
              is currently free to use, so this amount is $0.
            </p>
          </Section>

          <Section title="9. Privacy">
            <p>
              Your use of Clipt is also governed by our{" "}
              <a href="/privacy-policy" className="text-[#00A3FF] hover:underline">
                Privacy Policy
              </a>
              , which is incorporated into these Terms of Service by reference.
            </p>
          </Section>

          <Section title="10. Changes to Terms">
            <p>
              We may update these Terms of Service at any time. We will post the updated terms on this
              page with a revised &quot;Last updated&quot; date. For significant changes, we may also notify
              you by email. Your continued use of Clipt after such changes constitutes your acceptance
              of the new terms.
            </p>
          </Section>

          <Section title="11. Termination">
            <p>
              We reserve the right to terminate or suspend your access to Clipt at any time, with or
              without notice, for conduct that we determine violates these terms or is harmful to other
              users, the platform, or us. You may stop using the platform at any time.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              If you have questions about these Terms of Service, contact us at:
            </p>
            <div
              className="mt-3 px-5 py-4 rounded-xl"
              style={{ background: "rgba(0,163,255,0.05)", border: "1px solid rgba(0,163,255,0.15)" }}
            >
              <p className="text-white font-semibold">Clipt</p>
              <a href="mailto:support@cliptapp.com" className="text-[#00A3FF] hover:underline text-sm">
                support@cliptapp.com
              </a>
            </div>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
