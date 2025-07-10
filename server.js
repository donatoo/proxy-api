const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/clean', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Validate URL
    const url = new URL(targetUrl);

    const response = await fetch(url.href);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove common ad elements
    $('script').remove();
    $('iframe').remove();
    $('[class*="ad"]').remove();
    $('[id*="ad"]').remove();

    res.send($.html());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or clean page', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}/clean?url=<target_url>`);
});
