import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: '*/*',
};

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) return res.status(400).send('Missing url');

  const isRelative = url.startsWith('/');

  // If it's just a path (e.g. /v2/player.js), let your frontend reconstruct full URL
  const fetchUrl = isRelative
    ? req.headers['x-original-host'] // optional, if you capture it client-side
      ? `https://${req.headers['x-original-host']}${url}`
      : null // your frontend will reconstruct it
    : url;

  try {
    if (!fetchUrl && isRelative) {
      return res.status(400).send('Cannot resolve relative URL without original domain');
    }

    const response = await fetch(fetchUrl, { headers: HEADERS });
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      const html = await response.text();
      const $ = cheerio.load(html);

      $('script[src], link[href], img[src], iframe[src]').each((_, el) => {
        const attr = el.name === 'link' ? 'href' : 'src';
        const original = $(el).attr(attr);
        if (original && !original.startsWith('data:')) {
          // Don't touch full URLs like http:// or https://
          if (!original.startsWith('http')) {
            $(el).attr(attr, `/api/clean?url=${original}`);
          }
        }
      });

      return res.status(200).send($.html());
    }

    // For images, JS, etc.
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).send('Failed to proxy content');
  }
}
