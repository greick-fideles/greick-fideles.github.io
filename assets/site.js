/* Greick Fideles · portfólio — interações e "montagem ao vivo" */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const jumpTop = () => { try { scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch (e) { scrollTo(0, 0); } };

  /* ---------------- Menu ---------------- */
  const burger = $('.burger'), menu = $('#menu');
  let menuOpen = false;
  const openMenu = () => {
    menuOpen = true; menu.hidden = false; root.classList.add('lock');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fechar menu');
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
  };
  const closeMenu = () => {
    if (!menuOpen) return;
    menuOpen = false; menu.classList.remove('is-open'); root.classList.remove('lock');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menu');
    setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 360);
  };
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  addEventListener('resize', () => { if (menuOpen && innerWidth >= 960) closeMenu(); });

  /* ---------------- Link ativo ---------------- */
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const map = { bastidores: 'bastidores', rascunho: 'bastidores', sobre: 'sobre', trajetoria: 'trajetoria', contato: 'contato', topo: '' };
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const id = map[en.target.id];
      navLinks.forEach(a => a.classList.toggle('is-active', !!id && a.getAttribute('href') === '#' + id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(id => { const s = document.getElementById(id); s && io.observe(s); });
  }

  /* ---------------- Filtros e busca ---------------- */
  const cards = $$('.card');
  const emptyEl = $('[data-empty]'), search = $('[data-search]');
  const tabs = $$('[data-filter]');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const catWords = { captacao: 'captacao camera', set: 'set luz iluminacao producao', edicao: 'edicao pos producao timeline corte' };
  const index = cards.map(c => norm(c.textContent + ' ' + catWords[c.dataset.cat] + ' ' + $('img', c).alt));
  let filter = 'todos', query = '';
  const applyFilter = () => {
    let shown = 0;
    cards.forEach((c, i) => {
      const ok = (filter === 'todos' || c.dataset.cat === filter) && (!query || index[i].includes(query));
      c.classList.toggle('is-out', !ok);
      if (ok) shown++;
    });
    emptyEl.hidden = shown > 0;
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    filter = t.dataset.filter;
    tabs.forEach(x => x.setAttribute('aria-selected', String(x === t)));
    applyFilter();
  }));
  search.addEventListener('input', () => { query = norm(search.value.trim()); applyFilter(); });

  /* ---------------- Lightbox ---------------- */
  const items = cards.map(c => {
    const img = $('img', c);
    return { src: img.getAttribute('src'), alt: img.alt, title: $('strong', c).textContent, tag: $('small', c).textContent };
  });
  const N = items.length;
  const lb = $('[data-lb]'), lbImg = $('[data-lb-img]');
  let lbI = 0, lastFocus = null;
  const showLb = i => {
    lbI = (i + N) % N;
    const idx = lbI, it = items[idx];
    lbImg.classList.remove('is-in');
    const im = new Image(); im.src = it.src;
    const done = () => { if (idx !== lbI) return; lbImg.src = it.src; lbImg.alt = it.alt; requestAnimationFrame(() => lbImg.classList.add('is-in')); };
    im.decode ? im.decode().then(done, done) : (im.onload = done);
    $('[data-lb-count]').textContent = `${pad(idx + 1)} / ${pad(N)}`;
    $('[data-lb-n]').textContent = pad(idx + 1);
    $('[data-lb-title]').textContent = it.title;
    $('[data-lb-tag]').textContent = it.tag;
  };
  const openLb = i => {
    lastFocus = document.activeElement; lb.hidden = false; showLb(i);
    root.classList.add('lock');
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    $('[data-lb-close]').focus({ preventScroll: true });
  };
  const closeLb = () => {
    lb.classList.remove('is-open'); root.classList.remove('lock');
    setTimeout(() => { lb.hidden = true; lbImg.classList.remove('is-in'); }, 400);
    lastFocus && lastFocus.focus({ preventScroll: true });
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openLb(+b.dataset.open); });
  $('[data-lb-close]').addEventListener('click', closeLb);
  $('[data-lb-prev]').addEventListener('click', () => showLb(lbI - 1));
  $('[data-lb-next]').addEventListener('click', () => showLb(lbI + 1));
  let sx = null, swiped = false;
  $('[data-lb-stage]').addEventListener('click', e => { if (swiped) { swiped = false; return; } if (e.target === e.currentTarget) closeLb(); });
  lb.addEventListener('pointerdown', e => { sx = e.clientX; swiped = false; });
  lb.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) { swiped = true; showLb(lbI + (dx < 0 ? 1 : -1)); }
  });
  document.addEventListener('keydown', e => {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') showLb(lbI + 1);
      else if (e.key === 'ArrowLeft') showLb(lbI - 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    } else if (menuOpen && e.key === 'Escape') { closeMenu(); burger.focus(); }
  });

  /* ---------------- Rascunho x set (comparador) ---------------- */
  const cmp = $('[data-cmp]'), range = $('[data-cmp-range]');
  let cmpTouched = false;
  const setX = v => { v = clamp(v, 0, 100); cmp.style.setProperty('--x', v.toFixed(2) + '%'); range.value = Math.round(v); };
  const cmpMove = e => { const r = cmp.getBoundingClientRect(); setX((e.clientX - r.left) / r.width * 100); };
  let dragging = false;
  cmp.addEventListener('pointerdown', e => {
    dragging = true; cmpTouched = true; cmp.classList.add('is-drag');
    cmp.setPointerCapture(e.pointerId); cmpMove(e);
  });
  cmp.addEventListener('pointermove', e => { if (dragging) cmpMove(e); });
  const cmpEnd = () => { dragging = false; cmp.classList.remove('is-drag'); };
  cmp.addEventListener('pointerup', cmpEnd);
  cmp.addEventListener('pointercancel', cmpEnd);
  range.addEventListener('input', () => { cmpTouched = true; setX(+range.value); });
  cmp.addEventListener('built', () => {
    if (RM || cmpTouched) return;
    const t0 = performance.now(), D = 2000;
    const step = now => {
      if (cmpTouched) return;
      const t = clamp((now - t0) / D);
      setX(56 - Math.sin(t * Math.PI * 2) * 24 * (1 - t * .35));
      if (t < 1) requestAnimationFrame(step); else setX(56);
    };
    requestAnimationFrame(step);
  });

  /* ---------------- Kit (faixa contínua) ---------------- */
  const kit = $('[data-kit]'), kTrack = $('[data-kit-track]');
  const kBase = [...kTrack.children];
  const kPause = $('[data-kit-pause]');
  let kx = 0, kShift = 0, kPaused = RM, kGroup = 0, kItem = 0, kVisible = false, kRaf = 0, kLast = 0;
  const kMeasure = () => {
    kItem = kBase[0].getBoundingClientRect().width;
    kGroup = kItem * kBase.length;
    let guard = 0;
    while (kTrack.scrollWidth < kit.clientWidth + kGroup * 2 && guard++ < 10) {
      kBase.forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); kTrack.append(c); });
    }
  };
  const kRender = () => {
    if (kGroup) { while (kx <= -kGroup) kx += kGroup; while (kx > 0) kx -= kGroup; }
    kTrack.style.transform = `translate3d(${kx.toFixed(2)}px,0,0)`;
  };
  const kLoop = now => {
    const f = Math.min(3, (now - kLast) / 16.667); kLast = now;
    if (!kPaused) kx -= .55 * f;
    if (Math.abs(kShift) > .3) { const d = kShift * (1 - Math.pow(.86, f)); kx += d; kShift -= d; }
    kRender();
    if (kVisible) kRaf = requestAnimationFrame(kLoop); else kRaf = 0;
  };
  const kStart = () => { if (!kRaf) { kLast = performance.now(); kRaf = requestAnimationFrame(kLoop); } };
  kMeasure(); kRender();
  addEventListener('resize', () => { kMeasure(); kRender(); });
  document.fonts && document.fonts.ready.then(() => { kMeasure(); kRender(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { kVisible = en.isIntersecting; if (kVisible) kStart(); }).observe(kit);
  const kNudge = dir => { if (RM) { kx += dir * kItem; kRender(); } else { kShift += dir * kItem; kStart(); } };
  $('[data-kit-prev]').addEventListener('click', () => kNudge(1));
  $('[data-kit-next]').addEventListener('click', () => kNudge(-1));
  kPause.addEventListener('click', () => {
    kPaused = !kPaused;
    kPause.setAttribute('aria-pressed', String(kPaused));
    kPause.setAttribute('aria-label', kPaused ? 'Continuar' : 'Pausar');
  });
  if (RM) kPause.setAttribute('aria-pressed', 'true');

  /* ---------------- Acordeão ---------------- */
  $$('.acc__btn').forEach(b => b.addEventListener('click', () => {
    const it = b.parentElement, open = !it.classList.contains('is-open');
    it.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
  }));

  /* =====================================================================
     Montagem ao vivo: cada camada [data-b] surge com caixa de wireframe,
     guias e um "agente" (cursor) trabalhando nela.
     ===================================================================== */
  const Build = (() => {
    const els = $$('[data-b]');
    const noop = { replay: jumpTop };
    if (RM || !els.length || !('IntersectionObserver' in window)) return noop;

    const layer = $('[data-bx-layer]'), agLayer = $('[data-ag-layer]'), scan = $('[data-scan]');
    const hud = $('[data-hud]'), hudMsg = $('[data-hud-msg]');
    const hAg = $('[data-hud-agents]'), hDone = $('[data-hud-done]'), hTot = $('[data-hud-total]'), hBar = $('[data-hud-bar]');
    const bSkip = $('[data-hud-skip]'), bSpeed = $('[data-hud-speed]'), bReplay = $('[data-hud-replay]');

    root.classList.add('build');
    const SMALL = innerWidth < 700;
    const NAG = SMALL ? 11 : 18;
    const DUR = 880, GAP = 85, SCAN = 1300, MAXC = SMALL ? 5 : 8;
    const total = els.length;
    hTot.textContent = total; hAg.textContent = NAG;

    let speed = 1, phase = 'idle', t0 = 0, tEnd = 0, lastBusy = 0, lastCheck = 0, nextAt = 0;
    let queue = [], active = [], pending = [], built = 0, io = null, running = false, last = 0;

    const kindOf = el => el.dataset.bk || (el.matches('p') ? 'text' : 'block');

    /* agentes */
    const CURSOR = '<svg viewBox="0 0 17 22"><path d="M1.6 1.6v16.6l4.4-4.2 3 6.7 3.1-1.4-3-6.6h6.2z" fill="#fff" stroke="#0D0D0F" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    const agents = Array.from({ length: NAG }, () => {
      const d = document.createElement('div'); d.className = 'ag'; d.innerHTML = CURSOR; agLayer.append(d);
      return { d, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, k: .04 + Math.random() * .03, job: null, next: 0, ph: Math.random() * 6.283, r: 46 + Math.random() * 70 };
    });
    const spawnAgents = () => {
      const W = innerWidth, H = innerHeight;
      agents.forEach(a => {
        const side = Math.random() * 4 | 0;
        a.x = side === 0 ? -30 : side === 1 ? W + 30 : Math.random() * W;
        a.y = side === 2 ? -30 : side === 3 ? H + 30 : Math.random() * H;
        a.vx = a.vy = 0; a.job = null; a.next = 0;
      });
    };
    const updAgents = (now, f) => {
      const W = innerWidth, H = innerHeight;
      for (const a of agents) {
        if (phase === 'scan') {
          const ang = now / 1000 * 1.7 + a.ph;
          a.tx = W / 2 + Math.cos(ang) * a.r; a.ty = H / 2 + Math.sin(ang) * a.r * .8;
        } else if (a.job) {
          a.tx = a.job.tx; a.ty = a.job.ty;
        } else if (now > a.next) {
          const ref = active.length ? active[Math.random() * active.length | 0].rect : null;
          if (ref) { a.tx = ref.left + Math.random() * ref.width; a.ty = ref.bottom + 14 + Math.random() * 70; }
          else { a.tx = W * (.1 + Math.random() * .8); a.ty = H * (.15 + Math.random() * .7); }
          a.next = now + 600 + Math.random() * 1400;
        }
        const k = a.job ? .13 : a.k, damp = a.job ? .7 : .84;
        const nx = Math.sin(now / 340 + a.ph) * 2.5, ny = Math.cos(now / 410 + a.ph) * 2.5;
        a.vx = (a.vx + (a.tx + nx - a.x) * k * f) * Math.pow(damp, f);
        a.vy = (a.vy + (a.ty + ny - a.y) * k * f) * Math.pow(damp, f);
        a.x += a.vx * f; a.y += a.vy * f;
        const rot = clamp(a.vx * 1.4, -24, 24);
        a.d.style.transform = `translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg)`;
      }
    };

    /* camadas */
    const clearInline = el => { el.style.clipPath = ''; el.style.opacity = ''; el.style.filter = ''; };
    const markBuilt = el => {
      el.classList.remove('is-building'); clearInline(el);
      if (el.classList.contains('is-built')) return;
      el.classList.add('is-built'); built++;
      el.dispatchEvent(new CustomEvent('built'));
    };
    const startJob = (el, now) => {
      const kind = kindOf(el);
      const bx = document.createElement('div');
      bx.className = 'bx bx--' + kind;
      bx.innerHTML = '<i class="bx__fill"></i><i class="bx__h"></i><i class="bx__h"></i><i class="bx__h"></i><i class="bx__h"></i><span class="bx__tag"></span>' + (kind === 'type' ? '<i class="bx__caret"></i>' : '');
      $('.bx__tag', bx).textContent = el.dataset.b;
      layer.append(bx);
      const job = {
        el, bx, kind, t: now, fill: bx.firstChild, caret: $('.bx__caret', bx), rect: el.getBoundingClientRect(),
        steps: kind === 'type' ? clamp(el.textContent.trim().length, 6, 34) : 0, guides: null, agent: null, tx: 0, ty: 0
      };
      if (kind === 'img') {
        const h = document.createElement('i'), v = document.createElement('i');
        h.className = 'gd gd--h'; v.className = 'gd gd--v'; layer.append(h, v); job.guides = [h, v];
      }
      el.classList.add('is-building');
      job.tx = job.rect.left; job.ty = job.rect.top;
      let best = null, bd = Infinity;
      for (const a of agents) if (!a.job) { const d = Math.hypot(a.x - job.rect.left, a.y - job.rect.top); if (d < bd) { bd = d; best = a; } }
      if (best) { best.job = job; job.agent = best; }
      active.push(job);
      updJob(job, now);
    };
    const endJob = job => {
      job.bx.remove(); job.guides && job.guides.forEach(g => g.remove());
      if (job.agent) { job.agent.job = null; job.agent.next = 0; }
      markBuilt(job.el);
    };
    const updJob = (job, now) => {
      const p = clamp((now - job.t) / (DUR / speed));
      const r = job.el.getBoundingClientRect(); job.rect = r;
      const a = easeOut(clamp(p / .24)), b = clamp((p - .18) / .6), c = clamp((p - .82) / .18);
      const P = 3, x = r.left - P, y = r.top - P, w = r.width + P * 2, h = r.height + P * 2;
      const bx = job.bx;
      bx.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      bx.style.width = (w * a).toFixed(1) + 'px';
      bx.style.height = (h * a).toFixed(1) + 'px';
      bx.style.opacity = String(1 - c);
      job.fill.style.opacity = String(1 - b);
      const el = job.el;
      if (job.kind === 'type') {
        const q = Math.floor(b * job.steps) / job.steps;
        el.style.clipPath = q >= 1 ? '' : `inset(-35% ${((1 - q) * 100).toFixed(2)}% -35% -35%)`;
        if (job.caret) { job.caret.style.left = (q * 100) + '%'; job.caret.style.opacity = b > 0 && b < 1 ? '' : '0'; }
        job.tx = r.left + q * r.width + 2; job.ty = r.top + r.height * .6;
      } else if (job.kind === 'img') {
        const e = easeInOut(b);
        el.style.clipPath = e >= 1 ? '' : `inset(0 0 ${((1 - e) * 100).toFixed(2)}% 0)`;
        job.tx = r.left + r.width * (.5 + Math.sin(now / 260) * .3); job.ty = r.top + e * r.height;
        const [gh, gv] = job.guides;
        gh.style.transform = `translateY(${(r.top + e * r.height).toFixed(1)}px)`;
        gv.style.transform = `translateX(${r.left.toFixed(1)}px)`;
        gh.style.opacity = gv.style.opacity = String((1 - c) * .85);
      } else {
        const e = easeOut(b);
        el.style.opacity = String(e);
        el.style.filter = e >= 1 ? '' : `blur(${((1 - e) * 6).toFixed(2)}px)`;
        job.tx = r.left + e * r.width; job.ty = r.top + r.height * .55;
      }
      if (b <= 0) { job.tx = r.left + 4; job.ty = r.top + 4; }
      if (p >= 1) { endJob(job); return true; }
      return false;
    };

    const onScreen = r => r.width > 1 && r.height > 1 && r.bottom > -40 && r.top < innerHeight + 40;
    const pump = now => {
      let guard = 0;
      while (queue.length && guard++ < 80) {
        const el = queue[0];
        if (el.classList.contains('is-built')) { queue.shift(); continue; }
        if (!onScreen(el.getBoundingClientRect())) { queue.shift(); markBuilt(el); continue; }
        if (active.length >= MAXC || now < nextAt) break;
        queue.shift(); startJob(el, now);
        nextAt = now + GAP / speed * (queue.length > 12 ? .45 : 1);
      }
    };
    const byDom = (x, y) => (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const enqueue = list => {
      list = list.filter(el => !el.classList.contains('is-built') && !queue.includes(el) && !active.some(j => j.el === el));
      if (!list.length) return;
      queue.push(...list); queue.sort(byDom);
      if (phase === 'done') { phase = 'run'; hud.classList.remove('is-done'); bSkip.textContent = 'Pular'; }
      wake();
    };
    const onIO = entries => {
      const add = entries.filter(e => e.isIntersecting).map(e => e.target);
      add.forEach(el => io.unobserve(el));
      if (phase === 'scan') pending.push(...add); else enqueue(add);
    };

    const allDone = () => els.every(el => {
      if (el.classList.contains('is-built')) return true;
      const r = el.getBoundingClientRect(); return r.width < 1 || r.height < 1;
    });
    const fmt = s => s.toFixed(1).replace('.', ',');
    const finish = (now, msg) => {
      phase = 'done'; tEnd = now;
      hud.classList.remove('is-scan'); hud.classList.add('is-done');
      hudMsg.textContent = msg || `Montada por ${NAG} agentes em ${fmt((now - t0) / 1000)} s`;
      hBar.style.transform = 'scaleX(1)';
      bSkip.textContent = 'Rever';
    };
    const updHud = (now, busy) => {
      if (phase === 'scan') { hBar.style.transform = `scaleX(${clamp((now - t0) / (SCAN / speed)).toFixed(3)})`; return; }
      hDone.textContent = built;
      if (phase === 'run') {
        hBar.style.transform = `scaleX(${(built / total).toFixed(3)})`;
        if (!busy && now - lastCheck > 350) { lastCheck = now; if (allDone()) finish(now); }
        hud.classList.toggle('is-away', !busy && now - lastBusy > 2400);
      } else if (phase === 'done') {
        hud.classList.toggle('is-away', now - tEnd > 4600);
      }
    };

    const endScan = () => {
      phase = 'run'; scan.classList.remove('is-on');
      hud.classList.remove('is-scan');
      const p = pending; pending = []; enqueue(p);
    };
    const loop = now => {
      const f = Math.min(3, (now - last) / 16.667); last = now;
      if (phase === 'scan' && now - t0 > SCAN / speed) endScan();
      if (phase !== 'scan') pump(now);
      for (let i = active.length - 1; i >= 0; i--) if (updJob(active[i], now)) active.splice(i, 1);
      const busy = phase === 'scan' || active.length > 0 || queue.length > 0;
      if (busy) lastBusy = now;
      agLayer.classList.toggle('is-off', !busy && now - lastBusy > 1200);
      updAgents(now, f);
      updHud(now, busy);
      const keep = busy || now - lastBusy < 3000 || (phase === 'done' && now - tEnd < 5200);
      if (keep) requestAnimationFrame(loop); else running = false;
    };
    const wake = () => {
      hud.hidden = false; hud.classList.remove('is-away');
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    };

    const start = () => {
      phase = 'scan'; t0 = performance.now(); tEnd = 0; built = 0;
      queue = []; pending = []; nextAt = 0;
      hud.hidden = false; hud.className = 'hud is-scan';
      hudMsg.textContent = 'Escaneando a página…'; bSkip.textContent = 'Pular';
      hDone.textContent = '0';
      scan.classList.add('is-on'); agLayer.classList.remove('is-off');
      spawnAgents();
      io && io.disconnect();
      io = new IntersectionObserver(onIO, { rootMargin: '0px 0px -6% 0px' });
      els.forEach(el => io.observe(el));
      wake();
    };
    const skip = () => {
      io && io.disconnect();
      active.forEach(j => { j.bx.remove(); j.guides && j.guides.forEach(g => g.remove()); if (j.agent) j.agent.job = null; });
      active = []; queue = []; pending = [];
      scan.classList.remove('is-on');
      els.forEach(markBuilt);
      finish(performance.now(), 'Página pronta · montagem pulada');
      lastBusy = performance.now() - 5000;
      wake();
    };
    const replay = () => {
      active.forEach(j => { j.bx.remove(); j.guides && j.guides.forEach(g => g.remove()); });
      active = [];
      els.forEach(el => { el.classList.remove('is-built', 'is-building'); clearInline(el); });
      jumpTop();
      start();
    };

    bSkip.addEventListener('click', () => (phase === 'done' ? replay() : skip()));
    bReplay.addEventListener('click', replay);
    bSpeed.addEventListener('click', () => {
      speed = speed >= 3 ? 1 : speed + 1;
      bSpeed.textContent = speed + '×';
    });

    start();
    return { replay };
  })();

  $('[data-replay]').addEventListener('click', () => Build.replay());
})();
