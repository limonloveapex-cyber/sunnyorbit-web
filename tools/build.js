#!/usr/bin/env node
/*
 * Builds sunnyorbit.com: the SunnyOrbit company pages at the root, then the
 * Pooled product site under /pooled/ (which has its own build, run from here).
 *
 *   node tools/build.js
 *   SITE_ORIGIN=https://sunnyorbit.com node tools/build.js
 *
 * No dependencies and no package.json. Pages are assembled from src/: a shell,
 * a nav and a footer that exist once, and a body per page. The output is
 * committed, because GitHub Pages serves the repo as it stands.
 *
 * Template tokens:
 *   {{icon:name}}        inline lucide icon from src/icons (24px)
 *   {{icon:name:18}}     ... at 18px
 *   {{pooled-icon:72}}   the Pooled app icon ("Wallet Evolved") at 72px
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');

/* The one place the live domain is written down. While it is empty the build
   is a preview: every page is noindex, robots.txt disallows everything, and no
   canonical tag or sitemap is written. Setting it turns all of that on at once,
   so a launch cannot half-happen. */
const ORIGIN = (process.env.SITE_ORIGIN || '').replace(/\/+$/, '');

const read = (...p) => fs.readFileSync(path.join(src, ...p), 'utf8');
const partials = Object.fromEntries(
  fs.readdirSync(path.join(src, 'partials'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [path.basename(f, '.html'), read('partials', f)]),
);

/* Icons are inlined rather than loaded from a CDN: a site whose products
   promise not to watch people should not hand every visitor's IP to an icon
   host either. The licence comment is kept once, in src/icons, not in every
   page. */
function icon(name, size = 24) {
  const file = path.join(src, 'icons', `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`unknown icon: ${name}`);
  return fs.readFileSync(file, 'utf8')
    .replace(/<!--.*?-->\s*/s, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/class="[^"]*"/, `class="i i-${name}"`)
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ')
    .trim();
}

/* Pooled's "Wallet Evolved" mark, from the 320 grid in the app repo's
   dist/pencil/brand/WALLET-EVOLVED-SPEC.md. Radius scales with the tile the
   way the design's 40/72/120 tiles do (72 on the 320 grid). */
let gradientN = 0;
function pooledIcon(size) {
  const id = `pg${gradientN++}`;
  return `<svg class="pooled-icon" width="${size}" height="${size}" viewBox="0 0 320 320" role="img" aria-label="Pooled app icon" focusable="false">`
    + `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2C22"/><stop offset="1" stop-color="#0D0E09"/></linearGradient></defs>`
    + `<rect width="320" height="320" rx="72" fill="url(#${id})"/>`
    + '<rect x="100" y="78" width="120" height="96" rx="22" fill="#C9BCFF"/>'
    + '<rect x="64" y="112" width="192" height="130" rx="34" fill="#CBF264"/>'
    + '<rect x="196" y="159" width="48" height="36" rx="12" fill="#1A1B16"/></svg>';
}

const expand = (html) => html
  .replace(/\{\{icon:([a-z0-9-]+)(?::(\d+))?\}\}/g, (w, n, s) => icon(n, s ? +s : 24))
  .replace(/\{\{pooled-icon:(\d+)\}\}/g, (w, s) => pooledIcon(+s));

const pages = {
  index: {
    title: 'SunnyOrbit — Apps built for everyday life',
    desc: 'SunnyOrbit builds small, focused mobile apps for everyday life. The first is Pooled, a shared money tracker for Android.',
    nav: 'home',
  },
  apps: {
    title: 'Apps — SunnyOrbit',
    desc: 'The apps SunnyOrbit has built, and what every one of them has in common.',
    nav: 'apps',
  },
  about: {
    title: 'About — SunnyOrbit',
    desc: 'SunnyOrbit is a small independent studio run by Moiasun LLC. What we believe, and where we stand today.',
    nav: 'about',
  },
  'how-we-build': {
    title: 'How we build — SunnyOrbit',
    desc: 'Fewer features, chosen carefully. How SunnyOrbit decides what to build, and what not to.',
    nav: 'how',
  },
  contact: {
    title: 'Contact — SunnyOrbit',
    desc: 'Talk to the people who build SunnyOrbit apps. Help with Pooled, privacy requests, ideas and press.',
    nav: 'contact',
  },
  privacy: {
    title: 'Privacy Policy — SunnyOrbit',
    desc: 'How Moiasun LLC, trading as SunnyOrbit, handles personal information on this website and across its apps.',
    nav: null,
  },
  terms: {
    title: 'Terms of Service — SunnyOrbit',
    desc: 'The terms for using sunnyorbit.com and SunnyOrbit apps, published by Moiasun LLC.',
    nav: null,
  },
  cookies: {
    title: 'Cookie Policy — SunnyOrbit',
    desc: 'This website sets no cookies and stores nothing in your browser. Here is exactly what that means.',
    nav: null,
  },
  404: {
    title: 'Page not found — SunnyOrbit',
    desc: 'That page is not here.',
    nav: null,
    rooted: true,
  },
};

/* Current page marked in the nav at build time, so it survives with
   JavaScript off. */
const markNav = (html, current) =>
  html.replace(/data-nav="([a-z]+)"/g, (w, k) => (k === current ? 'aria-current="page"' : ''));

const url = (name) => `${ORIGIN}/${name === 'index' ? '' : `${name}.html`}`;

let built = 0;
for (const [name, meta] of Object.entries(pages)) {
  const pageCss = fs.existsSync(path.join(root, 'assets/css/pages', `${name}.css`))
    ? `<link rel="stylesheet" href="assets/css/pages/${name}.css">` : '';

  const head = ORIGIN && !meta.rooted
    ? `<link rel="canonical" href="${url(name)}">\n<meta property="og:url" content="${url(name)}">\n`
      + `<meta property="og:image" content="${ORIGIN}/assets/img/og.png">`
    : '<meta name="robots" content="noindex, nofollow">';

  let html = partials.shell
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{desc}}', meta.desc)
    .replaceAll('{{head}}', head)
    .replaceAll('{{pagecss}}', pageCss)
    .replaceAll('{{page}}', name)
    .replaceAll('{{nav}}', markNav(partials.nav, meta.nav))
    .replaceAll('{{footer}}', partials.footer)
    .replaceAll('{{body}}', read('pages', `${name}.html`))
    .replaceAll('{{year}}', String(new Date().getFullYear()));
  html = expand(html);

  /* GitHub Pages serves 404.html for a miss at any depth, so a request for
     /a/b/c gets this page with the browser still at /a/b/. Only root-absolute
     paths survive that. Scoped to this one page. */
  if (meta.rooted) {
    html = html
      .replace(/(href|src)="(assets|pooled)\//g, '$1="/$2/')
      .replace(/href="(index|apps|about|how-we-build|contact|privacy|terms|cookies)\.html/g,
        (w, p) => (p === 'index' ? 'href="/' : `href="/${p}.html`));
  }

  const left = html.match(/\{\{[a-z:0-9-]+\}\}/g);
  if (left) {
    console.error(`  ${name}.html: unreplaced ${[...new Set(left)].join(', ')}`);
    process.exitCode = 1;
  }
  fs.writeFileSync(path.join(root, `${name}.html`), html);
  built++;
  console.log(`  ${name}.html  ${(html.length / 1024).toFixed(1)}kb`);
}

/* The Pooled site keeps its own build and its own look. Same SITE_ORIGIN,
   with /pooled appended, so its canonical tags point at the right place. */
execFileSync(process.execPath, [path.join(root, 'pooled/tools/build.js')], {
  stdio: 'inherit',
  env: { ...process.env, SITE_ORIGIN: ORIGIN ? `${ORIGIN}/pooled` : '' },
});

const robots = ORIGIN
  ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${ORIGIN}/sitemap.xml`]
  : ['# Preview build with no domain attached yet. Everything is disallowed so',
    '# the github.io preview is not indexed ahead of the real domain.',
    'User-agent: *', 'Disallow: /'];
fs.writeFileSync(path.join(root, 'robots.txt'), robots.join('\n') + '\n');

if (ORIGIN) {
  const today = new Date().toISOString().slice(0, 10);
  const pooledPages = ['', 'how-it-works.html', 'features.html', 'faq.html',
    'privacy.html', 'terms.html', 'delete-account.html'];
  const locs = [
    ...Object.keys(pages).filter((n) => !pages[n].rooted).map(url),
    ...pooledPages.map((p) => `${ORIGIN}/pooled/${p}`),
  ];
  fs.writeFileSync(path.join(root, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + locs.map((l) => `  <url><loc>${l}</loc><lastmod>${today}</lastmod></url>`).join('\n')
    + '\n</urlset>\n');
} else {
  fs.rmSync(path.join(root, 'sitemap.xml'), { force: true });
}

console.log(`${built} SunnyOrbit pages built${ORIGIN ? ` for ${ORIGIN}` : ' (preview: noindex, no canonical, no sitemap)'}.`);
