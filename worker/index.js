// Runs only when no static file matched. Mirrors Netlify's case-insensitive URLs:
// /Some-Page -> 301 -> /some-page. Everything else is a plain 404.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const lower = url.pathname.toLowerCase();
    if (lower !== url.pathname) {
      url.pathname = lower;
      return Response.redirect(url.toString(), 301);
    }
    return new Response("Not found", { status: 404 });
  },
};
