/* ============================================================
   ALGORITMOS DE BÚSQUEDA · AURORA DARK EDITION 2.0
   script.js — simuladores dinámicos + efectos
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- utilidades ---------------- */
  const $ = (id) => document.getElementById(id);
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (x) => x.toLocaleString('es-ES');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function parseList(id) {
    const raw = $(id).value;
    return raw.split(',').map(x => parseInt(x.trim(), 10)).filter(x => Number.isFinite(x));
  }

  /* ============================================================
     1 · FONDO DE ESTRELLAS + ESTRELLAS FUGACES
     ============================================================ */
  const canvas = $('stars-canvas');
  const sctx = canvas.getContext('2d');
  let stars = [];
  let shooting = [];

  function resizeCanvas() {
    canvas.width = Math.max(innerWidth, 320);
    canvas.height = Math.max(innerHeight, 240);
  }
  addEventListener('resize', resizeCanvas);
  resizeCanvas();

  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.9 + 0.25,
      cyan: Math.random() < 0.45
    });
  }

  function drawStars() {
    sctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const s of stars) {
      s.phase += 0.012 * s.speed;
      const b = 0.2 + 0.8 * Math.abs(Math.sin(s.phase));
      sctx.fillStyle = s.cyan
        ? `rgba(125, 211, 252, ${b.toFixed(2)})`
        : `rgba(226, 232, 240, ${b.toFixed(2)})`;
      sctx.beginPath();
      sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      sctx.fill();
    }

    if (!REDUCED && Math.random() < 0.005) {
      shooting.push({
        x: Math.random() * canvas.width * 0.7 + canvas.width * 0.1,
        y: Math.random() * canvas.height * 0.3,
        vx: 6 + Math.random() * 4,
        vy: 2.4 + Math.random() * 2.2,
        life: 1
      });
    }
    for (let i = shooting.length - 1; i >= 0; i--) {
      const sh = shooting[i];
      sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.022;
      const lx = sh.x - sh.vx * 9, ly = sh.y - sh.vy * 9;
      const grad = sctx.createLinearGradient(sh.x, sh.y, lx, ly);
      grad.addColorStop(0, `rgba(0, 240, 255, ${Math.max(sh.life, 0).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      sctx.strokeStyle = grad;
      sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.moveTo(sh.x, sh.y);
      sctx.lineTo(lx, ly);
      sctx.stroke();
      if (sh.life <= 0 || sh.x > canvas.width + 40 || sh.y > canvas.height + 40) shooting.splice(i, 1);
    }

    if (!REDUCED) requestAnimationFrame(drawStars);
  }
  drawStars();

  /* ============================================================
     2 · PROGRESO DE LECTURA + NAV ACTIVA + VOLVER ARRIBA
     ============================================================ */
  const progressBar = $('read-progress-bar');
  const toTop = $('toTop');
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const watchedIds = navLinks.map(a => a.getAttribute('href').slice(1));

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    toTop.classList.toggle('show', scrollY > 500);

    let current = null;
    const yLine = scrollY + 140;
    const sorted = watchedIds
      .map(id => ({ id, top: $(id) ? $(id).getBoundingClientRect().top + scrollY : Infinity }))
      .filter(w => w.top <= yLine)
      .sort((a, b) => a.top - b.top);
    if (sorted.length) current = sorted[sorted.length - 1].id;
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* ============================================================
     3 · ANIMACIÓN DE APARICIÓN (IntersectionObserver)
     ============================================================ */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('visible'); revealObs.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

  /* Contadores del hero */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      countObs.unobserve(en.target);
      const el = en.target;
      const target = parseInt(el.dataset.count, 10) || 0;
      const t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      if (REDUCED) el.textContent = target; else requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('.stat-num').forEach(el => countObs.observe(el));

  /* ============================================================
     4 · SUBTÍTULO DINÁMICO — máquina de escribir
     ============================================================ */
  const TYPE_LINES = [
    'Secuencial · simple y sin condiciones',
    'Binaria · divide y vencerás',
    'Hash · el dato se calcula, no se busca',
    'Aurora Dark Edition · análisis interactivo avanzado'
  ];
  const typeEl = $('typewriter');
  let tLine = 0, tChar = 0, tDel = false;

  function typewriter() {
    const full = TYPE_LINES[tLine];
    if (!tDel) {
      tChar++;
      if (tChar >= full.length) { tDel = true; setTimeout(typewriter, 2200); typeEl.textContent = full; return; }
    } else {
      tChar--;
      if (tChar <= 0) { tDel = false; tLine = (tLine + 1) % TYPE_LINES.length; }
    }
    typeEl.textContent = full.slice(0, tChar);
    setTimeout(typewriter, tDel ? 30 : 60);
  }
  if (!REDUCED) typewriter(); else typeEl.textContent = TYPE_LINES[0];

  /* ============================================================
     5 · DATO CURIOSO ROTATIVO (espacio dinámico)
     ============================================================ */
  const FACTS = [
    { e: '💡', t: 'La primera mención de la búsqueda binaria es de 1946 (John Mauchly), pero pasó 16 años hasta existir una implementación correcta para cualquier tamaño de arreglo.' },
    { e: '🚀', t: 'En una colección de 1 000 000 de elementos, la búsqueda secuencial puede hacer un millón de comparaciones… la binaria jamás supera 20.' },
    { e: '🐛', t: 'La búsqueda binaria de Java estuvo rota 9 años: con arreglos gigantes, (low + high) / 2 desbordaba el entero. Se corrigió con (low + high) >>> 1.' },
    { e: '💾', t: 'La idea de las tablas hash nació en 1953 con Hans Peter Luhn (IBM), buscando acelerar la recuperación de literatura científica en tarjetas perforadas.' },
    { e: '🟣', t: 'Los Dictionary de C#, los dict de Python y los objetos de JavaScript son tablas hash por debajo: tus datos cotidianos usan búsqueda O(1) todo el tiempo.' },
    { e: '⚛️', t: 'En computación cuántica, el algoritmo de Grover busca en datos desordenados usando O(√n) consultas: ¡más rápido que cualquier algoritmo clásico!' }
  ];
  const factText = $('fact-text');
  const factEmoji = $('fact-emoji');
  const factDots = $('fact-dots');
  let factIdx = 0, factTimer = null, factPaused = false;

  FACTS.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Dato curioso ' + (i + 1));
    b.addEventListener('click', () => showFact(i));
    factDots.appendChild(b);
  });

  function showFact(i) {
    factIdx = (i + FACTS.length) % FACTS.length;
    $('fact-card').classList.add('fading');
    setTimeout(() => {
      const f = FACTS[factIdx];
      factEmoji.textContent = f.e;
      factText.textContent = f.t;
      [...factDots.children].forEach((d, k) => d.classList.toggle('on', k === factIdx));
      $('fact-card').classList.remove('fading');
    }, REDUCED ? 0 : 380);
  }
  function autoFact() {
    if (factPaused) { factTimer = setTimeout(autoFact, 800); return; }
    showFact(factIdx + 1);
    factTimer = setTimeout(autoFact, 7000);
  }
  $('fact-card').addEventListener('mouseenter', () => { factPaused = true; });
  $('fact-card').addEventListener('mouseleave', () => { factPaused = false; });
  showFact(0);
  autoFact();

  /* ============================================================
     6 · EXPLORADOR BIG-O EN CANVAS (dinámico)
     ============================================================ */
  const bigOChart = $('bigO-chart');
  const octx = bigOChart.getContext('2d');
  let bigON = 16;

  function drawBigO(n) {
    const dpr = window.devicePixelRatio || 1;
    const W = bigOChart.clientWidth || 900, H = 300;
    bigOChart.width = W * dpr;
    bigOChart.height = H * dpr;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);

    const ops = [1, Math.max(1, Math.ceil(Math.log2(n))), n, n * n];
    const colors = ['#00ffaa', '#38bdf8', '#00f0ff', '#f472b6'];
    const labels = ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'];
    const subLabels = ['Hash', 'Binaria', 'Secuencial', 'Referencia'];

    const baseY = H - 54, topPad = 26;
    const maxLog = Math.log2(ops[3] + 2);
    const heights = ops.map(o => (Math.log2(o + 2) / maxLog) * (baseY - topPad));

    /* líneas de rejilla */
    octx.strokeStyle = 'rgba(255,255,255,0.06)';
    octx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = baseY - ((baseY - topPad) * g) / 4;
      octx.beginPath(); octx.moveTo(36, y); octx.lineTo(W - 16, y); octx.stroke();
    }

    const slot = (W - 60) / 4, barW = 52;
    ops.forEach((o, i) => {
      const cx = 36 + slot * i + slot / 2;
      const x = cx - barW / 2;
      const bh = Math.max(heights[i], 3);
      const y = baseY - bh;

      const grad = octx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, colors[i]);
      grad.addColorStop(1, colors[i] + '33');
      octx.fillStyle = grad;
      if (typeof octx.roundRect === 'function') {
        octx.beginPath();
        octx.roundRect(x, y, barW, bh, [8, 8, 0, 0]);
        octx.fill();
      } else {
        octx.fillRect(x, y, barW, bh);
      }

      octx.shadowColor = colors[i];
      octx.shadowBlur = 14;
      octx.fillRect(x, y, barW, 3);
      octx.shadowBlur = 0;

      octx.fillStyle = colors[i];
      octx.font = 'bold 13px "Fira Code", monospace';
      octx.textAlign = 'center';
      octx.fillText(labels[i], cx, y - 8);

      octx.fillStyle = '#94a3b8';
      octx.font = '11px "Fira Code", monospace';
      octx.fillText(subLabels[i], cx, baseY + 20);

      octx.fillStyle = '#cbd5e1';
      octx.font = 'bold 12px "Fira Code", monospace';
      octx.fillText(fmt(o), cx, baseY + 38);
    });

    $('val-hash').textContent = fmt(ops[0]);
    $('val-bin').textContent = fmt(ops[1]);
    $('val-seq').textContent = fmt(ops[2]);
    $('val-sq').textContent = fmt(ops[3]);
    $('bigO-n-val').textContent = 'n = ' + n;
  }

  $('bigO-n').addEventListener('input', (e) => { bigON = parseInt(e.target.value, 10); drawBigO(bigON); });
  addEventListener('resize', () => drawBigO(bigON));
  drawBigO(bigON);

  /* IntersectionObserver refuerzo para canvas: */
  const labAlert = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) drawBigO(bigON); });
  }, { threshold: 0.35 });
  labAlert.observe(bigOChart);

  /* ============================================================
     7 · PESTAÑAS DE CÓDIGO (C# / Pseudo)
     ============================================================ */
  document.querySelectorAll('[data-codetabs]').forEach(box => {
    const btns = box.querySelectorAll('.code-btn');
    const panels = box.querySelectorAll('.code-panel');
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      panels.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      box.querySelector(`.code-panel[data-lang="${b.dataset.lang}"]`).classList.add('active');
    }));
  });

  /* ============================================================
     8 · MOTOR DE SIMULADORES (play / paso / reset)
     ============================================================ */
  function labFactory(opts) {
    const lab = { steps: [], idx: 0, playing: false, timer: null };

    lab.speed = () => {
      const v = parseInt($(opts.speed).value, 10);
      return clamp(Number.isFinite(v) ? v : 700, 60, 2400);
    };
    lab.updatePlay = () => { $(opts.playBtn).textContent = lab.playing ? '⏸ Pausa' : '▶ Auto'; };
    lab.pause = () => { lab.playing = false; clearTimeout(lab.timer); lab.updatePlay(); };
    lab.build = () => { lab.pause(); opts.build(lab); lab.idx = 0; lab.render(); };
    lab.render = () => { if (lab.steps.length) opts.render(lab.steps[lab.idx], lab.idx, lab.steps.length); };

    lab.toggleRun = () => {
      if (lab.playing) { lab.pause(); return; }
      if (!lab.steps.length) { opts.build(lab); lab.idx = 0; }
      lab.playing = true; lab.updatePlay();
      const tick = () => {
        if (!lab.playing) return;
        if (lab.idx < lab.steps.length - 1) {
          lab.idx++; lab.render();
          lab.timer = setTimeout(tick, lab.speed());
        } else { lab.playing = false; lab.updatePlay(); }
      };
      lab.timer = setTimeout(tick, 300);
    };

    lab.stepOnce = () => {
      lab.pause();
      if (!lab.steps.length) { opts.build(lab); lab.idx = 0; }
      else if (lab.idx < lab.steps.length - 1) lab.idx++;
      lab.render();
    };

    $(opts.playBtn).addEventListener('click', lab.toggleRun);
    $(opts.stepBtn).addEventListener('click', lab.stepOnce);
    $(opts.resetBtn).addEventListener('click', () => lab.build());
    (opts.dirty || []).forEach(id => $(id).addEventListener('input', () => {
      lab.noWrite = true;      // mientras el usuario teclea, no reescribir el campo
      lab.build();
      lab.noWrite = false;
    }));
    return lab;
  }

  /* ============================================================
     9 · SIMULADOR 6.1 — BÚSQUEDA SECUENCIAL
     ============================================================ */
  const seqLab = labFactory({
    playBtn: 'seq-play', stepBtn: 'seq-step', resetBtn: 'seq-reset',
    speed: 'seq-speed', dirty: ['seq-array', 'seq-target'],
    build(lab) {
      const array = parseList('seq-array');
      const target = parseInt($('seq-target').value, 10);
      const steps = [];

      if (array.length === 0) {
        steps.push({ array, status: 'nf', idx: -1, comps: 0, msg: 'El arreglo está <b>vacío</b>: escribe valores separados por comas.' });
      } else if (!Number.isFinite(target)) {
        steps.push({ array, status: 'nf', idx: -1, comps: 0, msg: 'Escribe un <b>valor objetivo válido</b> (un número) para iniciar la búsqueda.' });
      } else {
        let comps = 0, found = false;
        for (let i = 0; i < array.length; i++) {
          comps++;
          if (array[i] === target) {
            steps.push({ array, status: 'found', idx: i, comps, msg: `🎉 ¡Encontrado! <b>${target}</b> ocupa la posición <b>[${i}]</b> tras <b>${comps}</b> comparación(es). Estar en la primera casilla es el mejor caso: O(1).` });
            found = true;
            break;
          } else {
            steps.push({ array, status: 'check', idx: i, comps, msg: `Comparación <b>${comps}</b>: posición [${i}] → ${array[i]} ≠ ${target}… sigo avanzando.` });
          }
        }
        if (!found) {
          steps.push({ array, status: 'nf', idx: -1, comps, msg: `💔 Recorrido completo: <b>${comps}</b> comparaciones y <b>${target}</b> no está en el arreglo. Clásico peor caso: O(n).` });
        }
      }
      lab.steps = steps;
    },
    render(step, sIdx, sTotal) {
      let html = '';
      step.array.forEach((v, idx) => {
        let cls = '';
        if (step.status === 'nf') cls = 'visited';
        else if (idx < step.idx) cls = 'visited';
        else if (idx === step.idx) cls = (step.status === 'found') ? 'found' : 'current';
        const ptr = (idx === step.idx && step.status !== 'nf') ? '▼' : '';
        html += `<div class="element-node"><div class="pointer-tag">${ptr}</div><div class="node-box ${cls}">${v}</div><div class="node-idx">[${idx}]</div></div>`;
      });
      $('seq-display').innerHTML = html;
      $('seq-comp').textContent = step.comps;
      $('seq-progress').textContent = `${sIdx + 1} / ${sTotal}`;
      $('seq-msg').innerHTML = step.msg;
    }
  });
  seqLab.build();

  /* ============================================================
     10 · SIMULADOR 6.2 — BÚSQUEDA BINARIA
     ============================================================ */
  const binLab = labFactory({
    playBtn: 'bin-play', stepBtn: 'bin-step', resetBtn: 'bin-reset',
    speed: 'bin-speed', dirty: ['bin-array', 'bin-target'],
    build(lab) {
      let array = parseList('bin-array');
      const target = parseInt($('bin-target').value, 10);
      const autoSorted = [...array].sort((a, b) => a - b);
      const wasSorted = array.length === autoSorted.length && array.every((v, i) => v === autoSorted[i]);
      array = autoSorted;
      if (!lab.noWrite) $('bin-array').value = array.join(', ');

      const steps = [];
      if (array.length === 0) {
        steps.push({ array, status: 'nf', lo: -1, hi: -1, mid: -1, disc: [], comps: 0, msg: 'El arreglo está <b>vacío</b>: escribe valores separados por comas.' });
      } else if (!Number.isFinite(target)) {
        steps.push({ array, status: 'nf', lo: -1, hi: -1, mid: -1, disc: [], comps: 0, msg: 'Escribe un <b>valor objetivo válido</b> (un número) para iniciar la búsqueda.' });
      } else {
        let lo = 0, hi = array.length - 1, comps = 0, found = false, disc = [];
        if (!wasSorted) {
          steps.push({ array, status: 'check', lo: 0, hi: array.length - 1, mid: -1, disc: [], comps: 0, msg: `⚙️ Los datos entraron desordenados: el simulador los <b>ordenó primero</b> (${array.join(', ')}). Requisito cumplido para O(log n).` });
        }
        let guard = 0;
        while (lo <= hi && guard++ < 80) {
          const mid = Math.floor((lo + hi) / 2);
          const v = array[mid];
          comps++;
          if (v === target) {
            steps.push({ array, status: 'found', lo, hi, mid, disc: [...disc], comps, msg: `🎉 Comparación <b>${comps}</b>: medio = [${mid}] → ${v} = ${target}. ¡Encontrado en <b>[${mid}]</b>! Ventana final [${lo}…${hi}].` });
            found = true;
            break;
          } else if (v < target) {
            steps.push({ array, status: 'check', lo, hi, mid, disc: [...disc], comps, msg: `Comparación <b>${comps}</b>: medio = [${mid}] → ${v} < ${target}. Descarto la mitad <b>izquierda</b> [${lo}…${mid}] y voy a la derecha.` });
            for (let i = lo; i <= mid; i++) disc.push(i);
            lo = mid + 1;
          } else {
            steps.push({ array, status: 'check', lo, hi, mid, disc: [...disc], comps, msg: `Comparación <b>${comps}</b>: medio = [${mid}] → ${v} > ${target}. Descarto la mitad <b>derecha</b> [${mid}…${hi}] y voy a la izquierda.` });
            for (let i = mid; i <= hi; i++) disc.push(i);
            hi = mid - 1;
          }
        }
        if (!found) {
          steps.push({ array, status: 'nf', lo: -1, hi: -1, mid: -1, disc: array.map((_, i) => i), comps, msg: `💔 La ventana quedó vacía tras <b>${comps}</b> comparaciones: <b>${target}</b> no existe en el arreglo. Eso es O(log n) incluso en el peor caso.` });
        }
      }
      lab.steps = steps;
    },
    render(step, sIdx, sTotal) {
      let html = '';
      step.array.forEach((v, idx) => {
        let state = step.disc.includes(idx) ? 'discarded' : '';
        if (step.mid >= 0 && idx === step.mid) state = (step.status === 'found') ? 'found' : 'current';

        let tag = '';
        if (step.status === 'check' || step.status === 'found') {
          if (idx === step.mid) tag = `<b class="tag-m">M</b>`;
          else if (idx === step.lo) tag = `<b class="tag-i">I</b>`;
          else if (idx === step.hi) tag = `<b class="tag-f">F</b>`;
        }
        html += `<div class="element-node"><div class="pointer-tag">${tag}</div><div class="node-box ${state}">${v}</div><div class="node-idx">[${idx}]</div></div>`;
      });
      $('bin-display').innerHTML = html;
      $('bin-comp').textContent = step.comps;
      $('bin-progress').textContent = `${sIdx + 1} / ${sTotal}`;
      $('bin-window').textContent = (step.status === 'nf') ? '∅' : `${step.lo} → ${step.hi}`;
      $('bin-msg').innerHTML = step.msg;
    }
  });
  binLab.build();

  /* ============================================================
     11 · SIMULADOR 6.3 — TABLA HASH (construcción + búsqueda animadas)
     ============================================================ */
  const hashState = {
    steps: [], idx: 0, timer: null,
    table: [], size: 7, coll: 0, probes: 0, placed: 0, built: false
  };

  function hashParse() {
    let s = parseInt($('hash-size').value, 10);
    if (!Number.isFinite(s) || s < 3) s = 3;
    if (s > 13) s = 13;
    $('hash-size').value = s;
    return s;
  }

  function hashEmptyStep(size, msg) {
    return {
      table: Array(size).fill(null), size, cur: -1, marker: '',
      coll: 0, probes: 0, placed: 0, msg: msg || 'Presiona 🏗️ <b>Construir</b> para ver cómo cada clave calcula su índice con la función hash.'
    };
  }

  function hashRender(step) {
    let html = '';
    step.table.forEach((val, idx) => {
      let cls = '';
      if (idx === step.cur) {
        cls = step.marker === 'hit' ? 'hit' : (step.marker === 'failed' ? 'failed' : 'probe');
      }
      const value = val !== null ? `<span class="slot-value">${val}</span>` : `<span class="slot-empty">vacío</span>`;
      html += `<div class="hash-slot ${cls}"><span class="idx-label">Índice ${idx}</span>${value}</div>`;
    });
    $('hash-table').innerHTML = html;
    $('hash-colls').textContent = step.coll;
    $('hash-load').textContent = Math.round((step.placed / step.size) * 100) + '%';
    $('hash-steps').textContent = step.probes;
    $('hash-msg').innerHTML = step.msg;
  }

  function hashBuildSteps() {
    const size = hashParse();
    const keys = parseList('hash-keys');
    const steps = [];
    const table = Array(size).fill(null);
    let coll = 0, probes = 0, placed = 0;

    if (keys.length === 0) {
      steps.push(hashEmptyStep(size, 'Escribe al menos una <b>clave numérica</b> para insertar.'));
      hashState.steps = steps; hashState.built = false; return;
    }

    steps.push({
      table: Array(size).fill(null), size, cur: -1, marker: '',
      coll: 0, probes: 0, placed: 0,
      msg: '🎯 <b>Reglas:</b> índice = clave <i>mod</i> tamaño · si la casilla está ocupada (colisión) se aplica <b>sondeo lineal</b> (la siguiente casilla).'
    });

    for (const k of keys) {
      const h = k % size;
      let i = h, myProbes = 0;
      const occupied = table[h] !== null;

      steps.push({
        table: [...table], size, cur: h, marker: 'probe',
        coll, probes, placed,
        msg: `🔑 Clave <b>${k}</b> · hash(${k}) = ${k} % ${size} = <b>${h}</b>. Casilla ${occupied ? `<b>ocupada</b> por ${table[h]}…` : 'libre ✔'}`
      });
      while (table[i] !== null && myProbes < size) {
        i = (i + 1) % size;
        myProbes++; probes++; coll++;
        steps.push({
          table: [...table], size, cur: i, marker: 'probe',
          coll, probes, placed,
          msg: `⚠️ <b>Colisión #${coll}</b> en clave ${k}: la casilla está ocupada → <b>sondeo lineal</b>… pruebo el índice [${i}].`
        });
      }
      if (table[i] !== null) {   // tabla llena: no hay dónde insertar
        steps.push({
          table: [...table], size, cur: i, marker: 'failed',
          coll, probes, placed,
          msg: `💥 <b>Tabla llena</b>: la clave ${k} no tiene casilla disponible. Aumenta el <b>tamaño N</b> o usa menos claves.`
        });
        continue;
      }
      table[i] = k;
      placed++;
      steps.push({
        table: [...table], size, cur: i, marker: 'hit',
        coll, probes, placed,
        msg: `✅ <b>${k}</b> almacenado en [<b>${i}</b>]${myProbes > 0 ? ` tras <b>${myProbes}</b> sondeo(s)` : ''}. Insertar cuesta O(1) promedio. Factor de carga: ${(placed / size * 100).toFixed(0)}%.`
      });
    }
    steps.push({
      table: [...table], size, cur: -1, marker: '',
      coll, probes, placed,
      msg: `🏗️ Tabla lista: <b>${placed}/${size}</b> casillas ocupadas, <b>${coll}</b> colisión(es) resueltas. Ahora puedes usar 🔎 <b>Buscar</b>.`
    });
    hashState.steps = steps;
    hashState.size = size;
    hashState.table = [...table];
    hashState.built = true;
  }

  function hashSearchSteps() {
    /* depende de que hashState.table ya esté construida (la vista la garantiza) */
    const size = hashState.size;
    const table = [...hashState.table];
    const target = parseInt($('hash-target').value, 10);
    const steps = [];

    if (!Number.isFinite(target) || !hashState.table.length) {
      const why = !hashState.table.length
        ? 'Construye primero la tabla con 🏗️ <b>Construir</b> (necesita al menos una clave).'
        : 'Escribe una <b>clave a buscar</b> válida.';
      steps.push({ table, size, cur: -1, marker: '', coll: hashState.coll, probes: hashState.probes, placed: hashState.placed, msg: why });
      hashState.steps = steps;
      return steps;
    }

    const h = target % size;
    let i = h, probesUsed = 0, found = false;

    steps.push({
      table, size, cur: i, marker: 'probe',
      coll: hashState.coll, probes: probesUsed, placed: hashState.placed,
      msg: `🔎 Buscando <b>${target}</b> · hash(${target}) = ${target} % ${size} = <b>${h}</b>. Voy directo a esa casilla — sin recorrer nada.`
    });

    let guard = 0;
    while (guard++ <= size) {
      const cur = table[i];
      if (cur === null) {
        steps.push({
          table, size, cur: i, marker: 'failed',
          coll: hashState.coll, probes: probesUsed, placed: hashState.placed,
          msg: `💔 Casilla [${i}] está vacía: fin del rastro de sondeo. <b>${target}</b> <b>no existe</b> en la tabla tras ${probesUsed} sondeo(s).`
        });
        break;
      } else if (cur === target) {
        probesUsed++;
        steps.push({
          table, size, cur: i, marker: 'hit',
          coll: hashState.coll, probes: probesUsed, placed: hashState.placed,
          msg: `🎉 Comparación ${probesUsed}: casilla [<b>${i}</b>] = ${cur} = objetivo. <b>Encontrado</b> sin recorrer la tabla: acceso <b>O(1)</b> promedio.`
        });
        found = true;
        break;
      } else {
        probesUsed++;
        steps.push({
          table, size, cur: i, marker: 'probe',
          coll: hashState.coll, probes: probesUsed, placed: hashState.placed,
          msg: `Comparación ${probesUsed}: casilla [${i}] = ${cur} ≠ ${target} → colisión en búsqueda, <b>sondeo lineal</b>… pruebo [${(i + 1) % size}].`
        });
        i = (i + 1) % size;
      }
    }
    hashState.steps = steps;
    return steps;
  }

  let hashTimer = null;
  function hashAutoPlay(steps, speed) {
    clearTimeout(hashTimer);
    let i = 0;
    hashRender(steps[0]);
    const tick = () => {
      i++;
      if (i < steps.length) { hashRender(steps[i]); hashTimer = setTimeout(tick, speed); }
    };
    hashTimer = setTimeout(tick, speed);
  }

  $('hash-build').addEventListener('click', () => {
    hashBuildSteps();
    hashState.searchMode = false;
    hashAutoPlay(hashState.steps, clamp(parseInt($('hash-speed').value, 10) || 500, 120, 2000));
  });

  $('hash-search').addEventListener('click', () => {
    if (!hashState.built) hashBuildSteps();       // construir rápido si no existía
    hashSearchSteps();
    hashAutoPlay(hashState.steps, clamp(parseInt($('hash-speed').value, 10) || 400, 120, 2000));
  });

  $('hash-reset').addEventListener('click', () => {
    clearTimeout(hashTimer);
    const size = hashParse();
    hashState.table = Array(size).fill(null);
    hashState.size = size;
    hashState.steps = [];
    hashState.idx = 0;
    hashState.coll = 0; hashState.probes = 0; hashState.placed = 0;
    hashState.built = false;
    hashRender(hashEmptyStep(size));
  });

  ['hash-size', 'hash-keys'].forEach(id => $(id).addEventListener('input', () => {
    clearTimeout(hashTimer);
    const size = hashParse();
    hashState.table = Array(size).fill(null);
    hashState.size = size;
    hashState.steps = [];
    hashState.built = false;
    hashState.coll = 0; hashState.probes = 0; hashState.placed = 0;
    hashRender(hashEmptyStep(size));
  }));

  $('hash-reset').click();

  /* ============================================================
     12 · 🏁 CARRERA: SECUENCIAL vs BINARIA
     ============================================================ */
  let raceTimerId = null;
  let raceRunning = false;

  function raceCells(container, array) {
    container.innerHTML = array.map(v => `<div class="cell">${v}</div>`).join('');
  }

  $('race-n').addEventListener('input', (e) => {
    $('race-n-val').textContent = 'n = ' + e.target.value;
  });

  $('race-go').addEventListener('click', () => {
    if (raceRunning) return;
    raceRunning = true;
    clearInterval(raceTimerId);
    const n = parseInt($('race-n').value, 10);
    const uniq = new Set();
    while (uniq.size < n) uniq.add(1 + Math.floor(Math.random() * 99));
    const arr = [...uniq].sort((a, b) => a - b);

    let target;
    if (Math.random() < 0.8) target = arr[Math.floor(Math.random() * n)];
    else { do { target = 1 + Math.floor(Math.random() * 99); } while (arr.includes(target)); }

    const seqCellsEl = $('race-seq-cells');
    const binCellsEl = $('race-bin-cells');
    raceCells(seqCellsEl, arr);
    raceCells(binCellsEl, arr);
    $('runner-seq').classList.remove('winner');
    $('runner-bin').classList.remove('winner');
    $('race-ratio').textContent = '';
    $('race-msg').innerHTML = `🎯 Objetivo sorteado: <b>${target}</b>… ¡a sus puestos!`;

    /* totales silenciosos */
    let seqTotal = 0;
    for (let i = 0; i < arr.length; i++) { seqTotal++; if (arr[i] === target) break; }

    const binWin = [];
    {
      let lo = 0, hi = n - 1, guard = 0;
      while (lo <= hi && guard++ < 60) {
        const mid = Math.floor((lo + hi) / 2);
        if (arr[mid] === target) { binWin.push({ mid, lo, hi }); break; }
        binWin.push({ mid, lo, hi });
        if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;
      }
    }
    const binTotal = binWin.length;

    let sIdx = 0, bIdx = 0;
    $('race-seq-count').textContent = '0';
    $('race-bin-count').textContent = '0';
    $('race-seq-bar').style.width = '0%';
    $('race-bin-bar').style.width = '0%';

    let seqDone = false, binDone = false;
    const finish = () => {
      if (!seqDone || !binDone) return;
      clearInterval(raceTimerId);
      raceRunning = false;
      const seqEl = $('runner-seq'), binEl = $('runner-bin');
      let msg, ratio;
      if (binTotal < seqTotal) {
        binEl.classList.add('winner');
        const factor = (seqTotal / binTotal).toFixed(1).replace('.0', '');
        msg = `🥇 <b>¡La búsqueda binaria gana!</b> Usó <b>${binTotal}</b> comparaciones frente a <b>${seqTotal}</b> de la secuencial para hallar <b>${target}</b>.`;
        ratio = `⚡ Ventaja: ${factor}× menos comparaciones. Con n = ${n}, son O(log n) vs O(n).`;
      } else if (seqTotal < binTotal) {
        seqEl.classList.add('winner');
        msg = `🥇 <b>Sorpresa: gana la secuencial</b> (${seqTotal} vs ${binTotal} comparaciones). El objetivo <b>${target}</b> estaba en la punta del arreglo: ¡mejor caso O(1)!`;
        ratio = `Lección: la “mejor” teoría depende de los datos… y de la suerte.`;
      } else {
        seqEl.classList.add('winner');
        binEl.classList.add('winner');
        msg = `🤝 <b>¡Empate!</b> Ambos algoritmos usaron ${seqTotal} comparaciones.`;
        ratio = `Con arreglos más grandes, la brecha a favor de binaria crece sin parar.`;
      }
      $('race-msg').innerHTML = msg;
      $('race-ratio').textContent = ratio;
    };

    const tick = () => {
      if (sIdx < seqTotal) {
        const cell = seqCellsEl.children[sIdx];
        if (cell) cell.classList.add(arr[sIdx] === target ? 'hit' : 'passed');
        sIdx++;
        $('race-seq-count').textContent = sIdx;
        $('race-seq-bar').style.width = Math.round((sIdx / seqTotal) * 100) + '%';
        if (sIdx >= seqTotal) { seqDone = true; finish(); }
      } else if (!seqDone) { seqDone = true; finish(); }

      if (bIdx < binTotal) {
        const st = binWin[bIdx];
        const kids = binCellsEl.children;
        [...binCellsEl.querySelectorAll('.mid')].forEach(c => { c.classList.remove('mid'); c.classList.add('passed'); });
        for (let j = 0; j < kids.length; j++) {
          if (j < st.lo || j > st.hi) kids[j].style.opacity = '0.3';
        }
        const midCell = kids[st.mid];
        if (midCell) midCell.classList.add(arr[st.mid] === target ? 'hit' : 'mid');
        bIdx++;
        $('race-bin-count').textContent = bIdx;
        $('race-bin-bar').style.width = Math.round((bIdx / binTotal) * 100) + '%';
        if (bIdx >= binTotal) { binDone = true; finish(); }
      } else if (!binDone) { binDone = true; finish(); }
    };
    setInterval(tick, 180);
  });

  /* ============================================================
     13 · 🎯 QUIZ AUTOEVALUATIVO
     ============================================================ */
  const QUIZ = [
    {
      q: '¿Qué requisito es INDISPENSABLE para que la búsqueda binaria funcione?',
      opts: ['Que la lista no tenga duplicados', 'Que los datos estén ordenados', 'Tener una función hash', 'Que la lista sea pequeña'],
      a: 1,
      f: 'Sin orden no se puede descartar mitades con certeza: el requisito cambia O(n) → O(log n).'
    },
    {
      q: '¿Cuál es la complejidad del PEOR caso de la búsqueda secuencial?',
      opts: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
      a: 2,
      f: 'El elemento está al final o no existe: hay que comparar todas las posiciones.'
    },
    {
      q: 'En 1 000 000 de elementos ORDENADOS, la binaria halla el objetivo tras…',
      opts: ['≈ 20 comparaciones', '≈ 1 000 comparaciones', '≈ 10 000 comparaciones', '≈ 1 000 000 comparaciones'],
      a: 0,
      f: '⌈log₂(1 000 000)⌉ = 20. Duplicar los datos solo agrega 1 comparación más.'
    },
    {
      q: 'Una colisión en una tabla hash ocurre cuando…',
      opts: ['La tabla se queda sin casillas', 'Dos claves distintas calculan el mismo índice', 'El usuario repite la misma búsqueda', 'El arreglo está desordenado'],
      a: 1,
      f: 'hash(k₁) % N = hash(k₂) % N con k₁ ≠ k₂. Se resuelve con sondeo lineal, encadenamiento, etc.'
    },
    {
      q: 'El punto fuerte de la búsqueda hash es…',
      opts: ['Conservar los datos ordenados', 'Buscar por rangos de valor', 'Acceso promedio en tiempo constante O(1)', 'No requerir memoria adicional'],
      a: 2,
      f: 'Calcula la dirección del dato sin comparar elementos; a cambio, pierde el orden y ocupa tabla.'
    },
    {
      q: 'El caso PROMEDIO de la búsqueda secuencial inspecciona aproximadamente…',
      opts: ['La mitad: (n+1)/2 elementos', 'Solo el primer elemento', 'log₂(n) elementos', 'Los n² elementos'],
      a: 0,
      f: 'Promediando los costos 1+2+…+n entre n casos resulta (n+1)/2 ≈ n/2: lineal de nuevo.'
    },
    {
      q: '¿Qué ventaja tiene el ENCADENAMIENTO frente al sondeo lineal?',
      opts: ['No necesita función hash', 'Cada casilla guarda una lista: la tabla nunca se "llena"', 'Jamás produce colisiones', 'Ocupa siempre menos memoria'],
      a: 1,
      f: 'Con factor de carga ≥ 1 las cadenas siguen funcionando; el sondeo lineal degrada y hasta puede ciclar.'
    }
  ];

  const quizArea = $('quiz-area');
  $('quiz-total').textContent = QUIZ.length;
  let quizScore = 0, quizAnswered = 0;

  function quizRender() {
    quizScore = 0; quizAnswered = 0;
    $('quiz-score').textContent = '0';
    $('quiz-final').hidden = true;
    quizArea.innerHTML = QUIZ.map((item, qi) => `
      <div class="quiz-card" data-q="${qi}">
        <p class="quiz-q"><span class="qn">Q${qi + 1}.</span>${item.q}</p>
        <div class="quiz-opts">
          ${item.opts.map((o, oi) => `<button class="quiz-opt" data-q="${qi}" data-o="${oi}">${o}</button>`).join('')}
        </div>
        <p class="quiz-feedback" id="qfb-${qi}"></p>
      </div>
    `).join('');
  }

  quizArea.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-opt');
    if (!btn || btn.disabled) return;
    const qi = +btn.dataset.q, oi = +btn.dataset.o;
    const card = quizArea.querySelector(`.quiz-card[data-q="${qi}"]`);
    if (card.dataset.done) return;
    card.dataset.done = '1';
    card.classList.add('done');

    card.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; });
    const correct = btn.dataset.o == QUIZ[qi].a;
    if (correct) {
      btn.classList.add('correct');
      quizScore++;
    } else {
      btn.classList.add('incorrect');
      card.querySelector(`.quiz-opt[data-o="${QUIZ[qi].a}"]`).classList.add('correct');
    }
    const fb = card.querySelector('.quiz-feedback');
    fb.textContent = (correct ? '✔ ' : '✘ ') + QUIZ[qi].f;
    fb.classList.add('show');

    quizAnswered++;
    $('quiz-score').textContent = quizScore;

    if (quizAnswered === QUIZ.length) {
      const box = $('quiz-final');
      let verdict;
      if (quizScore === QUIZ.length) verdict = `🏆 <b>¡PERFECTO! ${quizScore}/${QUIZ.length}.</b> Dominas secuencial, binaria y hash: nivel experto de la Unidad 6.`;
      else if (quizScore >= QUIZ.length - 1) verdict = `🎉 <b>${quizScore}/${QUIZ.length}.</b> ¡Muy bien! Revisa el apartado fallado y tendrás el 10/10.`;
      else if (quizScore >= Math.ceil(QUIZ.length / 2)) verdict = `👍 <b>${quizScore}/${QUIZ.length}.</b> Buen nivel: vuelve a ejecutar los simuladores y reintenta el quiz.`;
      else verdict = `📚 <b>${quizScore}/${QUIZ.length}.</b> Explora los simuladores con calma y reintenta: ¡cada animación consolida el aprendizaje!`;
      box.innerHTML = verdict;
      box.hidden = false;
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  $('quiz-reset').addEventListener('click', quizRender);
  quizRender();

  /* ============================================================
     14 · 📖 GLOSARIO CON FILTRADO EN VIVO
     ============================================================ */
  const GLOSSARY = [
    ['Algoritmo', 'Secuencia finita y ordenada de pasos que resuelve un problema: aquí, localizar un dato en una colección.'],
    ['Búsqueda', 'Proceso de localizar el elemento cuya clave coincide con un valor objetivo, y devolver su posición.'],
    ['Complejidad temporal', 'Estimación del tiempo de ejecución de un algoritmo en función del tamaño n de la entrada.'],
    ['Notación Big-O', 'Describe el límite de crecimiento del gasto de recursos; ignora constantes y términos menores (Knuth, 1976).'],
    ['Clave (key)', 'Campo que identifica a un registro y sobre el cual se realizan las búsquedas.'],
    ['Función hash', 'Transforma una clave en un índice dentro de la tabla: hash(clave) % tamaño.'],
    ['Colisión', 'Dos claves distintas producen el mismo índice hash. Inevitable por el principio del palomar.'],
    ['Sondeo lineal', 'Política de colisiones: si la casilla está ocupada, se prueba linealmente la siguiente ((i+1) % tamaño).'],
    ['Factor de carga', 'Fracción de casillas ocupadas (α = ocupadas / total). Con α alto, crecen las colisiones; conviene redimensionar cerca de 0.7.'],
    ['Dividir y vencerás', 'Estrategia de la búsqueda binaria: dividir el intervalo a la mitad en cada comparación.'],
    ['O(log n)', 'Crecimiento logarítmico: al duplicar n, el trabajo crece en una unidad. Base típica del logaritmo: 2.'],
    ['Caso mejor / promedio / peor', 'Los tres escenarios estándar para analizar un algoritmo: suerte extrema, media estadística y apuesta desfavorable.']
  ];

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function glossRender(filterText) {
    const f = norm((filterText || '').trim());
    let shown = 0;
    const html = GLOSSARY.filter(([t, d]) => norm(t).includes(f) || norm(d).includes(f)).map(([term, def]) => {
      shown++;
      return `<div class="g-item"><dt>📌 ${term}</dt><dd>${def}</dd></div>`;
    }).join('');
    $('glossary-list').innerHTML = html || '<div class="g-item"><dt>Sin coincidencias</dt><dd>Prueba con “hash”, “colisión” o “Big O”.</dd></div>';
    $('gloss-count').textContent = `${shown} de ${GLOSSARY.length} términos`;
  }
  $('glossary-search').addEventListener('input', (e) => glossRender(e.target.value));
  glossRender('');

  /* ============================================================
     16 · 🌳 ÁRBOL DE DECISIONES DE LA BINARIA (SVG dinámico)
     ============================================================ */
  const treeWrap = $('tree-wrap');
  const treeSvg = $('tree-svg');
  const treeN = $('tree-n');
  const treeNodes = [];

  function treeBuild(n) {
    treeNodes.length = 0;
    (function rec(lo, hi, depth, parent) {
      if (lo > hi) return;
      const mid = Math.floor((lo + hi) / 2);
      const id = treeNodes.length;
      treeNodes.push({ mid, depth, parent });
      rec(lo, mid - 1, depth + 1, id);
      rec(mid + 1, hi, depth + 1, id);
    })(0, n - 1, 0, -1);
  }

  function treeDraw() {
    if (!treeWrap || !treeSvg) return;
    const n = parseInt(treeN.value, 10);
    treeBuild(n);
    const maxD = Math.max(...treeNodes.map(x => x.depth));
    const W = Math.max(620, treeWrap.clientWidth - 16);
    const H = 66 + (maxD + 1) * 58;

    const stepX = (W - 40) / n;
    treeNodes.forEach(nd => {
      nd.x = Math.round(20 + (nd.mid + 0.5) * stepX);
      nd.y = 46 + nd.depth * 58;
    });

    treeSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    treeSvg.setAttribute('width', W);
    treeSvg.setAttribute('height', H);
    treeSvg.style.height = H + 'px';

    let out = '';
    treeNodes.forEach((nd, i) => {
      if (nd.parent >= 0) {
        const p = treeNodes[nd.parent];
        out += `<line class="edge" x1="${p.x}" y1="${p.y}" x2="${nd.x}" y2="${nd.y}"></line>`;
      }
    });
    treeNodes.forEach((nd, i) => {
      out += `<circle class="nnode${nd.depth === 0 ? ' root' : ''}" data-id="${i}" cx="${nd.x}" cy="${nd.y}" r="17"></circle>`;
    });
    treeNodes.forEach((nd, i) => {
      out += `<text data-id="${i}" x="${nd.x}" y="${nd.y + 4}" text-anchor="middle">${nd.mid}</text>`;
    });
    treeSvg.innerHTML = out;

    $('tree-n-val').textContent = 'n = ' + n;
    $('tree-info').innerHTML =
      `Árbol con <b>${n}</b> nodos y <b>${maxD + 1}</b> niveles ⇒ ⌈log₂ ${n}⌉ = <b>${maxD + 1}</b> comparaciones en el peor caso. ` +
      `La raíz es la primera comparación (morado).`;
  }

  function treePath(e) {
    const c = e.target.closest('circle.nnode');
    treeSvg.querySelectorAll('.take').forEach(x => x.classList.remove('take'));
    if (!c) return;
    const id = +c.dataset.id;
    let idx = id;
    while (idx >= 0) {
      treeSvg.querySelector(`circle[data-id="${idx}"]`)?.classList.add('take');
      idx = treeNodes[idx].parent;
    }
    const nd = treeNodes[id];
    $('tree-info').innerHTML =
      `Nodo [<b>${nd.mid}</b>] queda en el <b>nivel ${nd.depth}</b> ⇒ localizarlo cuesta exactamente <b>${nd.depth + 1}</b> comparación(es)`;
  }
  if (treeWrap) {
    treeWrap.addEventListener('mousemove', treePath);
    treeWrap.addEventListener('touchstart', (e) => treePath(e), { passive: true });
    treeWrap.addEventListener('mouseleave', () => {
      treeSvg.querySelectorAll('.take').forEach(x => x.classList.remove('take'));
    });
    treeN.addEventListener('input', treeDraw);
    addEventListener('resize', treeDraw);
    const treeObs = new IntersectionObserver((en) => {
      en.forEach(x => { if (x.isIntersecting) treeDraw(); });
    }, { threshold: 0.3 });
    treeObs.observe(treeWrap);
    treeDraw();
  }

  /* ============================================================
     17 · ⚔️ DUELO DE RESOLUTORES DE COLISIONES (Hash)
     ============================================================ */
  const METHOD_NAMES = {
    linear: 'Sondeo lineal',
    quadratic: 'Sondeo cuadrático',
    double: 'Doble dispersión',
    chain: 'Encadenamiento (listas)'
  };
  const METHOD_DESC = {
    linear: 'la casilla siguiente <span class="mono">((i+1) mod N)</span>: simple, pero forma racimos <i>(agrupamiento primario)</i>.',
    quadratic: 'salta <span class="mono">1², 2², 3²…</span>: rompe los racimos; necesita N primo y carga baja.',
    double: 'el paso lo define un segundo hash <span class="mono">(1 + k mod (N−1))</span>: repartir casi perfecto sin listas.',
    chain: 'cada casilla guarda una <b>lista</b>: α puede superar 1 y borrar es trivial; cuesta referencias extra.'
  };

  function csolParse() {
    let size = parseInt($('csol-size').value, 10);
    if (!Number.isFinite(size)) size = 7;
    size = clamp(size, 3, 11);
    $('csol-size').value = size;
    return {
      size,
      keys: parseList('csol-keys'),
      method: $('csol-method').value
    };
  }

  function csolSnapshot(t, chain) {
    return chain ? t.map(b => [...b]) : [...t];
  }

  function csolBuildSteps() {
    const { size, keys, method } = csolParse();
    const chain = method === 'chain';
    const table = chain ? Array.from({ length: size }, () => []) : Array(size).fill(null);
    const steps = [];
    let coll = 0, probes = 0, placed = 0;
    const push = (cur, marker, msg) => steps.push({
      table: csolSnapshot(table, chain), size, cur, marker, method, coll, probes, placed, msg
    });

    push(-1, '', `⚖️ Política: <b>${METHOD_NAMES[method]}</b> — ${METHOD_DESC[method]}`);

    for (const k of keys) {
      const h = k % size;

      if (chain) {
        const occ = table[h].length > 0;
        if (occ) coll++;
        push(h, 'probe',
          `🔑 ${k} · hash(${k}) = ${k} % ${size} = <b>${h}</b>. Casilla ${occ ? `con [${table[h].join(', ')}] ⇒ <b>se encadena</b>` : 'libre ✔'}.`);
        table[h].push(k);
        placed++;
        push(h, 'hit',
          `✅ <b>${k}</b> añadido a la lista de [${h}] — ahora ${table[h].length} elemento(s) comparten ese índice.`);
        continue;
      }

      const h2 = method === 'double' ? (1 + (k % (size - 1))) : 1;
      let i = h, at = 0;
      while (table[i] !== null && at < size) {
        at++; coll++; probes++;
        if (method === 'linear') i = (h + at) % size;
        else if (method === 'quadratic') i = (h + at * at) % size;
        else i = (h + at * h2) % size;
        push(i, 'probe',
          `⚠️ Colisión #${coll} en clave ${k} ⇒ sondeo ${at}: pruebo [<b>${i}</b>]${method === 'quadratic' ? ` (salto ${at}²)` : method === 'double' ? ` (paso ${h2})` : ''}.`);
      }
      if (table[i] !== null) {
        push(i, 'failed',
          `💥 Sin casilla disponible para ${k}: la política se cicló. Usa un <b>N primo mayor</b> o cambia a encadenamiento.`);
        continue;
      }
      table[i] = k;
      placed++;
      push(i, 'hit',
        `✅ <b>${k}</b> almacenado en [<b>${i}</b>]${at > 0 ? ` tras <b>${at}</b> sondeo(s)` : ' al primer intento'}.`);
    }

    push(-1, '',
      `🏁 Completado con <b>${METHOD_NAMES[method]}</b>: <b>${coll}</b> colisiones, <b>${probes}</b> sondeos y ${placed}/${size} casillas ocupadas. Cambia la política y repite para comparar.`);
    return steps;
  }

  function csolRender(step) {
    const chain = step.method === 'chain';
    let html = '';
    step.table.forEach((slot, idx) => {
      let cls = '';
      if (idx === step.cur) cls = step.marker === 'hit' ? 'hit' : (step.marker === 'failed' ? 'failed' : 'probe');
      let value;
      if (chain) {
        value = slot.length ? `<span class="slot-chain">${slot.join(' → ')}</span>` : `<span class="slot-empty">vacío</span>`;
      } else {
        value = slot !== null ? `<span class="slot-value">${slot}</span>` : `<span class="slot-empty">vacío</span>`;
      }
      const chainedCls = chain && slot.length > 1 ? ' chained' : '';
      html += `<div class="hash-slot ${cls}${chainedCls}"><span class="idx-label">Índice ${idx}</span>${value}</div>`;
    });
    $('csol-table').innerHTML = html;
    $('csol-colls').textContent = step.coll;
    $('csol-probes').textContent = step.probes;
    $('csol-occ').textContent = Math.round((step.placed / step.size) * 100) + '%';
    $('csol-msg').innerHTML = step.msg;
  }

  let csolTimer = null;
  function csolPlay(steps) {
    clearTimeout(csolTimer);
    let i = 0;
    csolRender(steps[0]);
    const tick = () => {
      i++;
      if (i < steps.length) {
        csolRender(steps[i]);
        csolTimer = setTimeout(tick, clamp(parseInt($('csol-speed').value, 10) || 420, 90, 1800));
      }
    };
    csolTimer = setTimeout(tick, clamp(parseInt($('csol-speed').value, 10) || 420, 90, 1800));
  }

  function csolReset() {
    clearTimeout(csolTimer);
    const { size, method } = csolParse();
    csolRender({
      table: method === 'chain' ? Array.from({ length: size }, () => []) : Array(size).fill(null),
      size, cur: -1, marker: '', method, coll: 0, probes: 0, placed: 0,
      msg: 'Elige una política y presiona 🏗️ <b>Comparar</b> para verla en acción.'
    });
  }

  $('csol-build').addEventListener('click', () => csolPlay(csolBuildSteps()));
  $('csol-reset').addEventListener('click', csolReset);
  ['csol-method', 'csol-size', 'csol-keys'].forEach(id => $(id).addEventListener('change', csolReset));
  csolReset();

  /* ============================================================
     AÑO (si existiera un elemento #year)
     ============================================================ */
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  console.log('%c🚀 Aurora Dark Edition 2.0 cargada', 'color:#00f0ff;font-weight:bold');
});
