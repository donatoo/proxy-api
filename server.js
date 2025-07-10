// server.js - Strip Ads & Bypass Cloudflare Challenge Proxy

const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

function stripAds(html, baseUrl) {
  const $ = cheerio.load(html);

  // Remove Cloudflare obfuscated script tags
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

  // Remove hidden iframe that injects challenge script
  $('iframe').each((_, el) => {
    if ($(el).attr('style')?.includes('visibility:hidden')) {
      $(el).remove();
    }
  });

  // Rewrite static asset URLs to go through proxy
  $('link[href], script[src], img[src]').each((_, el) => {
    const attr = el.name === 'link' ? 'href' : 'src';
    const original = $(el).attr(attr);
    if (original && !original.startsWith('data:')) {
      const newUrl = new URL(original, baseUrl).href;
      $(el).attr(attr, `/asset?url=${encodeURIComponent(newUrl)}`);
    }
  });

  return $.html();
}

app.get('/clean', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing URL');

  try {
    const response = await fetch(target, { headers: HEADERS });
    const html = await response.text();
    const cleaned = stripAds(html, target);
    res.send(cleaned);
  } catch (err) {
    console.error('ERROR:', err);
    res.status(500).send('Failed to fetch or clean page.');
  }
});

// Serve static assets like JS, CSS, Images
app.get('/asset', async (req, res) => {
  const assetUrl = req.query.url;
  if (!assetUrl) return res.status(400).send('Missing asset URL');

  try {
    const proxyRes = await fetch(assetUrl, { headers: HEADERS });
    res.set('Content-Type', proxyRes.headers.get('content-type'));
    proxyRes.body.pipe(res);
  } catch (err) {
    res.status(404).send('Not found');
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}/clean?url=<target_url>`);
});
