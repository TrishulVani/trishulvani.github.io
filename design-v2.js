/* Lightweight interactions for Design 02; no framework or tracking. */
(() => {
  if (new URLSearchParams(location.search).get('design') !== '2') return;
  try { if (sessionStorage.getItem('tv-v2-arrival') === '1') { sessionStorage.removeItem('tv-v2-arrival'); document.body.classList.add('arrived-through-portal'); } } catch (_) { /* Arrival animation is optional. */ }
  document.querySelectorAll('img[src*="/trident.svg"]').forEach(image => {
    image.src = '/mark-v2.svg?v=design2mono';
  });
  const buildLabel = document.querySelector('.alpha');
  if (buildLabel?.lastChild?.nodeType === Node.TEXT_NODE) buildLabel.lastChild.textContent = ' RESEARCH BUILD • SOFTWARE VALIDATION';
  const sidebarCredit = document.querySelector('.sidebar-credit');
  if (sidebarCredit) sidebarCredit.textContent = 'VOLTEDGE • 2026 • RESEARCH PROTOTYPE';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.section-block').forEach((section, index) => {
    section.dataset.scene = String(index + 2).padStart(2, '0');
  });
  const progress = document.createElement('div');
  progress.className = 'v2-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  document.body.append(progress);
  const fill = progress.firstElementChild;
  let scheduled = false;
  function updateProgress() {
    scheduled = false;
    const root = document.documentElement;
    const max = Math.max(1, root.scrollHeight - innerHeight);
    fill.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
    if (!reduce) {
      document.querySelectorAll('.v2-service-scene').forEach((scene, index) => {
        const box = scene.getBoundingClientRect();
        const travel = Math.max(-1, Math.min(1, (innerHeight * .5 - box.top - box.height * .5) / (innerHeight + box.height) * 2));
        scene.style.setProperty('--scene-y', `${Math.round(travel * -75)}px`);
        scene.style.setProperty('--scene-x', `${Math.round(travel * (index % 2 ? 90 : -90))}px`);
      });
      const metrics = document.querySelector('.quick-metrics');
      if (metrics) {
        const rect = metrics.getBoundingClientRect();
        const position = Math.max(-1, Math.min(1, (innerHeight * .5 - rect.top) / innerHeight));
        metrics.querySelectorAll('.metric-card').forEach((card, index) => {
          card.style.setProperty('--metric-turn', `${((index - 1.5) * position * 3).toFixed(2)}deg`);
        });
      }
    }
  }
  addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  updateProgress();

  if (!reduce && 'IntersectionObserver' in window) {
    const targets = document.querySelectorAll('.section-block, .quick-metrics, .workspace > .panel');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.07, rootMargin: '0px 0px -35px 0px' });
    targets.forEach((element, index) => {
      element.classList.add('reveal-ready');
      element.style.transitionDelay = `${Math.min(index % 3, 2) * 80}ms`;
      observer.observe(element);
    });
  }

  const art = document.querySelector('.hero-art');
  const dashboardHero = document.querySelector('.hero');
  const rig = document.querySelector('.v2-floating-rig');
  const membrane = document.querySelector('.v2-dashboard-field');
  if (dashboardHero && rig && membrane) {
    const ctx = membrane.getContext('2d');
    const state = { x: .7, y: .5, targetX: .7, targetY: .5, energy: 0, visible: true, frame: 0 };
    function resizeMembrane() {
      const ratio = Math.min(2, devicePixelRatio || 1);
      membrane.width = Math.round(dashboardHero.clientWidth * ratio);
      membrane.height = Math.round(dashboardHero.clientHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderMembrane(0, false);
    }
    function renderMembrane(time, loop = true) {
      const w = dashboardHero.clientWidth, h = dashboardHero.clientHeight;
      ctx.clearRect(0, 0, w, h);
      state.x += (state.targetX - state.x) * .07;
      state.y += (state.targetY - state.y) * .07;
      state.energy *= .965;
      const px = state.x * w, py = state.y * h, radius = Math.max(160, w * .25);
      for (let row = 0; row < 23; row++) {
        const depth = row / 22, base = h * (.16 + depth * .76);
        ctx.beginPath();
        for (let col = 0; col <= 70; col++) {
          const x = col / 70 * w, distance = Math.hypot(x - px, base - py);
          const influence = Math.exp(-distance * distance / (radius * radius));
          const drift = reduce ? 0 : Math.sin(x * .009 + time * .0007 + row * .35) * (3 + depth * 7);
          const ripple = reduce ? 0 : influence * state.energy * Math.sin(distance * .028 - time * .008) * (28 + depth * 35);
          const y = base + drift + ripple;
          if (col) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.strokeStyle = `rgba(190,204,255,${(.05 + depth * .14).toFixed(3)})`;
        ctx.lineWidth = depth > .7 ? 1.3 : .8;
        ctx.stroke();
      }
      if (!reduce && state.visible && loop) state.frame = requestAnimationFrame(renderMembrane);
    }
    resizeMembrane();
    addEventListener('resize', resizeMembrane, { passive: true });
    if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting;
      if (visible && !state.visible) { state.visible = true; state.frame = requestAnimationFrame(renderMembrane); }
      else if (!visible && state.visible) { state.visible = false; cancelAnimationFrame(state.frame); }
    }).observe(dashboardHero);
    if (!reduce) state.frame = requestAnimationFrame(renderMembrane);
    if (!reduce && matchMedia('(pointer: fine)').matches) {
      dashboardHero.addEventListener('pointermove', event => {
        const box = dashboardHero.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        state.targetX = x + .5; state.targetY = y + .5;
        state.energy = Math.min(1, state.energy + .35);
        rig.style.setProperty('--rig-x', `${Math.round(x * 30)}px`);
        rig.style.setProperty('--rig-y', `${Math.round(y * 22)}px`);
        rig.style.setProperty('--rig-rotate', `${(x * -7).toFixed(2)}deg`);
        dashboardHero.style.setProperty('--hero-photo-x', `${Math.round(x * 15)}px`);
        dashboardHero.style.setProperty('--hero-photo-y', `${Math.round(y * 12)}px`);
      }, { passive: true });
      dashboardHero.addEventListener('pointerleave', () => {
        rig.style.setProperty('--rig-x', '0px'); rig.style.setProperty('--rig-y', '0px');
        rig.style.setProperty('--rig-rotate', '0deg');
      });
    }
  }
  if (!reduce && art && matchMedia('(pointer: fine)').matches) {
    art.closest('.hero').addEventListener('pointermove', event => {
      const rect = art.closest('.hero').getBoundingClientRect();
      art.style.setProperty('--v2-x', `${((event.clientX - rect.left) / rect.width - .5) * 24}px`);
      art.style.setProperty('--v2-y', `${((event.clientY - rect.top) / rect.height - .5) * 18}px`);
    }, { passive: true });
    art.closest('.hero').addEventListener('pointerleave', () => {
      art.style.setProperty('--v2-x', '0px');
      art.style.setProperty('--v2-y', '0px');
    });
  }

  if (!reduce && matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'v2-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.append(cursor);
    document.addEventListener('pointermove', event => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.style.opacity = '1';
      cursor.classList.toggle('is-active', !!event.target.closest('a,button,summary'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
  }

  const transition = document.createElement('div');
  transition.className = 'v2-transition';
  transition.setAttribute('aria-hidden', 'true');
  document.body.append(transition);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !url.pathname.endsWith('.html')) return;
    url.searchParams.set('design', '2');
    if (reduce) {
      event.preventDefault();
      location.assign(url.href);
      return;
    }
    event.preventDefault();
    transition.classList.add('is-active');
    setTimeout(() => location.assign(url.href), 380);
  });
})();
