const base = (process.argv[2] ?? 'http://localhost:4188').replace(/\/$/, '')
const origin = new URL(base).origin

function decode(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(html, tag, name, value, attribute) {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi')) ?? []
  const match = tags.find((candidate) =>
    new RegExp(`${name}=["']${value}["']`, 'i').test(candidate),
  )
  return match?.match(new RegExp(`${attribute}=["']([^"']*)["']`, 'i'))?.[1]
}

function pathFor(href) {
  try {
    const url = new URL(href, origin)
    if (url.origin !== origin && url.origin !== 'https://www.untilfire.com') return null
    return url.pathname.replace(/\/$/, '') || '/'
  } catch {
    return null
  }
}

async function main() {
  const sitemap = await fetch(`${base}/sitemap.xml`).then((response) => response.text())
  const productionUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
  const paths = productionUrls.map((value) => new URL(value).pathname)
  const records = []
  let cursor = 0

  async function worker() {
    while (cursor < paths.length) {
      const path = paths[cursor++]
      const response = await fetch(`${base}${path}`, {
        headers: { 'user-agent': 'Googlebot' },
        redirect: 'follow',
      })
      const html = await response.text()
      const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1])
      const description = decode(attr(html, 'meta', 'name', 'description', 'content'))
      const canonical = attr(html, 'link', 'rel', 'canonical', 'href')
      const robots = attr(html, 'meta', 'name', 'robots', 'content') ?? ''
      const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => decode(match[1]))
      const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
        .map((match) => pathFor(match[1]))
        .filter(Boolean)

      records.push({
        path,
        status: response.status,
        title,
        titleLength: title.length,
        description,
        descriptionLength: description.length,
        canonical,
        robots,
        h1: headings,
        links: [...new Set(links)],
        internalStateKeys: [...html.matchAll(/>([A-Z]{2})_US</g)].map((match) => match[0].slice(1, -1)),
      })
    }
  }

  await Promise.all(Array.from({ length: 12 }, worker))
  records.sort((a, b) => a.path.localeCompare(b.path))

  const inbound = new Map(paths.map((path) => [path.replace(/\/$/, '') || '/', 0]))
  for (const record of records) {
    for (const link of record.links) {
      if (link !== record.path && inbound.has(link)) inbound.set(link, (inbound.get(link) ?? 0) + 1)
    }
  }

  const duplicates = (field) => {
    const groups = new Map()
    for (const record of records) {
      const value = record[field]
      if (!value) continue
      groups.set(value, [...(groups.get(value) ?? []), record.path])
    }
    return [...groups.entries()]
      .filter(([, values]) => values.length > 1)
      .map(([value, values]) => ({ value, paths: values }))
  }

  const issues = {
    badStatus: records.filter((record) => record.status !== 200).map((record) => ({ path: record.path, status: record.status })),
    missingTitle: records.filter((record) => !record.title).map((record) => record.path),
    missingDescription: records.filter((record) => !record.description).map((record) => record.path),
    missingCanonical: records.filter((record) => !record.canonical).map((record) => record.path),
    unexpectedNoindex: records.filter((record) => /noindex/i.test(record.robots)).map((record) => record.path),
    h1Count: records.filter((record) => record.h1.length !== 1).map((record) => ({ path: record.path, h1: record.h1 })),
    internalStateKeys: records.filter((record) => record.internalStateKeys.length > 0).map((record) => ({ path: record.path, values: record.internalStateKeys })),
    duplicateTitles: duplicates('title'),
    duplicateDescriptions: duplicates('description'),
    sparseInternalLinks: [...inbound.entries()]
      .filter(([path, count]) => path !== '/' && count < 2)
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([path, inboundLinks]) => ({ path, inboundLinks })),
    longTitles: records.filter((record) => record.titleLength > 65).map((record) => ({ path: record.path, length: record.titleLength, title: record.title })),
    longDescriptions: records.filter((record) => record.descriptionLength > 165).map((record) => ({ path: record.path, length: record.descriptionLength })),
  }

  console.log(JSON.stringify({ audited: records.length, issues }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
