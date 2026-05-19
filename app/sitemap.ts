import { MetadataRoute } from 'next'
import { cityLandingPages } from '@/lib/city-pages'
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
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const stageRoutes: MetadataRoute.Sitemap = learnStages.map((stage) => ({
    url: siteUrl(`/learn/stages/${stage.id}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.65,
  }))

  const cityRoutes: MetadataRoute.Sitemap = cityLandingPages.map((page) => ({
    url: siteUrl(`/fire-number/${page.slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  return [...baseRoutes, ...articleRoutes, ...stageRoutes, ...cityRoutes]
}
