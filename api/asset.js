const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export default async function handler(req, res) {
  const assetUrl = req.query.url;
  if (!assetUrl) return res.status(400).send('Missing asset URL');

  try {
    const proxyRes = await fetch(assetUrl, { headers: HEADERS });
    const contentType = proxyRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const buffer = await proxyRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(404).send('Not found');
  }
}
