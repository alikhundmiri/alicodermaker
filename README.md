# alicodermaker

Ali Khundmiri's personal site — https://www.alicodermaker.com

Hosted on Cloudflare (Worker `alicodermaker`, personal account). Built with Astro.

## Writing a post
- Easiest: open https://www.alicodermaker.com/admin, write, untick **Draft**, Save.
- Or add a Markdown file to `src/content/posts/` (see `hello-cloudflare.md`).
  The file name becomes the URL: `my-post.md` → `/my-post`.

## Layout
- `public/` — the original hand-written pages, images, `_redirects`. Served as-is.
- `src/pages/index.astro` — homepage (new posts are listed automatically).
- `src/layouts/Post.astro` — template for new posts.
- `worker/index.js` — redirects mixed-case URLs to lowercase.

## Publishing
Every push to `master` (including saves from /admin) is built and deployed automatically by Cloudflare Workers Builds (`npm run build` → `npx wrangler deploy`). Build logs: Cloudflare dashboard → Workers → alicodermaker → Deployments.

## Run / deploy by hand
    npm install
    npm run dev                     # local preview
    XDG_CONFIG_HOME=~/.config/wrangler-personal npm run deploy
