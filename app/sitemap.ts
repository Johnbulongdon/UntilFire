import { MetadataRoute } from 'next'
import { cityLandingPages } from '@/lib/city-pages'
import { CITIES, isUS } from '@/lib/fire-data'
import { learnArticles, learnStages } from '@/lib/learn'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: 'https://www.untilfire.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://www.untilfire.com/calculators',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://www.untilfire.com/calculators/apy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/calculators/compound-interest',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/calculators/savings-rate',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/calculators/coast-fire',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/calculators/4-percent-rule',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/fire-number',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://www.untilfire.com/learn',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://www.untilfire.com/learn/articles',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://www.untilfire.com/learn/topics',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  const articleRoutes: MetadataRoute.Sitemap = learnArticles.map((article) => ({
    url: `https://www.untilfire.com/learn/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const stageRoutes: MetadataRoute.Sitemap = learnStages.map((stage) => ({
    url: `https://www.untilfire.com/learn/stages/${stage.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.65,
  }))

  const curatedCityRoutes: MetadataRoute.Sitemap = cityLandingPages.map((page) => ({
    url: `https://www.untilfire.com/fire-number/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const usCityRoutes: MetadataRoute.Sitemap = CITIES.filter((city) => isUS(city.state)).map((city) => ({
    url: `https://www.untilfire.com/fire-number/${city.key}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))

  return [...baseRoutes, ...articleRoutes, ...stageRoutes, ...curatedCityRoutes, ...usCityRoutes]
}
