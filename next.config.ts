import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack root setting — ensures Next infers the correct workspace root
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
