(() => {
  if (!document.body.matches('.design-v2,.experience-v2')) return;
  const shell = document.createElement('div');
  shell.className = 'tv-atmosphere';
  shell.setAttribute('aria-hidden', 'true');
  shell.innerHTML = '<span class="tv-forest"></span><span class="tv-navy"></span><span class="tv-light"></span><span class="tv-detail"></span><span class="tv-vignette"></span>';
  document.body.prepend(shell);

  const tones = {
    forest: { forest: .86, navy: .04, gold: .27 },
    blend: { forest: .59, navy: .4, gold: .13 },
    navy: { forest: .06, navy: .87, gold: .05 },
    signal: { forest: .74, navy: .18, gold: .13 },
    gold: { forest: .68, navy: .06, gold: .38 }
  };
  const selectors = document.body.classList.contains('experience-v2')
    ? [['#hero','forest'],['#problem','forest'],['#concept','signal'],['#policies','blend'],['#spectral','navy'],['#evidence','gold']]
    : document.querySelector('.flyover-v2')
      ? [['.flyover-v2','navy'],['.relaunch-story','forest'],['.v2-journey','blend'],['#audio-lab','signal'],['#analytics','blend'],['#datasets','forest'],['#system','gold']]
      : [['.workspace','signal'],['.page','forest']];
  const sections = selectors.map(([selector,tone]) => ({ element: document.querySelector(selector), tone })).filter(item => item.element);
  const clamp = n => Math.max(0,Math.min(1,n));
  const blend = (a,b,t) => a + (b-a)*t;
  let pending = false;
  function render() {
    pending = false;
    if (!sections.length) return;
    const focus = scrollY + innerHeight * .53;
    const centers = sections.map(({element}) => element.getBoundingClientRect().top + scrollY + element.getBoundingClientRect().height * .5);
    let left = 0;
    while (left < centers.length - 1 && focus > centers[left + 1]) left++;
    const right = Math.min(left + 1, centers.length - 1);
    const amount = left === right ? 0 : clamp((focus - centers[left]) / Math.max(1,centers[right] - centers[left]));
    const start = tones[sections[left].tone], end = tones[sections[right].tone];
    for (const channel of ['forest','navy','gold']) document.body.style.setProperty(`--tv-${channel}-opacity`,blend(start[channel],end[channel],amount).toFixed(3));
    document.body.dataset.tvTone = amount < .5 ? sections[left].tone : sections[right].tone;
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule);
  render();
})();
