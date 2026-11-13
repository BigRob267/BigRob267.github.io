// Portfolio behavior: slow circuit-board background, scroll progress, nav highlight, logo tilt,
// card spotlight, stat count-up, scroll reveal. Respects prefers-reduced-motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- circuit board background (slow) ---------- */
  const cv = document.getElementById('board'), ctx = cv.getContext('2d');
  const G = 28;
  let traces = [], pulses = [], W, H;

  function build() {
    const dpr = window.devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    traces = []; pulses = [];
    const n = Math.round((W * H) / 26000);
    const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
    for (let i = 0; i < n; i++) {
      let x = Math.floor(Math.random() * W / G) * G, y = Math.floor(Math.random() * H / G) * G;
      let [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      const pts = [[x, y]];
      const segs = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segs; s++) {
        const len = (2 + Math.floor(Math.random() * 6)) * G;
        x += dx * len; y += dy * len; pts.push([x, y]);
        const jog = (Math.random() < .5 ? 1 : -1) * G;
        if (dx) { y += jog; x += dx * G; } else { x += jog; y += dy * G; }
        pts.push([x, y]);
      }
      traces.push(pts);
    }
  }
  const len = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]); return L; };
  function at(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i-1], [bx, by] = pts[i], s = Math.hypot(bx-ax, by-ay);
      if (d <= s) return [ax + (bx-ax) * d / s, ay + (by-ay) * d / s];
      d -= s;
    }
    return pts[pts.length - 1];
  }
  let scrollY = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, -scrollY * 0.08);   // gentle parallax on scroll
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(240,64,4,0.16)';
    for (const p of traces) {
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.stroke();
      for (const e of [p[0], p[p.length-1]]) { ctx.beginPath(); ctx.arc(e[0], e[1], 3.2, 0, 7); ctx.fillStyle = 'rgba(240,64,4,0.3)'; ctx.fill(); }
    }
    if (!still) {
      if (pulses.length < 9 && Math.random() < .035) {
        const t = traces[Math.floor(Math.random() * traces.length)];
        pulses.push({ t, d: 0, L: len(t), v: 0.45 + Math.random() * 0.55 });   // slower than before
      }
      for (const p of pulses) {
        p.d += p.v;
        const [x, y] = at(p.t, p.d);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, 'rgba(255,120,40,0.9)'); g.addColorStop(1, 'rgba(240,64,4,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
      }
      pulses = pulses.filter(p => p.d < p.L);
    }
    ctx.restore();
    if (!still) requestAnimationFrame(draw);
  }
  build(); draw();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (still) draw(); }, 200); });

  /* ---------- scroll: progress bar, header, nav highlight, background parallax ---------- */
  const bar = document.getElementById('progress'), header = document.getElementById('header');
  const links = [...document.querySelectorAll('nav a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));
  function onScroll() {
    scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    header.classList.toggle('scrolled', scrollY > 30);
    let cur = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- logo tilt follows the mouse ---------- */
  const tilt = document.getElementById('tilt');
  if (tilt && !still) {
    const wrap = tilt.parentElement;
    wrap.addEventListener('mousemove', e => {
      const r = tilt.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `rotateY(${px * 18}deg) rotateX(${-py * 18}deg)`;
    });
    wrap.addEventListener('mouseleave', () => { tilt.style.transform = ''; });
  }

  /* ---------- scroll reveal + stat count-up ---------- */
  document.querySelectorAll('.panel, .stats, .chip-card, .feature, .stack-grid > div').forEach(n => n.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    e.target.querySelectorAll('[data-count]').forEach(b => {
      const end = +b.dataset.count, suffix = b.dataset.suffix || '', t0 = performance.now(), dur = still ? 0 : 1400;
      const step = now => {
        const k = dur ? Math.min(1, (now - t0) / dur) : 1;
        b.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + (k === 1 ? suffix : '');
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }), { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(n => io.observe(n));

  document.getElementById('year').textContent = new Date().getFullYear();
})();
