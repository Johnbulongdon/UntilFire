/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      {
        source: '/fire-number-calculator',
        destination: '/fire-calculator',
        permanent: true,
      },
      {
        source: '/coast-fire-calculator',
        destination: '/calculators/coast-fire',
        permanent: true,
      },
      {
        source: '/barista-fire-calculator',
        destination: '/learn/barista-fire',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
