import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UntilFire — Know When You Can Stop Working',
    short_name: 'UntilFire',
    description: 'Find your FIRE number and freedom date in 60 seconds. Free, no login required.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080e',
    theme_color: '#08080e',
    icons: [
      {
        src: '/logo/horizon-color.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
