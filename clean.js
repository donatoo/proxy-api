import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function stripAds(html, baseUrl) {
  const $ = cheerio.load(html);

  // Remove ad-related or obfuscated Cloudflare scripts
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

  // Remove hidden iframes often used for bot detection
  $('iframe').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (style.includes('visibility:hidden') || style.includes('display:none')) {
      $(el).remove();
    }
  });

  // Convert all asset links (src and href) to absolute and route via proxy
  $('[src], [href]').each((_, el) => {
    const attr = el.attribs.src ? 'src' : 'href';
    const original = $(el).attr(attr);
    if (!original || original.startsWith('data:')) return;

    try {
      const resolved = new URL(original, baseUrl).href;
      const proxied = `/asset?url=${encodeURIComponent(resolved)}`;
      $(el).attr(attr, proxied);
    } catch (e) {
      // Ignore invalid URLs
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
    res.status(200).send(cleaned);
  } catch (err) {
    console.error('CLEAN ERROR:', err);
    res.status(500).send('Failed to fetch or clean page.');
  }
}
