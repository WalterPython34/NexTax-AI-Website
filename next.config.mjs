/** @type {import('next').NextConfig} */
// v2
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'nextax.ai', '*.vercel.app']
    },
    serverComponentsExternalPackages: [
      "@sparticuz/chromium-min",
      "puppeteer-core",
    ],
  },
  // Tell Vercel to include the Chromium binary in the deployment bundle
  outputFileTracingIncludes: {
    "/api/pulse/pdf": [
      "./node_modules/@sparticuz/chromium-min/**/*",
    ],
    "/api/pulse/linkedin": [
      "./node_modules/@sparticuz/chromium-min/**/*",
    ],
  },
  images: {
    domains: ['nextax.ai', 'vercel.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
export default nextConfig
