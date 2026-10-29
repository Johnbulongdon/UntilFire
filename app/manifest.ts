import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UntilFire — Know When You Can Stop Working',
    short_name: 'UntilFire',
    description: 'See beyond your balance. Open up your life. Free, no login required.',
    start_url: '/?source=pwa',
    id: '/?source=pwa',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#FFFFFF',
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
