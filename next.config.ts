import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep Prisma out of the serverless bundle so it reads runtime env correctly
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Turbopack root setting — ensures Next infers the correct workspace root
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
