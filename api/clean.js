import * as cheerio from 'cheerio'; // ✅ FIXED
import { URL } from 'url';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function stripAds(html, baseUrl) {
  const $ = cheerio.load(html);

  $('script').each((_, el) => {
    const src = $(el).attr('src');
    const inner = $(el).html();
    if (
      (src && src.includes('/cdn-cgi/')) ||
      (src && src.includes('cloudflareinsights.com')) ||
      (inner && inner.includes('__CF$cv$params')) ||
      (inner && inner.length > 1000 && inner.includes('split("'))
    ) {
      $(el).remove();
    }
  });

  $('iframe').each((_, el) => {
    if ($(el).attr('style')?.includes('visibility:hidden')) {
      $(el).remove();
    }
  });

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
