import clientPromise from '../lib/mongodb';

const BASE_URL = 'https://virgala-store.vercel.app';

export async function getServerSideProps({ res }) {
  const client = await clientPromise;
  const db = client.db('virgala');
  const plugins = await db.collection('plugins').find({}).project({ _id: 1 }).toArray();

  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/portfolio', changefreq: 'monthly', priority: '0.8' },
    { loc: '/subscribe', changefreq: 'monthly', priority: '0.8' },
    { loc: '/deplugin', changefreq: 'monthly', priority: '0.7' },
  ];

  const pluginUrls = plugins.map(p => ({
    loc: `/product/${p._id}`,
    changefreq: 'monthly',
    priority: '0.6',
  }));

  const allUrls = [...staticPages, ...pluginUrls];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    url => `  <url>
    <loc>${BASE_URL}${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return { props: {} };
}

// Default component required by Next.js (won't be rendered because getServerSideProps sends response)
export default function Sitemap() {
  return null;
}