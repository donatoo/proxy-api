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
  const baseHost = new URL(baseUrl).hostname;

  // Remove obfuscated ad scripts
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

  // Remove hidden iframe injectors
  $('iframe').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (style.includes('visibility:hidden') || style.includes('display:none')) {
      $(el).remove();
    }
  });

  // Rewrite static asset URLs to proxy
  $('link[href], script[src], img[src]').each((_, el) => {
    const attr = el.name === 'link' ? 'href' : 'src';
    const original = $(el).attr(attr);
    if (!original || original.startsWith('data:')) return;

    try {
      const resolved = new URL(original, baseUrl).href;
      const ext = resolved.split('.').pop().split('?')[0].toLowerCase();
      const assetExtensions = ['js', 'css', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'woff', 'woff2', 'ttf'];

      const isAsset = assetExtensions.includes(ext);
      const isOwnHost = new URL(resolved).hostname === baseHost;

      if (isAsset && !resolved.includes('proxy-apis.vercel.app')) {
        $(el).attr(attr, `/api/asset?url=${encodeURIComponent(resolved)}`);
      } else {
        // Leave original for embeds or non-assets
        $(el).attr(attr, resolved);
      }
    } catch (e) {
      // Invalid URL – skip
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
