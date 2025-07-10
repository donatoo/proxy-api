import fetch from 'node-fetch';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing asset URL');

  try {
    const response = await fetch(url, { headers: HEADERS });
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    response.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching asset');
  }
}
