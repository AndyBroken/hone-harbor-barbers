/* Barbershop template — interactive bits (no framework). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DATA = JSON.parse(($('#site-data') || {}).textContent || '{}');
  const SHOT = /[?&]shot\b/.test(location.search);
  if (SHOT) document.documentElement.classList.add('shot');
  // Same line icons as src/components/Icon.astro (inherit text colour)
  const svg = (d) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
  const ICON = {
    back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    users: svg('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5c.7-3.1 2.9-4.8 5.5-4.8s4.8 1.7 5.5 4.8M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.6 14.9c1.6.6 2.6 2.1 3 4.6"/>'),
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Header + mobile drawer ---------- */
  const header = $('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('[data-burger]');
  const drawer = $('[data-drawer]');
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      if (open) drawer.style.top = header.getBoundingClientRect().bottom + 'px';
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  /* ---------- Open now / today's hours ---------- */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function shopNow() {
    // current weekday + minutes in the shop's own time zone
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: DATA.timezone || undefined, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    return { day: get('weekday'), mins: +get('hour') * 60 + +get('minute') };
  }
  const toMins = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const fmt = (t) => { const [h, m] = t.split(':').map(Number); const s = h >= 12 ? 'pm' : 'am'; return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + s; };
  function openState() {
    const hours = DATA.hours || [];
    const byDay = Object.fromEntries(hours.map((h) => [h.day, h]));
    const now = shopNow();
    const today = byDay[now.day];
    if (today && !today.closed && now.mins >= toMins(today.open) && now.mins < toMins(today.close)) {
      return { open: true, text: 'Open now · until ' + fmt(today.close), day: now.day };
    }
    // find next opening
    const idx = DAYS.indexOf(now.day);
    for (let i = 0; i < 8; i++) {
      const d = DAYS[(idx + i) % 7];
      const h = byDay[d];
      if (!h || h.closed) continue;
      if (i === 0 && now.mins >= toMins(h.open)) continue;
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : d.slice(0, 3);
      return { open: false, text: 'Closed · opens ' + when + ' ' + fmt(h.open), day: now.day };
    }
    return { open: false, text: 'Closed', day: now.day };
  }
  if (DATA.hours) {
    const st = openState();
    $$('[data-open-status]').forEach((el) => {
      el.classList.add(st.open ? 'is-open' : 'is-closed');
      const t = $('[data-open-text]', el);
      if (t) t.textContent = st.text;
    });
    $$(`[data-day="${st.day}"]`).forEach((li) => li.classList.add('is-today'));
  }

  /* ---------- Scroll reveal ---------- */
  if (!SHOT && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const targets = $$('.sectionhead, .menu__item, .feature, .stat, .barber, .review, .strip__item, .masonry__item, .faq__item, .story__img, .story__text, .visit__info, .visit__map, .policies, .split__aside, .contact > *');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight) return; // already visible
      el.setAttribute('data-anim', '');
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Services: category jump tabs + scroll spy ---------- */
  const tabWrap = $('[data-tabs]');
  if (tabWrap) {
    const tabs = $$('[data-tab]', tabWrap);
    tabs.forEach((t) => t.addEventListener('click', () => {
      const p = $(`[data-panel="${t.dataset.tab}"]`);
      if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        tabs.forEach((t) => {
          const on = t.dataset.tab === e.target.dataset.panel;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', String(on));
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('[data-panel]', tabWrap).forEach((p) => spy.observe(p));
  }

  /* ---------- Gallery filter ---------- */
  $$('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
    $$('[data-filter]').forEach((b) => b.classList.toggle('is-on', b === btn));
    const f = btn.dataset.filter;
    $$('.masonry__item').forEach((it) => it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f));
  }));

  /* ---------- Lightbox ---------- */
  const lb = $('[data-lightbox]');
  let lbItems = [], lbIndex = 0, lastFocus = null;
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const it = lbItems[lbIndex];
    $('[data-lb-img]', lb).src = it.dataset.lb;
    $('[data-lb-img]', lb).alt = it.dataset.cap || '';
    $('[data-lb-cap]', lb).textContent = it.dataset.cap || '';
  }
  function lbClose() { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  if (lb) {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('[data-lb]');
      if (!item) return;
      lbItems = $$('[data-lb]', item.closest('[data-gallery]') || document).filter((x) => !x.classList.contains('is-hidden'));
      lastFocus = item;
      lbShow(lbItems.indexOf(item));
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lb.setAttribute('tabindex', '-1');
      lb.focus();
    });
    $('[data-lb-close]', lb).addEventListener('click', lbClose);
    $('[data-lb-prev]', lb).addEventListener('click', () => lbShow(lbIndex - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => lbShow(lbIndex + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbShow(lbIndex - 1);
      if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
    });
  }

  /* ---------- Reviews slider ---------- */
  $$('[data-slider]').forEach((sl) => {
    const track = $('[data-track]', sl);
    const cards = [...track.children];
    let pos = 0, timer;
    const perView = () => (innerWidth <= 640 ? 1 : innerWidth <= 900 ? 2 : 3);
    const go = (n) => {
      const max = Math.max(0, cards.length - perView());
      pos = n > max ? 0 : n < 0 ? max : n;
      const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
      track.style.transform = `translateX(${-pos * step}px)`;
    };
    const auto = () => { clearInterval(timer); if (!SHOT) timer = setInterval(() => go(pos + 1), 6000); };
    $('[data-next]', sl).addEventListener('click', () => { go(pos + 1); auto(); });
    $('[data-prev]', sl).addEventListener('click', () => { go(pos - 1); auto(); });
    let x0 = null;
    track.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { go(pos + (dx < 0 ? 1 : -1)); auto(); } x0 = null; });
    addEventListener('resize', () => go(pos));
    auto();
  });

  /* ---------- Contact form ---------- */
  const form = $('[data-form]');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('[data-form-status]', form);
      let ok = true;
      $$('[required]', form).forEach((f) => { const bad = !f.value.trim(); f.classList.toggle('is-invalid', bad); if (bad) ok = false; });
      status.className = 'form__status';
      if (!ok) { status.textContent = 'Please fill in the highlighted fields.'; status.classList.add('is-err'); return; }
      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      try {
        if (DATA.formEndpoint) {
          const res = await fetch(DATA.formEndpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
          if (!res.ok) throw new Error('send failed');
          status.textContent = "Thanks! We'll get back to you within one business day.";
        } else {
          await new Promise((r) => setTimeout(r, 600));
          status.textContent = 'Demo: message not sent. On a live site it goes straight to your inbox.';
        }
        status.classList.add('is-ok');
        form.reset();
      } catch (err) {
        status.textContent = 'Something went wrong — please call us instead.';
        status.classList.add('is-err');
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- Booking ---------- */
  const dlg = $('[data-booking]');
  const booking = DATA.booking || { mode: 'demo' };
  const body = dlg && $('[data-booking-body]', dlg);
  const title = dlg && $('[data-step-title]', dlg);
  const note = dlg && $('[data-booking-note]', dlg);
  const steps = dlg && $$('[data-steps] li', dlg);
  let state = {};

  function setStep(n, t) {
    title.textContent = t;
    steps.forEach((li, i) => li.classList.toggle('is-on', i <= n));
  }
  function openDialog() {
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.setAttribute('tabindex', '-1');
    dlg.focus(); // focus the dialog, not the close button (no ring on open)
    document.body.style.overflow = 'hidden';
  }
  function closeDialog() { dlg.close ? dlg.close() : dlg.removeAttribute('open'); }

  function startBooking(opts) {
    const barber = (DATA.barbers || []).find((b) => b.name === opts.barber);
    const url = (barber && barber.booking_url) || booking.url;
    if (booking.mode === 'link' && url) { window.open(url, '_blank', 'noopener'); return; }
    if (!dlg) return;
    if (booking.mode === 'embed' && url) {
      $('[data-steps]', dlg).hidden = true;
      title.textContent = 'Book your visit';
      body.innerHTML = `<iframe src="${esc(url)}" title="Online booking" loading="lazy"></iframe>`;
      note.textContent = booking.provider ? 'Secure booking powered by ' + booking.provider + '.' : '';
      openDialog();
      return;
    }
    // demo wizard
    $('[data-steps]', dlg).hidden = false;
    state = { service: (DATA.services || []).find((s) => s.name === opts.service) || null, barber: opts.barber || null, date: null, time: null };
    note.textContent = 'Demo booking — nothing is sent. On a live site this step is handled by your booking system (Booksy, Square, Fresha, Vagaro…).';
    if (!state.service) stepService(); else if (!state.barber) stepBarber(); else stepTime();
    openDialog();
  }

  function stepService() {
    setStep(0, 'Choose a service');
    let html = '', cat = '';
    (DATA.services || []).forEach((s, i) => {
      if (s.category !== cat) { cat = s.category; html += `<p class="optgroup">${esc(cat)}</p>`; }
      html += `<button class="opt${state.service && state.service.name === s.name ? ' is-on' : ''}" data-i="${i}"><span class="opt__main"><span class="opt__name">${esc(s.name)}</span><span class="opt__sub">${esc(s.duration)}</span></span><span class="opt__price">$${esc(s.price)}</span></button>`;
    });
    body.innerHTML = `<div class="opts">${html}</div>`;
    $$('.opt', body).forEach((b) => b.addEventListener('click', () => { state.service = DATA.services[+b.dataset.i]; state.barber ? stepTime() : stepBarber(); }));
  }
  function stepBarber() {
    setStep(1, 'Choose your barber');
    const any = `<button class="opt" data-name="Any barber"><span class="opt__any">${ICON.users}</span><span class="opt__main"><span class="opt__name">Any barber</span><span class="opt__sub">Earliest available time</span></span></button>`;
    const list = (DATA.barbers || []).map((b) => `<button class="opt${state.barber === b.name ? ' is-on' : ''}" data-name="${esc(b.name)}"><img src="${esc(b.photo)}" alt="" style="object-position:${esc(b.pos)}"><span class="opt__main"><span class="opt__name">${esc(b.name)}</span><span class="opt__sub">${esc(b.role)}</span></span></button>`).join('');
    body.innerHTML = `<div class="opts">${any}${list}</div><div class="booking__foot"><button class="btn btn--ghost btn--sm" data-back>${ICON.back} Back</button></div>`;
    $$('.opt', body).forEach((b) => b.addEventListener('click', () => { state.barber = b.dataset.name; stepTime(); }));
    $('[data-back]', body).addEventListener('click', stepService);
  }
  function hash(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function stepTime() {
    setStep(2, 'Pick a time');
    const byDay = Object.fromEntries((DATA.hours || []).map((h) => [h.day, h]));
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() + i); days.push(d); }
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const slotsFor = (i) => {
      const d = days[i];
      const h = byDay[DAYS[d.getDay()]];
      if (!h || h.closed) return [];
      const out = [];
      for (let m = toMins(h.open); m <= toMins(h.close) - 45; m += 45) {
        const t = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
        const taken = hash(d.toDateString() + t + state.barber) % 3 === 0 || (i === 0 && m <= nowMins + 30);
        out.push({ t, taken });
      }
      return out;
    };
    const dayBtns = days.map((d, i) => {
      const closed = !slotsFor(i).some((x) => !x.taken);
      return `<button class="day${state.date === i ? ' is-on' : ''}" data-d="${i}" ${closed ? 'disabled' : ''}><small>${DAYS[d.getDay()].slice(0, 3)}</small><strong>${d.getDate()}</strong><small>${d.toLocaleString('en-US', { month: 'short' })}</small></button>`;
    }).join('');
    body.innerHTML = `<div class="days">${dayBtns}</div><div class="slots" data-slots><p class="muted small" style="grid-column:1/-1">Select a day to see available times.</p></div><div class="booking__foot"><button class="btn btn--ghost btn--sm" data-back>${ICON.back} Back</button><button class="btn btn--brass btn--sm" data-next disabled>Continue</button></div>`;
    const renderSlots = (i) => {
      const d = days[i];
      $('[data-slots]', body).innerHTML = slotsFor(i).map(({ t, taken }) => {
        return `<button class="slot${state.time === t && state.date === i ? ' is-on' : ''}" data-t="${t}" ${taken ? 'disabled' : ''}>${fmt(t)}</button>`;
      }).join('');
      $$('.slot', body).forEach((s) => s.addEventListener('click', () => {
        $$('.slot', body).forEach((x) => x.classList.toggle('is-on', x === s));
        state.time = s.dataset.t; state.dateObj = d;
        $('[data-next]', body).disabled = false;
      }));
    };
    $$('.day', body).forEach((b) => b.addEventListener('click', () => {
      $$('.day', body).forEach((x) => x.classList.toggle('is-on', x === b));
      state.date = +b.dataset.d; state.time = null;
      $('[data-next]', body).disabled = true;
      renderSlots(state.date);
    }));
    const pre = state.date != null && $(`.day[data-d="${state.date}"]:not(:disabled)`, body);
    if (pre) { renderSlots(state.date); $('[data-next]', body).disabled = !state.time; }
    else { const first = $('.day:not(:disabled)', body); if (first) first.click(); }
    $('[data-back]', body).addEventListener('click', stepBarber);
    $('[data-next]', body).addEventListener('click', stepConfirm);
  }
  function stepConfirm() {
    setStep(3, 'Confirm booking');
    const when = state.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + fmt(state.time);
    body.innerHTML = `<div class="summary"><div><span>Service</span><strong>${esc(state.service.name)} · $${esc(state.service.price)}</strong></div><div><span>Barber</span><strong>${esc(state.barber)}</strong></div><div><span>When</span><strong>${esc(when)}</strong></div></div>
      <form class="form" data-bform novalidate><label>Your name<input name="name" required autocomplete="name"></label><label>Mobile number<input name="phone" required type="tel" autocomplete="tel" placeholder="For your text reminder"></label>
      <div class="booking__foot"><button type="button" class="btn btn--ghost btn--sm" data-back>${ICON.back} Back</button><button class="btn btn--brass btn--sm" type="submit">Confirm booking</button></div></form>`;
    $('[data-back]', body).addEventListener('click', stepTime);
    $('[data-bform]', body).addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', e.target).forEach((f) => { const bad = !f.value.trim(); f.classList.toggle('is-invalid', bad); if (bad) ok = false; });
      if (!ok) return;
      const name = e.target.name.value.trim().split(' ')[0];
      steps.forEach((li) => li.classList.add('is-on'));
      title.textContent = "You're booked!";
      body.innerHTML = `<div class="booking__done"><div class="check">${ICON.check}</div><p class="lead" style="margin:0 auto 6px">See you soon, ${esc(name)}.</p><p class="muted">${esc(state.service.name)} with ${esc(state.barber)}<br>${esc(when)}</p><button class="btn btn--brass" data-close>Done</button></div>`;
      $('[data-close]', body).addEventListener('click', closeDialog);
    });
  }

  if (dlg) {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-book]');
      if (!b) return;
      e.preventDefault();
      if (drawer && drawer.classList.contains('is-open')) burger.click();
      startBooking({ service: b.dataset.service, barber: b.dataset.barber });
    });
    $('[data-close]', dlg).addEventListener('click', closeDialog);
    dlg.addEventListener('close', () => { document.body.style.overflow = ''; });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDialog(); });
    if (/[?&]book\b/.test(location.search)) startBooking({});
  }
})();
