#!/usr/bin/env node
/*
 * Builds sunnyorbitapps.com: the SunnyOrbit company pages at the root, then the
 * Pooled product site under /pooled/ (which has its own build, run from here).
 *
 *   node tools/build.js
 *   SITE_ORIGIN=https://sunnyorbitapps.com node tools/build.js
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

/* Titles and descriptions are written for search results, not just the tab:
   what the page is, in the words someone would search, then the brand.
   Titles stay under ~60 characters and descriptions under ~155 so Google
   shows them whole. `type` is the schema.org page type for the structured
   data below; `crumb` is the page's name in the breadcrumb trail. */
const pages = {
  index: {
    title: 'SunnyOrbit — Simple Mobile Apps for Everyday Life',
    desc: 'SunnyOrbit is an independent studio making simple, private mobile apps for everyday life. Our first app is Pooled, a shared expense tracker for Android.',
    nav: 'home',
    type: 'WebPage',
  },
  apps: {
    title: 'Our Apps — Simple, Private Mobile Apps | SunnyOrbit',
    desc: 'The apps SunnyOrbit has built and is building, starting with Pooled, a free shared expense tracker for Android. No ads, no tracking, no clutter.',
    nav: 'apps',
    type: 'CollectionPage',
    crumb: 'Apps',
  },
  about: {
    title: 'About SunnyOrbit — An Independent App Studio',
    desc: 'SunnyOrbit is an independent studio run by Moiasun LLC, a Delaware company, building small mobile apps that respect your time and your privacy.',
    nav: 'about',
    type: 'AboutPage',
    crumb: 'About',
  },
  'how-we-build': {
    title: 'How We Build — Fewer Features, Chosen Carefully | SunnyOrbit',
    desc: 'How SunnyOrbit decides what goes into an app and what stays out: notice a real problem, build the smallest honest fix, check every claim, then listen.',
    nav: 'how',
    type: 'WebPage',
    crumb: 'How we build',
  },
  contact: {
    title: 'Contact SunnyOrbit — Support, Privacy and Press',
    desc: 'Email the people who build SunnyOrbit apps: help with Pooled, privacy and data requests, bug reports, ideas and press. A person reads every message.',
    nav: 'contact',
    type: 'ContactPage',
    crumb: 'Contact',
  },
  privacy: {
    title: 'Privacy Policy | SunnyOrbit (Moiasun LLC)',
    desc: 'How Moiasun LLC, trading as SunnyOrbit, handles personal information on this website and in email, and where each app’s own privacy policy lives.',
    nav: null,
    type: 'WebPage',
    crumb: 'Privacy Policy',
  },
  terms: {
    title: 'Terms of Service | SunnyOrbit (Moiasun LLC)',
    desc: 'The terms for using sunnyorbitapps.com and SunnyOrbit apps, published by Moiasun LLC, a Delaware limited liability company.',
    nav: null,
    type: 'WebPage',
    crumb: 'Terms of Service',
  },
  cookies: {
    title: 'Cookie Policy — No Cookies, No Tracking | SunnyOrbit',
    desc: 'sunnyorbitapps.com sets no cookies, runs no analytics and stores nothing in your browser. Here is exactly what that means, and how to check.',
    nav: null,
    type: 'WebPage',
    crumb: 'Cookie Policy',
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

/* Clean URLs (/about, not /about.html): GitHub Pages serves both, and the
   clean form is what the Pooled app and the Play Console use, so it is the
   one search engines are told is canonical. */
const url = (name) => `${ORIGIN}/${name === 'index' ? '' : name}`;

/* Structured data (schema.org JSON-LD). One Organization and one WebSite,
   referenced by @id from every page, so search engines read the site as one
   connected graph: Moiasun LLC, trading as SunnyOrbit, publishes this site and
   the Pooled app. Every property here is a fact stated elsewhere on the site —
   no ratings, no review counts, no download numbers, because none exist yet.
   The Pooled app itself is described on the Pooled site (pooled/tools/build.js)
   and referenced here by its @id. */
const ORG = () => ({
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'SunnyOrbit',
  legalName: 'Moiasun LLC',
  alternateName: 'Moiasun LLC',
  url: `${ORIGIN}/`,
  logo: {
    '@type': 'ImageObject',
    url: `${ORIGIN}/assets/img/sunnyorbit-512.png`,
    width: 512,
    height: 512,
  },
  email: 'support@sunnyorbitapps.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '16192 Coastal Highway',
    addressLocality: 'Lewes',
    addressRegion: 'DE',
    postalCode: '19958',
    addressCountry: 'US',
  },
  description: 'An independent studio making simple, private mobile apps for everyday life.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@sunnyorbitapps.com',
    availableLanguage: 'English',
  },
  owns: { '@id': `${ORIGIN}/pooled/#app` },
});

function structuredData(name, meta) {
  const page = {
    '@type': meta.type || 'WebPage',
    '@id': `${url(name)}#webpage`,
    url: url(name),
    name: meta.title,
    description: meta.desc,
    inLanguage: 'en',
    isPartOf: { '@id': `${ORIGIN}/#website` },
    publisher: { '@id': `${ORIGIN}/#organization` },
  };
  if (name === 'index') page.about = { '@id': `${ORIGIN}/#organization` };
  if (name === 'apps') page.mainEntity = { '@id': `${ORIGIN}/pooled/#app` };
  const graph = [
    ORG(),
    {
      '@type': 'WebSite',
      '@id': `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: 'SunnyOrbit',
      inLanguage: 'en',
      publisher: { '@id': `${ORIGIN}/#organization` },
    },
    page,
  ];
  if (meta.crumb) {
    page.breadcrumb = { '@id': `${url(name)}#breadcrumb` };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url(name)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'SunnyOrbit', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: meta.crumb, item: url(name) },
      ],
    });
  }
  /* "</" is escaped so no string inside the JSON can ever close the script. */
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1)
    .replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

let built = 0;
for (const [name, meta] of Object.entries(pages)) {
  const pageCss = fs.existsSync(path.join(root, 'assets/css/pages', `${name}.css`))
    ? `<link rel="stylesheet" href="assets/css/pages/${name}.css">` : '';

  const head = ORIGIN && !meta.rooted
    ? [
      `<link rel="canonical" href="${url(name)}">`,
      `<meta property="og:url" content="${url(name)}">`,
      `<meta property="og:image" content="${ORIGIN}/assets/img/og.png">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:image:alt" content="SunnyOrbit — Apps built for everyday life">',
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${meta.title}">`,
      `<meta name="twitter:description" content="${meta.desc}">`,
      `<meta name="twitter:image" content="${ORIGIN}/assets/img/og.png">`,
      structuredData(name, meta),
    ].join('\n')
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
  const pooledPages = ['', 'how-it-works', 'features', 'faq',
    'privacy', 'terms', 'delete-account'];
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
