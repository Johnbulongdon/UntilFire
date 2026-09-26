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
      {
        // Austin's curated guide uses the state-qualified route. Keep the
        // shorter legacy route as a single permanent hop so both URLs do not
        // compete for the same city intent.
        source: '/fire-number/austin',
        destination: '/fire-number/austin-tx',
        permanent: true,
      },
      // These states had no display name (Hawaii's was filed under the wrong
      // code), so their state pages were published at their state codes.
      {
        source: '/fire-number/states/de_us',
        destination: '/fire-number/states/delaware',
        permanent: true,
      },
      {
        source: '/fire-number/states/hi',
        destination: '/fire-number/states/hawaii',
        permanent: true,
      },
      {
        source: '/fire-number/states/ky',
        destination: '/fire-number/states/kentucky',
        permanent: true,
      },
      {
        source: '/fire-number/states/sd',
        destination: '/fire-number/states/southdakota',
        permanent: true,
      },
      {
        source: '/fire-number/states/wv',
        destination: '/fire-number/states/westvirginia',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
