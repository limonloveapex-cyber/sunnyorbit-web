# sunnyorbitapps.com

The website of **SunnyOrbit**, a trading name of **Moiasun LLC** (a Delaware
limited liability company), and of its apps. Served by GitHub Pages.

```
/                  SunnyOrbit — home, apps, about, how we build, contact
/privacy.html      company privacy policy (website + email)
/terms.html        company terms of service
/cookies.html      cookie policy (there are no cookies; it says so)
/pooled/           Pooled, the first app — its own site, look and policies
/pooled/privacy.html, /pooled/terms.html, /pooled/delete-account.html
                   the three URLs the Pooled app opens from its drawer
```

A new app gets its own folder beside `/pooled/`.

## How it is built

Plain HTML and CSS. No framework, no dependencies, no `node_modules`, and
nothing is fetched from a third party when a page loads: fonts and icons are
served from this domain, and there is no analytics, no cookie and no tracking
pixel. The one script, `assets/js/site.js`, runs the mobile menu, the scroll
motion and the contact form; every page reads correctly without it and it
stores nothing in the browser.

```
src/partials/      shell, nav pill, footer — once, for every company page
src/pages/         the body of each company page
src/icons/         lucide icons (ISC), inlined at build time
assets/css/so.css  shared styles; assets/css/pages/<page>.css per page
pooled/            the Pooled site, with its own src/, build and styles
tools/build.js     builds the company pages, then runs pooled/tools/build.js
```

```sh
node tools/build.js          # preview build
python3 -m http.server 8000  # then open http://127.0.0.1:8000
```

Edit `src/` (or `pooled/src/`), never the generated HTML at the root — it is
overwritten on every build. The generated files are committed because Pages
serves the repo exactly as it stands. The build fails if a template token is
left unreplaced or an icon name does not exist.

Template tokens: `{{icon:name}}`, `{{icon:name:18}}`, `{{pooled-icon:72}}`.

### Share image

`assets/img/og.png` is rendered from `tools/og.html`:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --hide-scrollbars --window-size=1200,630 --screenshot=/tmp/og.png \
  "file://$PWD/tools/og.html"
```

## Connecting the domain

1. Build with the origin — this drops `noindex`, turns `robots.txt` from
   *Disallow* to *Allow*, and writes canonical tags, `og:url`, `og:image` and
   `sitemap.xml` for both sites at once:
   ```sh
   SITE_ORIGIN=https://sunnyorbitapps.com node tools/build.js
   ```
2. Add a `CNAME` file containing `sunnyorbitapps.com`, commit, push.
3. Settings → Pages → Custom domain → `sunnyorbitapps.com`, then *Enforce HTTPS*.
4. DNS: four `A` records for the apex (`185.199.108.153`, `.109.153`,
   `.110.153`, `.111.153`) and a `CNAME` for `www` → `limonloveapex-cyber.github.io`.

Until then the preview lives at `limonloveapex-cyber.github.io/sunnyorbit-web/`,
and `404.html` — which must use root-absolute paths — points one level too
high. That corrects itself on the domain.

## Before launch

Unfinished details are highlighted in the pages and searchable:

```sh
grep -rn "TO FILL\|TO CONFIRM" src/pages pooled/src/pages src/partials
```

**Moving the Pooled app to this domain** means changing, together:
1. `PublicPages.base` in the app's `lib/features/shell/app_drawer.dart` to
   `https://sunnyorbitapps.com/pooled` (it serves `/privacy.html`, `/terms.html`
   and `/delete-account.html` below that), and the test asserting it;
2. Play Console → App content → Privacy policy URL;
3. Play Console → Data safety → account deletion URL;
4. the store listing's website field;
5. Android App Links: `assetlinks.json` is served from the app's Firebase host
   and must stay there unless the app's `appLinkHost` moves too.

**The Google Play links** point at `…/details?id=com.limon.pooled`, which
answers 404 until the app is published.

**Legal.** The policies were written to describe actual practice and checked
against the app's code on 24 September 2026, but no lawyer has reviewed them.
The open business decisions (EU/UK representative, DMCA agent, retention
periods) are listed in the commit that introduced them.

**If a sentence on this site stops being true, delete it. Do not soften it.**

## Licence

© Moiasun LLC. The SunnyOrbit and Pooled names, marks and copy are not open
source. Lucide icons: ISC. Plus Jakarta Sans and Space Grotesk: SIL OFL 1.1.
