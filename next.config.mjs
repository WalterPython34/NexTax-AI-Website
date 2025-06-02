/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable problematic features for now
  swcMinify: false,
  experimental: {
    esmExternals: false,
  },
}

export default nextConfig
