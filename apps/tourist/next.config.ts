import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network access during development (e.g. phone on same WiFi)
  allowedDevOrigins: ["192.168.1.100", "192.168.0.0/16", "10.0.0.0/8"],

  images: {
    qualities: [68, 75, 85, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
