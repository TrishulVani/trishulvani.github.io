(() => {
  const isStudio = location.pathname.endsWith('/studio.html');
  const key = 'trishul-vani-tour-v1';
  const progressKey = 'trishul-vani-tour-progress';
  const steps = [
    { page: 'lab', target: '.hero', title: 'A research workbench', body: 'त्रिSHUL VANI compares offline speech-enhancement methods. This alpha is not a certified live or hardware system.' },
    { page: 'lab', target: '#audio-lab', title: 'Choose a controlled input', body: 'Select a noise profile, input SNR, duration and random seed. The built-in signal is synthetic, not human speech.' },
    { page: 'lab', target: '#run-btn', title: 'Run, listen and compare', body: 'Run the actual processor, then compare RAW, NLMS, spectral and hybrid audio. Scores need the right clean reference; missing measurements stay unavailable.' },
    { page: 'studio', target: '#drop-zone', title: 'Inspect the spectrum', body: 'Import a permitted WAV or FLAC file, or load the synthetic test tone. The STFT view comes from the source audio. Preview and apply a selected region without changing the original.' },
    { page: 'studio', target: '.export', title: 'Export your evidence', body: 'Download the selected WAV and the edit recipe. You can reopen Help at any time; a recorded video tutorial is coming soon.' }
  ];
  const root = document.createElement('div');
  root.className = 'tv-help';
  root.innerHTML = '<button type="button" class="tv-help-button" aria-haspopup="dialog">? Help &amp; tour</button><div class="tv-first" hidden><strong>New to त्रिSHUL VANI?</strong><span>A five-step tour shows the real controls.</span><button type="button" data-action="start">Take tour</button><button type="button" data-action="dismiss" aria-label="Dismiss tour suggestion">×</button></div><dialog class="tv-tour" aria-labelledby="tv-tour-title"><div class="tv-tour-kicker">GUIDED WORKSPACE TOUR <span class="tv-tour-count"></span></div><h2 id="tv-tour-title"></h2><p class="tv-tour-body"></p><p class="tv-video-note">80-second video: coming soon. <a href="https://github.com/TrishulVani/trishul-vani-studio#open-the-working-application" target="_blank" rel="noopener">Read the text guide</a>.</p><div class="tv-tour-actions"><button type="button" data-action="skip">Skip</button><span></span><button type="button" data-action="back">Back</button><button type="button" data-action="next">Next</button></div></dialog>';
  document.body.append(root);
  const dialog = root.querySelector('dialog');
  const prompt = root.querySelector('.tv-first');
  const help = root.querySelector('.tv-help-button');
  let index = 0, previousFocus = null, target = null;
  function clearTarget() { target?.classList.remove('tv-tour-target'); target = null; }
  function pageFor(step) { return step.page === 'studio' ? 'studio.html' : 'index.html'; }
  function goTo(stepIndex) {
    localStorage.setItem(progressKey, String(stepIndex));
    const url = new URL(pageFor(steps[stepIndex]), location.href);
    if (new URLSearchParams(location.search).get('design') === '2') url.searchParams.set('design', '2');
    location.assign(url.href);
  }
  function render() {
    clearTarget();
    const step = steps[index];
    if ((step.page === 'studio') !== isStudio) return goTo(index);
    dialog.querySelector('.tv-tour-count').textContent = `${index + 1} / ${steps.length}`;
    dialog.querySelector('h2').textContent = step.title;
    dialog.querySelector('.tv-tour-body').textContent = step.body;
    dialog.querySelector('[data-action="back"]').disabled = index === 0;
    dialog.querySelector('[data-action="next"]').textContent = index === steps.length - 1 ? 'Finish' : 'Next';
    target = document.querySelector(step.target);
    if (target) { target.classList.add('tv-tour-target'); target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); }
    localStorage.setItem(progressKey, String(index));
  }
  function open(start = 0) { previousFocus = document.activeElement; index = start; prompt.hidden = true; dialog.showModal(); render(); }
  function close() { clearTarget(); if (dialog.open) dialog.close(); localStorage.setItem(key, 'seen'); localStorage.removeItem(progressKey); previousFocus?.focus?.(); }
  help.addEventListener('click', () => open(isStudio ? 3 : 0));
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'start') open(isStudio ? 3 : 0);
    if (action === 'dismiss') { prompt.hidden = true; localStorage.setItem(key, 'seen'); }
    if (action === 'skip') close();
    if (action === 'back' && index > 0) { index--; render(); }
    if (action === 'next') { if (index === steps.length - 1) close(); else { index++; render(); } }
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  const savedRaw = localStorage.getItem(progressKey);
  const saved = Number(savedRaw);
  if (savedRaw !== null && Number.isInteger(saved) && saved >= 0 && saved < steps.length && ((steps[saved].page === 'studio') === isStudio)) open(saved);
  else if (!localStorage.getItem(key) && !isStudio) prompt.hidden = false;
})();
