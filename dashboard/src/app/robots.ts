import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://argus-qa-orchestrator.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/crawler', '/registry', '/settings', '/api', '/_next'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
