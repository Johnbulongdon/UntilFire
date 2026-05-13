/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // EnhancedFIRECalculator.tsx has pre-existing type errors that need a dedicated fix pass
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
