import { MetadataRoute } from 'next'
import { cityLandingPages } from '@/lib/city-pages'
import { CITIES, isUS } from '@/lib/fire-data'
import { statePages } from '@/lib/state-pages'
import { rankingPagesList } from '@/lib/ranking-pages'
import { learnArticles, learnStages } from '@/lib/learn'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl(),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: siteUrl('/fire-calculator'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: siteUrl('/calculators'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: siteUrl('/calculators/apy'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/compound-interest'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/savings-rate'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/coast-fire'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/4-percent-rule'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/fire-number'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: siteUrl('/fire-number/fire-by-state'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: siteUrl('/learn'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/learn/articles'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/learn/topics'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  const articleRoutes: MetadataRoute.Sitemap = learnArticles.map((article) => ({
    url: siteUrl(`/learn/${article.slug}`),
    lastModified: new Date('2026-06-04'),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  const stageRoutes: MetadataRoute.Sitemap = learnStages.map((stage) => ({
    url: siteUrl(`/learn/stages/${stage.id}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.65,
  }))

  const curatedCitySlugs = new Set(cityLandingPages.map((page) => page.slug))

  const curatedCityRoutes: MetadataRoute.Sitemap = cityLandingPages.map((page) => ({
    url: siteUrl(`/fire-number/${page.slug}`),
    lastModified: new Date('2026-06-04'),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const usCityRoutes: MetadataRoute.Sitemap = CITIES
    .filter((city) => isUS(city.state) && !curatedCitySlugs.has(city.key))
    .map((city) => ({
      url: siteUrl(`/fire-number/${city.key}`),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))

  const stateRoutes: MetadataRoute.Sitemap = statePages.map((page) => ({
    url: siteUrl(`/fire-number/states/${page.slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const rankingRoutes: MetadataRoute.Sitemap = rankingPagesList.map((page) => ({
    url: siteUrl(`/fire-number/${page.slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...baseRoutes, ...articleRoutes, ...stageRoutes, ...curatedCityRoutes, ...usCityRoutes, ...stateRoutes, ...rankingRoutes]
}
