(() => {
  if (!document.body.classList.contains('design-v2')) return;
  const frame = document.getElementById('hardware-lab-frame');
  if (!frame) return;
  frame.src = '/hardware.html?embed=1';
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'tv-hardware-height') return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height > 400 && height < 16000) frame.style.height = `${Math.ceil(height)}px`;
  });
})();
