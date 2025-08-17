export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const url = new URL(req.url);
  let target;

  if (url.pathname === "/api/proxy" && url.searchParams.get("url")) {
    target = new URL(url.searchParams.get("url"));
  } else if (url.pathname.includes("proxy")) {
    target = new URL("https://hurricane.vidlvod.store" + url.pathname + url.search);
  } else {
    target = new URL("https://vidlink.pro" + url.pathname + url.search);
  }

  const headers = new Headers(req.headers);
  headers.delete("Host");

  const originalReferer = req.headers.get("referer") || "";

  if (url.pathname.includes("proxy")) {
    headers.set("Referer", "https://vidlink.pro/");
    headers.set("Origin", "https://vidlink.pro");
    headers.delete("Cookie");
  } else if (originalReferer.startsWith("https://vidjoy.jemaroctavo.workers.dev")) {
    headers.set("Referer", "https://vidlink.pro");
  } else {
    headers.set(
      "Referer",
      originalReferer.replace("https://vidjoy.jemaroctavo.workers.dev/?url=", "")
    );
  }

  const upstreamResp = await fetch(target.toString(), {
    method: req.method,
    headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    redirect: "follow",
  });

  const contentType = upstreamResp.headers.get("content-type") || "";
  const newHeaders = new Headers(upstreamResp.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  newHeaders.set("Access-Control-Allow-Credentials", "true");
  newHeaders.set("X-Frame-Options", "ALLOWALL");
  newHeaders.set("Content-Security-Policy", "frame-ancestors *");
  newHeaders.set("Content-Type", contentType);

  if (!contentType.includes("text/html") || url.pathname.includes("proxy")) {
    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: newHeaders,
    });
  }

  const html = await upstreamResp.text();
  const injectedScript = `<!-- your <script> injection goes here -->`;
  const finalHtml = html.replace(/<head[^>]*>/i, (m) => m + "\n" + injectedScript);

  return new Response(finalHtml, {
    status: upstreamResp.status,
    headers: newHeaders,
  });
}
