import { MetadataRoute } from 'next'
import { cityLandingPages } from '@/lib/city-pages'
import { CITIES, isUS } from '@/lib/fire-data'
import { statePages } from '@/lib/state-pages'
import { rankingPagesList } from '@/lib/ranking-pages'
import { regionSlugs } from '@/lib/regions'
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
      url: siteUrl('/fire-number/best-states'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
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

  const HIGH_PRIORITY_LEARN_SLUGS = new Set([
    'what-is-fire-financial-independence-retire-early',
    'what-is-the-4-percent-rule',
    'how-much-money-do-i-need-to-retire',
    'compound-interest-and-fire',
    'why-savings-rate-matters-more-than-income',
    'index-funds-101-what-to-invest-in',
    'roth-ira-vs-401k-for-fire',
    'sequence-of-returns-risk',
    'coast-fire-vs-full-fire',
    'barista-fire',
  ])

  const articleRoutes: MetadataRoute.Sitemap = learnArticles.map((article) => ({
    url: siteUrl(`/learn/${article.slug}`),
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: HIGH_PRIORITY_LEARN_SLUGS.has(article.slug) ? 0.75 : 0.65,
  }))

  const stageRoutes: MetadataRoute.Sitemap = learnStages.map((stage) => ({
    url: siteUrl(`/learn/stages/${stage.id}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
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

  const regionRoutes: MetadataRoute.Sitemap = regionSlugs.map((slug) => ({
    url: siteUrl(`/fire-number/regions/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...baseRoutes, ...articleRoutes, ...stageRoutes, ...curatedCityRoutes, ...usCityRoutes, ...stateRoutes, ...rankingRoutes, ...regionRoutes]
}
