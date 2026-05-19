/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async redirects() {
    return [
      {
        source: '/fire-calculator',
        destination: '/calculators/4-percent-rule',
        permanent: true,
      },
      {
        source: '/fire-number-calculator',
        destination: '/calculators/4-percent-rule',
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
