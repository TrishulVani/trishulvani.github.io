(() => {
  if (!document.body.matches('.design-v2,.experience-v2')) return;
  const wordmark = '<span class="deva-wordmark"><span lang="hi">त्रि</span>SHUL VANI</span>';
  const put = (selector, make) => document.querySelectorAll(selector).forEach(el => { el.innerHTML = make(el); });

  put('.sidebar .brand strong', () => wordmark);
  put('.rail .brand > span', el => `${wordmark}${el.querySelector('small')?.outerHTML || ''}`);
  put('.site-head .identity > span', () => wordmark);
  put('.flyover-brand', el => `${el.querySelector('img')?.outerHTML || ''}${wordmark}<i>/</i> SOUND INTELLIGENCE`);
  put('.v2-journey-brand', el => `${el.querySelector('img')?.outerHTML || ''}${wordmark} / SIGNAL JOURNEY`);
  put('.footer > strong', () => wordmark);
  put('body.experience-v2 > footer > span', () => `${wordmark} · VOLTEDGE RESEARCH PROTOTYPE`);
})();
