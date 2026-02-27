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

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm">Last updated: February 2026</p>
        </div>

        {/* Intro */}
        <div
          className="rounded-xl px-6 py-5 mb-10"
          style={{ background: "rgba(0,163,255,0.06)", border: "1px solid rgba(0,163,255,0.15)" }}
        >
          <p className="text-slate-300 text-sm leading-relaxed">
            Clipt (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, store, and protect your information when you use the
            Clipt platform at cliptapp.com.
          </p>
        </div>

        {/* Sections */}
        <div
          className="rounded-2xl p-8 sm:p-12"
          style={{ background: "#0A1628", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Section title="1. Information We Collect">
            <p>We collect the following categories of information:</p>
            <p className="font-semibold text-slate-300 mt-2">Personal Information</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>First and last name</li>
              <li>Email address</li>
              <li>School or team name</li>
              <li>Sport and position</li>
              <li>Jersey number</li>
              <li>Graduation year</li>
              <li>Height, weight, and GPA (optional, entered by you)</li>
              <li>Coach name and email (optional, entered by you)</li>
            </ul>
            <p className="font-semibold text-slate-300 mt-3">Uploaded Content</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Video files you upload or link to via YouTube</li>
              <li>Generated highlight reels and clips</li>
            </ul>
            <p className="font-semibold text-slate-300 mt-3">Usage Data</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pages visited and actions taken on the platform</li>
              <li>Browser type and operating system</li>
              <li>IP address and approximate location</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Building and delivering your highlight reels</li>
              <li>Sending email notifications about your processing jobs</li>
              <li>Responding to support requests and contact form submissions</li>
              <li>Improving the Clipt platform and user experience</li>
              <li>Sending waitlist and product launch emails (when opted in)</li>
              <li>Preventing abuse and maintaining platform security</li>
            </ul>
            <p>
              We do not sell your personal information to third parties. We do not use your data for
              advertising purposes.
            </p>
          </Section>

          <Section title="3. Data Storage">
            <p>
              Your personal information (name, email, sport, jersey number, stats) is stored securely
              in our database provided by Supabase, a cloud database platform with enterprise-grade
              security.
            </p>
            <p>
              Video files you upload are processed to create your highlight reel. We do not permanently
              store raw uploaded video files beyond what is needed to process your reel. Generated
              highlight reels may be stored temporarily to allow downloads.
            </p>
            <p>
              We retain your account data and processing history for up to 12 months to allow you to
              access past reels and results.
            </p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>We use the following third-party services to operate Clipt:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <span className="text-white font-semibold">Supabase</span> — database and backend
                infrastructure. Stores athlete profiles and processing jobs.
              </li>
              <li>
                <span className="text-white font-semibold">Vercel</span> — hosting and deployment
                platform. Serves the Clipt web application.
              </li>
              <li>
                <span className="text-white font-semibold">Google Video Intelligence</span> — AI
                video analysis for the AI processing feature. Video content may be processed by
                Google&apos;s cloud infrastructure.
              </li>
              <li>
                <span className="text-white font-semibold">Resend</span> — email delivery service.
                Used to send processing completion and notification emails.
              </li>
            </ul>
            <p>
              Each of these providers has their own privacy policies and data handling practices.
              We encourage you to review them.
            </p>
          </Section>

          <Section title="5. Cookies and Local Storage">
            <p>
              Clipt uses browser localStorage to save your reel preferences and in-progress work
              between sessions. We do not use third-party tracking cookies. No advertising cookies are
              placed on your device.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <p>You have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <span className="text-white font-semibold">Access</span> — request a copy of the
                data we hold about you
              </li>
              <li>
                <span className="text-white font-semibold">Deletion</span> — request that we delete
                your account and associated data
              </li>
              <li>
                <span className="text-white font-semibold">Correction</span> — request that we
                correct inaccurate data
              </li>
              <li>
                <span className="text-white font-semibold">Opt-out</span> — unsubscribe from
                marketing emails at any time using the link in any email we send
              </li>
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@cliptapp.com" className="text-[#00A3FF] hover:underline">
                support@cliptapp.com
              </a>
              . We will respond within 30 days.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p>
              Clipt is designed for student athletes. We do not knowingly collect personal information
              from children under the age of 13 without parental consent. If you are under 13, please
              have a parent or guardian complete the registration process.
            </p>
          </Section>

          <Section title="8. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page with an updated date. Your continued use
              of Clipt after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              If you have questions about this Privacy Policy or how we handle your data, contact us
              at:
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
