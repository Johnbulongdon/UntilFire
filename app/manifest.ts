import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UntilFire — Know When You Can Stop Working',
    short_name: 'UntilFire',
    description: 'Find your FIRE number and freedom date in 60 seconds. Free, no login required.',
    start_url: '/?source=pwa',
    id: '/?source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080e',
    theme_color: '#08080e',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo/horizon-color.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
