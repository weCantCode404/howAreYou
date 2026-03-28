/** @type {import('next').NextConfig} */
const backendUrl = process.env.BACKEND_URL || "https://howareyou-backend.onrender.com";

const nextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
