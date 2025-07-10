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

  const isFullUrl = url.startsWith('http');
  const isHtmlRequest = url.endsWith('.html') || !url.includes('.');

  try {
    if (!isFullUrl) {
      // It's a relative asset path (e.g. /v2/embed/movie/1137 or /v2/player.js)
      // Your frontend should construct: origin + url and call this again
      return res.status(200).json({
        type: 'asset',
        path: url,
        message: 'Relative path — let frontend reconstruct full URL using origin',
      });
    }

    const response = await fetch(url, { headers: HEADERS });
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (contentType.includes('text/html')) {
      const html = await response.text();
      const $ = cheerio.load(html);

      // Rewrite asset URLs to go through clean again
      $('script[src], link[href], img[src], iframe[src]').each((_, el) => {
        const attr = el.name === 'link' ? 'href' : 'src';
        const original = $(el).attr(attr);
        if (original && !original.startsWith('data:') && !original.startsWith('http')) {
          $(el).attr(attr, `/api/clean?url=${original}`);
        }
      });

      return res.status(200).send($.html());
    }

    // If it's not HTML (like .js, .png, etc.), just return the raw buffer
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).send('Failed to proxy content');
  }
}
