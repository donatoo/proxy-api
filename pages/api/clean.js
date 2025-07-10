// pages/api/clean.js
import fetch from 'node-fetch';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);

    // Remove <script> tags that are ad-related
    $('script').each((_, el) => {
      const scriptSrc = $(el).attr('src') || '';
      const scriptContent = $(el).html() || '';

      const isAdScript = (
        // suspicious remote script (starts with // or http(s))
        scriptSrc.includes('brigadebookstore') ||
        scriptSrc.match(/^https?:\/\/.*(ads|analytics|track|click|pop|banner|monetize|brigade|push)/i) ||
        scriptSrc.match(/^\/\/.*(ads|track|pop|click|banner)/i) ||

        // suspicious inline script using obfuscated Next.js injection
        scriptContent.includes('self.__next_f.push') &&
        scriptContent.match(/initiallybrigade|ads|track|banner/i)
      );

      if (isAdScript) {
        $(el).remove();
      }
    });

    // Optional: rewrite relative URLs (if needed)
    const ATTRS = ['src', 'href', 'content', 'data-src'];
    ATTRS.forEach(attr => {
      $(`[${attr}]`).each((_, el) => {
        const val = $(el).attr(attr);
        if (val && val.startsWith('/')) {
          $(el).attr(attr, baseUrl.origin + val);
        }
      });
    });

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send($.html());
  } catch (err) {
    console.error('Error processing:', err);
    return res.status(500).json({ error: 'Failed to process HTML' });
  }
}
