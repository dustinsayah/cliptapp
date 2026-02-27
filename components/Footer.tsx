"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-white/[0.06] px-6 pt-16 pb-8"
      style={{ background: "#050A14" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <span
              className="text-xl font-black tracking-widest block mb-3"
              style={{ color: "#00A3FF" }}
            >
              CLIPT
            </span>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Your Game. Your Reel. Your Future. AI-powered highlight reels for the next
              generation of athletes.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">
              Product
            </p>
            <ul className="flex flex-col gap-2.5">
              {(
                [
                  ["Create Reel", "/start"],
                  ["AI Processing", "/ai-processing"],
                  ["How It Works", "/how-it-works"],
                ] as [string, string][]
              ).map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-slate-500 text-sm hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">
              Support
            </p>
            <ul className="flex flex-col gap-2.5">
              {(
                [
                  ["FAQ", "/faq"],
                  ["My Reels", "/my-reels"],
                  ["Contact", "/contact"],
                ] as [string, string][]
              ).map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-slate-500 text-sm hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-black tracking-widest uppercase text-slate-400 mb-4">
              Legal
            </p>
            <ul className="flex flex-col gap-2.5">
              {(
                [
                  ["Privacy Policy", "/privacy-policy"],
                  ["Terms of Service", "/terms-of-service"],
                ] as [string, string][]
              ).map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-slate-500 text-sm hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-sm">&copy; 2026 Clipt. All rights reserved.</p>
          <p className="text-slate-600 text-sm">Made for athletes by athletes.</p>
        </div>
      </div>
    </footer>
  );
}
