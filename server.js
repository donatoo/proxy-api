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
    const response = await fetch(targetUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove all <script> and <iframe> tags (example of stripping ads)
    $('script').remove();
    $('iframe').remove();

    res.send($.html());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch or process page', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running at http://localhost:${PORT}/clean?url=<target_url>`);
});
