import { defineConfig } from 'astro/config';

// Static site. Legacy pages live in public/ and are copied as-is.
// New posts are Markdown in src/content/posts and render to /<slug>.
export default defineConfig({
  site: 'https://www.alicodermaker.com',
  output: 'static',
  build: { format: 'file' }, // /slug -> slug.html, same as the legacy pages
  trailingSlash: 'never',
});
