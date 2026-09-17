/**
 * X-Trust · Human Trust Layer — client application.
 * Single deferred bundle: counter, sparkline, behavioural demo,
 * session persistence, presence decay, OSS footprint, Paddle checkout.
 */
(function xTrust() {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Configuration
   * ------------------------------------------------------------------ */

  const TRUST_COUNTER_URL =
    'https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter';

  const COUNTER_POLL_MS = 5000;      // single source of truth
  const COUNTER_ANIM_MS = 1200;
  const COUNTER_FETCH_TIMEOUT_MS = 8000;
  const MAX_HISTORY = 60;

  const TOKEN_TTL_SECONDS = 120;
  const TYPING_IDLE_MS = 800;
  const BASE_HUMAN_SCORE = 0.3;
  const HUMAN_THRESHOLD = 0.6;

  const KEYSTROKE_WINDOW = 20;
  const SCROLL_WINDOW = 20;
  const TOUCH_WINDOW = 20;
  const POINTER_WINDOW = 30;
  const CLICK_WINDOW = 50;

  const SESSION_KEY = 'xtrust_session';
  const SESSION_SAVE_MS = 5000;

  const PADDLE_CLIENT_TOKEN = 'live_2561f1b60b58e65cbfb855f79e8';

  const OPEN_PR_COUNT = 9;
  const OPEN_PR_TARGETS =
    'LiteLLM · Hono · Portkey · vLLM · tRPC · BentoML · FastAPI · LangChain';
  const JSR_PACKAGE_URL = 'https://jsr.io/@htl-syterme/htl-core';
  const JSR_INSTALL_HINT = 'deno add jsr:@htl-syterme/htl-core';

  /* ------------------------------------------------------------------ *
   * DOM references
   * ------------------------------------------------------------------ */

  const dom = {
    counter: document.getElementById('counter'),
    updateTime: document.getElementById('updateTime'),
    sparkPath: document.getElementById('sparkPath'),
    sparkArea: document.getElementById('sparkArea'),
    sparkDot: document.getElementById('sparkDot'),
    demoInput: document.getElementById('demo-input'),
    demoScore: document.getElementById('demo-score'),
    demoTtl: document.getElementById('demo-ttl'),
    demoStatus: document.getElementById('demo-status'),
    demoToken: document.getElementById('demo-token'),
    presenceDecay: document.getElementById('presence-decay'),
  };

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  const counter = { current: 0, history: [], frame: null };

  const demo = {
    keystrokes: [],
    scrolls: [],
    touches: [],
    pointers: [],
    clicks: [],
    zones: { top: 0, mid: 0, bot: 0 },
    typingTimer: null,
    ttlTimer: null,
    score: BASE_HUMAN_SCORE,
    attestedScore: BASE_HUMAN_SCORE,
    viewportHeight: window.innerHeight,
  };

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  const formatNumber = (v) => Math.round(v).toLocaleString('en-US');
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const coefficientOfVariation = (values) => {
    if (!values.length) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean <= 0) return 0;
    const variance =
      values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  };

  const gapsOf = (ts) => ts.slice(1).map((t, i) => t - ts[i]);

  const pushSample = (buf, v, limit) => {
    buf.push(v);
    if (buf.length > limit) buf.shift();
    return buf;
  };

  const clampScore = (s) => Math.min(0.99, Math.max(0, s));

  /* ------------------------------------------------------------------ *
   * Counter data source
   * ------------------------------------------------------------------ */

  const fetchVerificationTotal = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), COUNTER_FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(TRUST_COUNTER_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const value = Number(
        data && (data.total_verifs != null ? data.total_verifs
          : data.count != null ? data.count
          : data.value != null ? data.value
          : data.total != null ? data.total
          : (typeof data === 'number' ? data : null))
      );
      if (!Number.isFinite(value)) throw new Error('Invalid counter payload');
      return value;
    } finally {
      clearTimeout(timer);
    }
  };

  const stampLastUpdate = () => {
    if (!dom.updateTime) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    dom.updateTime.textContent =
      'Last update: ' + pad(now.getHours()) + ':' +
      pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  };

  const markCounterOffline = () => {
    if (!dom.updateTime) return;
    dom.updateTime.textContent = 'Live connection · retrying…';
  };

  /* ------------------------------------------------------------------ *
   * Sparkline
   * ------------------------------------------------------------------ */

  const renderSparkline = () => {
    if (!dom.sparkPath || !dom.sparkArea) return;

    const W = 720, H = 80, padY = 10;
    const { history } = counter;

    if (history.length < 2) {
      dom.sparkPath.setAttribute('d', '');
      dom.sparkArea.setAttribute('d', '');
      if (dom.sparkDot) dom.sparkDot.style.display = 'none';
      return;
    }

    const min = Math.min.apply(null, history);
    const max = Math.max.apply(null, history);
    const range = max - min || 1;

    const points = history.map(function (v, i) {
      return [
        (i / (history.length - 1)) * W,
        padY + (1 - (v - min) / range) * (H - padY * 2),
      ];
    });

    let d = 'M ' + points[0][0].toFixed(2) + ' ' + points[0][1].toFixed(2);
    for (let i = 1; i < points.length; i += 1) {
      const x0 = points[i - 1][0], y0 = points[i - 1][1];
      const x1 = points[i][0], y1 = points[i][1];
      const cx = (x0 + x1) / 2;
      d += ' C ' + cx.toFixed(2) + ' ' + y0.toFixed(2) + ', ' +
           cx.toFixed(2) + ' ' + y1.toFixed(2) + ', ' +
           x1.toFixed(2) + ' ' + y1.toFixed(2);
    }
    dom.sparkPath.setAttribute('d', d);

    const last = points[points.length - 1];
    dom.sparkArea.setAttribute(
      'd',
      d + ' L ' + last[0].toFixed(2) + ' ' + H +
      ' L ' + points[0][0].toFixed(2) + ' ' + H + ' Z'
    );

    if (dom.sparkDot) {
      dom.sparkDot.setAttribute('cx', last[0].toFixed(2));
      dom.sparkDot.setAttribute('cy', last[1].toFixed(2));
      dom.sparkDot.style.display = 'block';
    }
  };

  const setupSparkline = () => {
    counter.history = [];
    renderSparkline();
  };

  /* ------------------------------------------------------------------ *
   * Counter (single poll — fixes double-polling bug)
   * ------------------------------------------------------------------ */

  const animateCounterTo = (target, duration) => {
    duration = duration || COUNTER_ANIM_MS;
    if (!dom.counter) return;

    const start = counter.current;
    const delta = target - start;
    if (delta === 0) return;

    const startedAt = performance.now();
    dom.counter.classList.add('updating');
    if (counter.frame) cancelAnimationFrame(counter.frame);

    const tick = (now) => {
      const t = Math.min((now - startedAt) / duration, 1);
      dom.counter.textContent = formatNumber(start + delta * easeOutExpo(t));
      if (t < 1) { counter.frame = requestAnimationFrame(tick); return; }
      counter.current = target;
      dom.counter.textContent = formatNumber(target);
      dom.counter.classList.remove('updating');
    };
    counter.frame = requestAnimationFrame(tick);
  };

  const pulseCounter = () => {
    if (!dom.counter) return;
    dom.counter.style.transform = 'scale(1.15)';
    dom.counter.style.transition = 'transform 0.3s ease';
    setTimeout(() => { dom.counter.style.transform = 'scale(1)'; }, 300);
  };

  const refreshCounter = async () => {
    try {
      const value = await fetchVerificationTotal();
      pushSample(counter.history, value, MAX_HISTORY);
      renderSparkline();
      if (value !== counter.current) pulseCounter();
      animateCounterTo(value);
      stampLastUpdate();
    } catch (err) {
      console.warn('[X-Trust] counter fetch failed:', err);
      markCounterOffline();
    }
  };

  const setupCounter = () => {
    if (!dom.counter) return;
    dom.counter.textContent = formatNumber(0);
    refreshCounter();
    setInterval(refreshCounter, COUNTER_POLL_MS);
  };

  /* ------------------------------------------------------------------ *
   * Demo token
   * ------------------------------------------------------------------ */

  const buildDemoToken = (score, issuedAt) => {
    issuedAt = issuedAt || Date.now();
    const iat = Math.floor(issuedAt / 1000);
    const payload = { sub: 'demo', score: score, iat: iat, exp: iat + TOKEN_TTL_SECONDS };
    const encoded = btoa(JSON.stringify(payload)).replace(/=/g, '').slice(0, 24);
    return 'v1.' + encoded + '.[sig]';
  };

  const renderDemo = (refreshTtl) => {
    if (refreshTtl === undefined) refreshTtl = true;
    if (!dom.demoScore) return;
    dom.demoScore.textContent = demo.score.toFixed(2);
    if (dom.demoStatus) {
      dom.demoStatus.textContent =
        demo.score > HUMAN_THRESHOLD ? '✓ Human' : '~ Uncertain';
    }
    if (refreshTtl && dom.demoTtl) {
      dom.demoTtl.textContent = TOKEN_TTL_SECONDS + 's';
    }
    if (dom.demoToken) dom.demoToken.textContent = buildDemoToken(demo.score);
  };

  /* ------------------------------------------------------------------ *
   * Behaviour scoring
   * ------------------------------------------------------------------ */

  const computeTypingScore = () => {
    if (demo.keystrokes.length < 2) return 0.5;
    const cv = coefficientOfVariation(gapsOf(demo.keystrokes));
    return Math.min(0.99, Math.max(0.01, 0.5 + cv * 0.4));
  };

  const computeBehaviourScore = () => {
    let s = BASE_HUMAN_SCORE;
    if (demo.scrolls.length >= 2) {
      s += Math.min(0.3, coefficientOfVariation(gapsOf(demo.scrolls)) * 0.3);
    }
    if (demo.touches.length >= 2) {
      const speeds = [];
      for (let i = 1; i < demo.touches.length; i += 1) {
        const dt = demo.touches[i].t - demo.touches[i - 1].t;
        const dx = demo.touches[i].x - demo.touches[i - 1].x;
        const dy = demo.touches[i].y - demo.touches[i - 1].y;
        if (dt > 0) speeds.push(Math.sqrt(dx * dx + dy * dy) / dt);
      }
      s += Math.min(0.2, coefficientOfVariation(speeds) * 0.2);
    }
    if (demo.pointers.length >= 3) s += 0.2;
    return clampScore(s);
  };

  const updateBehaviourScore = () => {
    if (!dom.demoScore) return;
    demo.score = computeBehaviourScore();
    renderDemo();
  };

  /* ------------------------------------------------------------------ *
   * Typing attestation + TTL
   * ------------------------------------------------------------------ */

  const startTtlCountdown = (attestedScore) => {
    if (!dom.demoTtl) return;
    demo.attestedScore = attestedScore;
    const startedAt = Date.now();
    if (demo.ttlTimer) clearInterval(demo.ttlTimer);

    demo.ttlTimer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round(TOKEN_TTL_SECONDS - (Date.now() - startedAt) / 1000)
      );
      dom.demoTtl.textContent = remaining + 's';
      if (remaining <= 0) {
        dom.demoTtl.textContent = 'Expired';
        if (dom.demoStatus) dom.demoStatus.textContent = 'Re-attesting…';
        clearInterval(demo.ttlTimer);
        demo.ttlTimer = null;
      }
    }, 1000);
  };

  const setupTypingAttestation = () => {
    if (!dom.demoInput) return;
    dom.demoInput.addEventListener('keydown', () => {
      pushSample(demo.keystrokes, Date.now(), KEYSTROKE_WINDOW);
      clearTimeout(demo.typingTimer);
      demo.typingTimer = setTimeout(() => {
        startTtlCountdown(computeTypingScore());
      }, TYPING_IDLE_MS);
    });
  };

  /* ------------------------------------------------------------------ *
   * Motion signals
   * ------------------------------------------------------------------ */

  const setupMotionSignals = () => {
    window.addEventListener('scroll', () => {
      pushSample(demo.scrolls, Date.now(), SCROLL_WINDOW);
      updateBehaviourScore();
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (!t) return;
      pushSample(demo.touches, { t: Date.now(), x: t.clientX, y: t.clientY }, TOUCH_WINDOW);
      updateBehaviourScore();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      pushSample(demo.pointers, { t: Date.now(), x: e.clientX, y: e.clientY }, POINTER_WINDOW);
      updateBehaviourScore();
    }, { passive: true });
  };

  /* ------------------------------------------------------------------ *
   * Click heatmap
   * ------------------------------------------------------------------ */

  const updateHeatScore = () => {
    if (!dom.demoScore || demo.clicks.length < 1) return;
    const diversity = Object.keys(demo.zones).filter((k) => demo.zones[k] > 0).length / 3;
    demo.score = clampScore(demo.score + diversity * 0.15);
    renderDemo(false);
  };

  const setupClickHeatmap = () => {
    window.addEventListener('click', (e) => {
      pushSample(demo.clicks, { x: e.clientX, y: e.clientY, t: Date.now() }, CLICK_WINDOW);
      const h = demo.viewportHeight;
      if (e.clientY < h / 3) demo.zones.top += 1;
      else if (e.clientY < (2 * h) / 3) demo.zones.mid += 1;
      else demo.zones.bot += 1;
      updateHeatScore();
    });
    window.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      pushSample(demo.clicks, { x: t.clientX, y: t.clientY, t: Date.now() }, CLICK_WINDOW);
      updateHeatScore();
    }, { passive: true });
  };

  const setupBehavioralDemo = () => {
    setupTypingAttestation();
    setupMotionSignals();
    setupClickHeatmap();
  };

  /* ------------------------------------------------------------------ *
   * Session persistence
   * ------------------------------------------------------------------ */

  const saveSession = () => {
    try {
      if (!Number.isFinite(demo.score) || demo.score <= 0) return;
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ score: demo.score, ts: Date.now() })
      );
    } catch (err) {
      console.warn('[X-Trust] unable to persist demo session:', err);
    }
  };

  const restoreSession = () => {
    if (!dom.demoScore) return;
    let session = null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Number.isFinite(parsed.score) &&
          (Date.now() - parsed.ts) / 1000 < TOKEN_TTL_SECONDS
        ) {
          session = parsed;
        }
      }
    } catch (err) {
      console.warn('[X-Trust] unable to read demo session:', err);
      return;
    }
    if (!session) return;

    demo.score = clampScore(session.score);
    const remaining = Math.round(TOKEN_TTL_SECONDS - (Date.now() - session.ts) / 1000);

    dom.demoScore.textContent = demo.score.toFixed(2);
    if (dom.demoStatus) dom.demoStatus.textContent = '✓ Restored';
    if (dom.demoTtl) dom.demoTtl.textContent = remaining + 's';
    if (dom.demoToken) dom.demoToken.textContent = buildDemoToken(demo.score, session.ts);
  };

  const setupDemoSession = () => {
    document.addEventListener('DOMContentLoaded', restoreSession);
    setInterval(saveSession, SESSION_SAVE_MS);
  };

  /* ------------------------------------------------------------------ *
   * Presence decay — reads live score (fixes static capture bug)
   * ------------------------------------------------------------------ */

  const readPublishedScore = () =>
    parseFloat(dom.demoScore && dom.demoScore.textContent) || BASE_HUMAN_SCORE;

  const setupPresenceDecay = () => {
    if (!dom.presenceDecay) return;
    let issuedAt = Date.now();

    const tick = () => {
      const fresh = Math.max(0, 1 - (Date.now() - issuedAt) / 1000 / TOKEN_TTL_SECONDS);
      const liveScore = readPublishedScore();
      dom.presenceDecay.textContent = (liveScore * fresh).toFixed(3);
      dom.presenceDecay.style.color =
        fresh > 0.6 ? '#fff' : fresh > 0.3 ? '#888' : '#444';
    };

    setInterval(tick, 1000);
    ['keydown', 'mousemove', 'touchmove'].forEach((type) => {
      document.addEventListener(type, () => { issuedAt = Date.now(); }, { passive: true });
    });
  };

  /* ------------------------------------------------------------------ *
   * OSS footprint
   * ------------------------------------------------------------------ */

  const setupOpenSourceFootprint = () => {
    const prs = document.createElement('div');
    prs.style.cssText = 'text-align:center;padding:20px;color:#8e8e93;font-size:13px';
    prs.innerHTML =
      '<span style="color:#fff;font-size:28px;font-weight:700">' +
      OPEN_PR_COUNT + '</span> Open PRs on ' + OPEN_PR_TARGETS;

    const jsr = document.createElement('div');
    jsr.style.cssText = 'text-align:center;padding:10px';
    jsr.innerHTML =
      '<a href="' + JSR_PACKAGE_URL + '" style="color:#fff;font-size:12px;background:rgba(255,255,255,0.1);padding:6px 14px;border-radius:20px;text-decoration:none">Also on JSR · ' +
      JSR_INSTALL_HINT + '</a>';

    document.body.appendChild(prs);
    document.body.appendChild(jsr);
  };

  /* ------------------------------------------------------------------ *
   * Paddle checkout
   * ------------------------------------------------------------------ */

  const setupPaddleHandlers = () => {
    if (!window.Paddle) {
      console.warn('[X-Trust] Paddle SDK unavailable — checkout disabled.');
      return;
    }
    window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    document.querySelectorAll('[data-paddle-price]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          window.Paddle.Checkout.open({
            items: [{ priceId: el.dataset.paddlePrice, quantity: 1 }],
          });
        } catch (err) {
          console.error('[X-Trust] unable to open Paddle checkout:', err);
        }
      });
    });
  };

  /* ------------------------------------------------------------------ *
   * Bootstrap
   * ------------------------------------------------------------------ */

  const init = () => {
    setupSparkline();
    setupCounter();
    setupBehavioralDemo();
    setupDemoSession();
    setupPresenceDecay();
    setupOpenSourceFootprint();
    setupPaddleHandlers();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
