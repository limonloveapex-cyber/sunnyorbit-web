/* sunnyorbitapps.com — the only script on the company pages.
 *
 * Three jobs: the mobile menu, the scroll motion from the design's motion
 * sheet, and turning the contact form into an email (there is no server to
 * post it to, and a third-party form service would be one more company
 * reading people's messages). Every page reads correctly without this file:
 * the reveal styles only hide things once <html> has the `js` class.
 *
 * No storage of any kind — no cookies, no localStorage — which is what lets
 * the cookie policy say "nothing" and mean it.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- menu */
  var pill = document.getElementById('nav-pill');
  if (pill) {
    var toggle = pill.querySelector('.nav-toggle');
    toggle.addEventListener('click', function () {
      var open = pill.getAttribute('data-open') === 'true';
      pill.setAttribute('data-open', String(!open));
      toggle.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pill.getAttribute('data-open') === 'true') {
        pill.setAttribute('data-open', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------- reveals */
  /* Siblings with data-reveal inside a [data-stagger] parent get an index,
     which the CSS turns into a 70ms step. */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var i = 0;
    group.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.closest('[data-stagger]') === group) el.style.setProperty('--i', i++);
    });
  });

  var items = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------- parallax */
  /* [data-parallax="0.85"] moves at 85% of scroll speed relative to its
     neighbours; linear, as the motion sheet asks, and off entirely when the
     visitor has asked for less motion. */
  var layers = document.querySelectorAll('[data-parallax]');
  if (layers.length && !reduce) {
    var ticking = false;
    var update = function () {
      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 1;
        var offset = (r.top + r.height / 2 - vh / 2) * (1 - speed);
        el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------ footer wordmark */
  /* Fully blurred at the moment the wordmark first appears at the bottom of
     the screen, sharp exactly when the page bottoms out, so the whole of the
     change happens where it can be seen. --p runs 0 → 1 over that stretch
     of scrolling.

     Its position is taken from the panel plus offsetTop, not from the
     wordmark's own bounding box: the box moves with the transform that --p
     drives, and measuring it would feed the animation back into itself. */
  var mark = document.querySelector('.footer-wordmark');
  if (mark && !reduce) {
    var panel = mark.parentElement;
    var queued = false;
    var focus = function () {
      var vh = window.innerHeight;
      var y = window.scrollY;
      var markTop = panel.getBoundingClientRect().top + mark.offsetTop;
      var start = y + markTop - vh;
      var end = document.documentElement.scrollHeight - vh;
      var p = end - start < 40 ? 1 : (y - start) / (end - start);
      p = Math.max(0, Math.min(1, p));
      mark.style.setProperty('--p', p.toFixed(3));
      queued = false;
    };
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(focus); }
    }, { passive: true });
    window.addEventListener('resize', focus);
    focus();
  }

  /* --------------------------------------------------- contact form */
  /* Builds a mailto: from the form so the message leaves from the visitor's
     own mail app. Nothing is sent from this page. With no script, the form's
     own action is a plain mailto: and still works. */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var topic = data.get('topic') || 'Hello';
      var subject = topic + (data.get('name') ? ' — from ' + data.get('name') : '');
      var body = (data.get('message') || '') + '\n\n—\n' + (data.get('name') || '');
      var to = form.getAttribute('data-to');
      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      var note = document.getElementById('contact-sent');
      if (note) note.hidden = false;
    });
  }
})();
