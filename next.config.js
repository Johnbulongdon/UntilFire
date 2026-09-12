/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        // Mail clients load the email's webfonts from a different origin than
        // the message itself; without this some refuse the request and fall
        // back silently. Fonts are public static assets, so * is safe here.
        source: '/fonts/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
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
