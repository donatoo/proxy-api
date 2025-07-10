import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf'];

function isStaticAsset(urlString) {
  try {
    const url = new URL(urlString);
    return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function stripAds(html, baseUrl) {
  const $ = cheerio.load(html);
  const baseHost = new URL(baseUrl).hostname;

  // Remove Cloudflare or suspicious scripts
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

  // Remove invisible iframes
  $('iframe').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (style.includes('visibility:hidden') || style.includes('display:none')) {
      $(el).remove();
    }
  });

  // Rewrite static asset URLs only (images, js, css)
  $('[src], [href]').each((_, el) => {
    const attr = el.attribs.src ? 'src' : 'href';
    const original = $(el).attr(attr);
    if (!original || original.startsWith('data:')) return;

    try {
      const resolved = new URL(original, baseUrl).href;
      const resolvedHost = new URL(resolved).hostname;

      if (
        isStaticAsset(resolved) &&
        resolvedHost !== 'proxy-apis.vercel.app' // prevent recursive
      ) {
        const proxied = `/api/asset?url=${encodeURIComponent(resolved)}`;
        $(el).attr(attr, proxied);
      } else {
        // Leave original full path (especially iframe, embeds)
        $(el).attr(attr, resolved);
      }
    } catch (e) {
      // invalid URL — skip
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
    console.error('ERROR:', err);
    res.status(500).send('Failed to fetch or clean page.');
  }
}
