"use client";

import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col overflow-x-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,163,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,255,0.022) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Centered content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        {/* 404 number */}
        <div
          className="text-[clamp(6rem,25vw,12rem)] font-black leading-none mb-4 select-none"
          style={{
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 60px rgba(0,120,255,0.35))",
          }}
        >
          404
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
          Page Not Found
        </h1>
        <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-md leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <button
          onClick={() => router.push("/")}
          className="px-10 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.04] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #0055EE 0%, #00A3FF 100%)",
            boxShadow: "0 0 48px rgba(0,120,255,0.4)",
          }}
        >
          Go Back Home →
        </button>

        <p className="text-slate-600 text-sm mt-8">
          Or{" "}
          <button
            onClick={() => router.back()}
            className="text-[#00A3FF] hover:underline"
          >
            go back
          </button>{" "}
          to the previous page.
        </p>
      </main>

      <Footer />
    </div>
  );
}
