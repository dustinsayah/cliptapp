import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
  serverExternalPackages: ["@supabase/supabase-js", "@google-cloud/video-intelligence"],
};

export default nextConfig;
