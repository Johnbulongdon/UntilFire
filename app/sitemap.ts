import { MetadataRoute } from 'next'
import { cityLandingPages } from '@/lib/city-pages'
import { CITIES, isUS } from '@/lib/fire-data'
import { countryPages } from '@/lib/country-pages'
import { statePages } from '@/lib/state-pages'
import { rankingPagesList } from '@/lib/ranking-pages'
import { regionSlugs } from '@/lib/regions'
import { learnArticles, learnStages } from '@/lib/learn'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: siteUrl('/fire-calculator'),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: siteUrl('/calculators'),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // /calculators/apy and /calculators/compound-interest are deliberately
    // absent: both are noindex. A sitemap entry is a request to index, so
    // listing a noindex page asks Google for the opposite of what the page
    // says and wastes the crawl budget the request was meant to save.
    {
      url: siteUrl('/calculators/savings-rate'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/coast-fire'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/net-worth-by-age'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/calculators/4-percent-rule'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: siteUrl('/explore'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/fire-number'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: siteUrl('/fire-number/best-states'),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: siteUrl('/learn'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/learn/articles'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/learn/topics'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ]

  const articleRoutes: MetadataRoute.Sitemap = learnArticles.map((article) => ({
    url: siteUrl(`/learn/${article.slug}`),
    // Article metadata already records the truthful publication/review date.
    // Do not replace it with the sitemap request time: that makes unchanged
    // content look newly edited every time Google fetches this file.
    lastModified: new Date(article.updatedAt ?? article.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }))

  const stageRoutes: MetadataRoute.Sitemap = learnStages.map((stage) => ({
    url: siteUrl(`/learn/stages/${stage.id}`),
    changeFrequency: 'weekly',
    priority: 0.65,
  }))

  const curatedCitySlugs = new Set(cityLandingPages.map((page) => page.slug))
  const curatedCityKeys = new Set(cityLandingPages.map((page) => page.city.key))

  const curatedCityRoutes: MetadataRoute.Sitemap = cityLandingPages.map((page) => ({
    url: siteUrl(`/fire-number/${page.slug}`),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))

  const usCityRoutes: MetadataRoute.Sitemap = CITIES
    .filter((city) => isUS(city.state) && !curatedCitySlugs.has(city.key) && !curatedCityKeys.has(city.key))
    .map((city) => ({
      url: siteUrl(`/fire-number/${city.key}`),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))

  const countryRoutes: MetadataRoute.Sitemap = countryPages.map((page) => ({
    url: siteUrl(`/fire-number/countries/${page.slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const stateRoutes: MetadataRoute.Sitemap = statePages.map((page) => ({
    url: siteUrl(`/fire-number/states/${page.slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const rankingRoutes: MetadataRoute.Sitemap = rankingPagesList.map((page) => ({
    url: siteUrl(`/fire-number/${page.slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const regionRoutes: MetadataRoute.Sitemap = regionSlugs.map((slug) => ({
    url: siteUrl(`/fire-number/regions/${slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...baseRoutes, ...articleRoutes, ...stageRoutes, ...curatedCityRoutes, ...usCityRoutes, ...countryRoutes, ...stateRoutes, ...rankingRoutes, ...regionRoutes]
}
