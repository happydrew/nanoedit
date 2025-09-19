/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://nanoedit.art',
  generateRobotsTxt: true, // (optional)
  // exclude: ['/admin/*', '/api/*', '/private/*'],
  exclude: ['/api/*', '/console/*', '/auth/*', '/admin/*', '/*/*/console/*', '/*/*/auth/*', '/*/*/api/*', '/*/*/admin/*'],
  generateIndexSitemap: false,
  changefreq: 'daily',
  priority: 0.7,
  autoLastmod: true,

  // Manual paths for i18n support since Next.js uses [locale] dynamic routing
  additionalPaths: async (config) => {
    const paths = [
      '/',
      '/zh',
      '/privacy-policy',
      '/terms-of-service',
      '/zh/privacy-policy',
      '/zh/terms-of-service',
    ];

    return paths.map(path => ({
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: new Date().toISOString(),
    }));
  },

  // Alternate language support
  alternateRefs: [
    {
      href: process.env.SITE_URL || 'https://nanoedit.art',
      hreflang: 'en',
    },
    {
      href: `${process.env.SITE_URL || 'https://nanoedit.art'}/zh`,
      hreflang: 'zh',
    },
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: '*',
        disallow: ['/console/', '/api/', '/auth/', '/admin/'],
      },
    ],
    additionalSitemaps: [
      `${process.env.SITE_URL || 'https://nanoedit.art'}/sitemap.xml`,
    ],
  },
}