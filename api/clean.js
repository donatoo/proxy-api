import * as cheerio from 'cheerio';
import { URL } from 'url';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function stripAds(html, baseUrl) {
  const $ = cheerio.load(html);

  // Only remove known Cloudflare/tracker scripts, keep functional JS
  $('script').each((_, el) => {
    const src = $(el).attr('src') || '';
    const inner = $(el).html() || '';
    if (
      src.includes('/cdn-cgi/') ||
      src.includes('cloudflareinsights.com') ||
      inner.includes('__CF$cv$params')
    ) {
      $(el).remove();
    }
  });

  // Do not remove iframes — some video players use them
  // Optionally, you can filter specific bad ones if needed

  // Proxy static assets
  $('link[href], script[src], img[src]').each((_, el) => {
    const attr = el.name === 'link' ? 'href' : 'src';
    const original = $(el).attr(attr);
    if (original && !original.startsWith('data:')) {
      const newUrl = new URL(original, baseUrl).href;
      $(el).attr(attr, `/api/asset?url=${encodeURIComponent(newUrl)}`);
    }
  });

  return $.html();
}

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');

  try {
    const response = await fetch(target, { headers: HEADERS });
    const html = await response.text();
    const cleaned = stripAds(html, target);
    res.setHeader('Content-Type', 'text/html');
    res.send(cleaned);
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Failed to fetch or clean page.');
  }
}
