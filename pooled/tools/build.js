#!/usr/bin/env node
/*
 * Assembles the six pages from src/ into plain HTML at the repo root.
 *
 * Why a build step at all, when the point is a no-framework static site: the
 * nav and the footer appear on every page, and six hand-maintained copies of
 * a nav is six chances for one of them to keep pointing at a page that moved.
 * This is the smallest thing that removes that risk — no dependencies, no
 * package.json, no node_modules. `node tools/build.js` and it is done.
 *
 * The OUTPUT is committed. GitHub Pages serves the repo as it stands, so the
 * site works whether or not anyone ever runs this again. Editing the built
 * HTML directly works too — it will just be overwritten the next time this
 * runs, so make the edit in src/.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');

/* The one place the live domain is written down. Empty until the domain is
   connected, and while it is empty the pages carry no canonical and no og:url
   — an absolute URL needs an origin, and a guessed one is worse than none.
   Set it, rebuild, and canonical/og:url/sitemap.xml all follow:
       SITE_ORIGIN=https://example.com node tools/build.js
   See README.md, "Connecting a domain". */
const ORIGIN = (process.env.SITE_ORIGIN || '').replace(/\/+$/, '');

const read = (...p) => fs.readFileSync(path.join(src, ...p), 'utf8');

const partials = Object.fromEntries(
  fs.readdirSync(path.join(src, 'partials'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [path.basename(f, '.html'), read('partials', f)])
);

/* Page metadata lives here rather than in each page's markup: the <title>,
   the meta description and the canonical path are the three things most
   likely to be copy-pasted between pages and then not updated. */
const pages = {
  'index': {
    out: 'index.html',
    nav: 'home',
    /* Not "expense splitter", and not "know who owes whom": the app does
       neither. See the FAQ entry "Does Pooled split a bill between people?" —
       a <title> is the one line most likely to be quoted back at you. */
    title: 'Pooled — Shared Money Tracker for Android',
    desc: 'Pooled is a free money tracker for Android. Track daily spending, share a space with roommates or family, and see what everyone has left. Works offline, no account needed.',
  },
  'how-it-works': {
    out: 'how-it-works.html',
    nav: 'how',
    title: 'How Pooled works — from the first tap to the whole month',
    desc: 'The whole flow, in four steps: add an expense on the keypad, keep personal and shared money apart, see where every member stands, and watch the month take shape.',
  },
  'features': {
    out: 'features.html',
    nav: 'features',
    title: 'Features — everything Pooled does with shared money',
    desc: 'Expense and income tracking, shared spaces with a balance per member, budgets, lent & borrowed, receipt photos, CSV and PDF export, app lock and four home-screen widgets.',
  },
  'faq': {
    out: 'faq.html',
    nav: 'faq',
    title: 'FAQ & Support — Pooled',
    desc: 'Answers about tracking money, shared spaces, budgets, lent & borrowed, exports and privacy in Pooled — plus how to reach the team that builds it.',
  },
  'privacy': {
    out: 'privacy.html',
    nav: null,
    title: 'Privacy Policy — Pooled',
    desc: 'What Pooled keeps on your phone, what it holds if you make an account, why it talks to no company but Google, and how to delete all of it.',
  },
  'terms': {
    out: 'terms.html',
    nav: null,
    title: 'Terms of Service — Pooled',
    desc: 'The terms for using Pooled, published by Moiasun LLC (SunnyOrbit): what may be shared in a space, reporting and blocking, and the rest.',
  },
  'delete-account': {
    out: 'delete-account.html',
    nav: null,
    /* Google Play requires a web page, separate from the app, where someone can
       ask for their account and data to be deleted. The app links here from
       its drawer ("Delete account (web)"). */
    title: 'Delete your Pooled account',
    desc: 'How to delete your Pooled account and its data, in the app or by email, and exactly what is removed and what stays.',
  },
};
/* No 404 here: the site is served under /pooled/ and the root 404.html (the
   SunnyOrbit one) answers for every missing path, this folder included. */

/* Marks the current page in the nav. Done here rather than with a script so
   it survives with JavaScript off, and so the link is a real <a> either way. */
function markNav(html, current) {
  return html.replace(/data-nav="([a-z]+)"/g, (whole, key) =>
    key === current ? 'aria-current="page"' : '');
}

let built = 0;
for (const [name, meta] of Object.entries(pages)) {
  const body = read('pages', `${name}.html`);

  /* Google treats /foo.html and /foo.html?x=1 as two pages without this, and
     og:url is what a link preview shows as the source. Both need an absolute
     URL, so both wait for ORIGIN. */
  const url = ORIGIN
    ? `${ORIGIN}/${meta.out === 'index.html' ? '' : meta.out}`
    : null;
  /* Until the domain is attached the site is a preview on github.io. Search
     engines should not index a preview: it competes with the real domain
     later, and it puts unfinished copy in front of people who did not ask for
     it. Setting SITE_ORIGIN both makes the canonical tags absolute and drops
     the noindex, so going live is one flag rather than two. */
  const canonical = url
    ? `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">\n`
      + `<meta property="og:image" content="${ORIGIN}/assets/img/icon-512.png">`
    : '<meta name="robots" content="noindex, nofollow">\n'
      + '<!-- Preview build: no SITE_ORIGIN set, so this is noindex and carries no\n'
      + '     canonical tag. Both change the moment the domain is configured. -->';

  /* replaceAll throughout: title and desc each appear twice in the shell —
     once for the browser, once for Open Graph — and a plain replace() swaps
     only the first, which is how a page ends up with a correct <title> and a
     link preview reading "{{title}}". */
  let html = partials.shell
    .replaceAll('{{title}}', meta.title)
    .replaceAll('{{desc}}', meta.desc)
    .replaceAll('{{canonical}}', canonical)
    .replaceAll('{{nav}}', markNav(partials.nav, meta.nav))
    .replaceAll('{{footer}}', partials.footer)
    .replaceAll('{{body}}', body);

  /* The mark is inlined in three places per page; keeping it as one partial
     means the logo cannot be three slightly different logos. */
  html = html.replaceAll('{{mark}}', partials.mark.trim());

  /* GitHub Pages serves 404.html for a miss at ANY depth, so a request for
     /a/b/c gets this page with the browser still sitting at /a/b/. Every
     relative path in it — the stylesheet, the fonts, the nav links — would
     then resolve against /a/b/ and 404 in turn. Root-absolute paths are the
     only ones that survive that, and they are wrong on every other page,
     which is why this rewrite is scoped to this one.

     It does mean 404.html assumes the site is served from a domain root.
     Under github.io/<repo>/ the links on this page alone point one level too
     high; they come right the moment the custom domain is attached. */
  if (meta.rooted) {
    html = html
      .replace(/(href|src)="assets\//g, '$1="/assets/')
      .replace(/href="(index|how-it-works|features|faq|privacy|terms)\.html/g,
        (w, p) => (p === 'index' ? 'href="/' : `href="/${p}.html`));
  }

  const leftovers = html.match(/\{\{[a-z]+\}\}/g);
  if (leftovers) {
    console.error(`  ${meta.out}: unreplaced ${[...new Set(leftovers)].join(', ')}`);
    process.exitCode = 1;
  }

  fs.writeFileSync(path.join(root, meta.out), html);
  built++;
  console.log(`  ${meta.out}  ${(html.length / 1024).toFixed(1)}kb`);
}

/* robots.txt and sitemap.xml are written by the root build, which covers this
   folder too. */
console.log(`${built} pages built${ORIGIN ? ` for ${ORIGIN}` : ' (no SITE_ORIGIN — canonical tags and sitemap skipped)'}.`);
