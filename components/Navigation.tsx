"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pages where the global nav should be hidden (they have their own step-based nav)
const HIDDEN_PATHS = ["/upload", "/customize", "/export", "/editor"];

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

interface NavLink {
  label: string;
  href: string;
  isAnchor?: boolean;
  anchorId?: string;
  badge?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Create Reel", href: "/start" },
  { label: "AI Processing", href: "/ai-processing", badge: "New" },
  { label: "How It Works", href: "/how-it-works", isAnchor: true, anchorId: "how-it-works" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Hide on workflow pages
  const hidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  // Detect scroll for shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  if (hidden) return null;

  const handleLinkClick = (link: NavLink) => {
    setMenuOpen(false);
    if (link.isAnchor) {
      // On homepage: scroll to the anchor section
      // On any other page: navigate to the page route
      if (pathname === "/" && link.anchorId) {
        document.getElementById(link.anchorId)?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push(link.href);
      }
    } else {
      router.push(link.href);
    }
  };

  const isActive = (link: NavLink) => {
    if (link.isAnchor && pathname === "/" ) return false;
    return pathname === link.href || pathname.startsWith(link.href + "/");
  };

  return (
    <>
      {/* ── Main nav bar ── */}
      <nav
        className="sticky top-0 z-50 w-full"
        style={{
          background: "rgba(5,10,20,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: scrolled
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(255,255,255,0.04)",
          transition: "border-color 0.2s",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-widest transition-opacity hover:opacity-80"
            style={{ color: "#00A3FF" }}
          >
            CLIPT
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                style={{
                  color: isActive(link) ? "#00A3FF" : "#94a3b8",
                  background: isActive(link) ? "rgba(0,163,255,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive(link))
                    (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
                }}
                onMouseLeave={(e) => {
                  if (!isActive(link))
                    (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                }}
              >
                {link.label === "AI Processing" && <SparkleIcon />}
                {link.label}
                {link.badge && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wide"
                    style={{
                      background: "rgba(0,163,255,0.18)",
                      color: "#00A3FF",
                      border: "1px solid rgba(0,163,255,0.3)",
                    }}
                  >
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => router.push("/start")}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
                boxShadow: "0 0 20px rgba(0,120,255,0.3)",
              }}
            >
              Build Your Reel →
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer overlay ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(5,10,20,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className="fixed top-16 right-0 bottom-0 z-50 md:hidden w-72 flex flex-col"
        style={{
          background: "#050A14",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="flex flex-col gap-1 p-5">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => handleLinkClick(link)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all text-left"
              style={{
                color: isActive(link) ? "#00A3FF" : "#94a3b8",
                background: isActive(link) ? "rgba(0,163,255,0.08)" : "transparent",
              }}
            >
              {link.label === "AI Processing" && <SparkleIcon />}
              <span>{link.label}</span>
              {link.badge && (
                <span
                  className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,163,255,0.18)",
                    color: "#00A3FF",
                    border: "1px solid rgba(0,163,255,0.3)",
                  }}
                >
                  {link.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="px-5 pt-4 border-t border-white/5">
          <button
            onClick={() => { setMenuOpen(false); router.push("/start"); }}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
              boxShadow: "0 0 20px rgba(0,120,255,0.25)",
            }}
          >
            Build Your Reel →
          </button>
        </div>

        <div className="mt-auto p-5">
          <p className="text-slate-600 text-xs">Your Game. Your Reel. Your Future.</p>
        </div>
      </div>
    </>
  );
}
