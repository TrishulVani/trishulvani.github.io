(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DEFINITIONS = {
    mic: { name: 'Close-talk microphone', family: 'SENSOR', detail: 'Analog signal concept', ports: [['OUT', 'analog_out', 'CH 1']] },
    ambient: { name: 'Ambient microphone', family: 'SENSOR', detail: 'Correlated-noise reference', ports: [['OUT', 'analog_out', 'CH 2']] },
    adc: { name: 'Shared-clock stereo capture', family: 'INTERFACE', detail: 'Single two-channel ADC / USB interface', ports: [['IN1', 'analog_in', 'CH 1'], ['IN2', 'analog_in', 'CH 2'], ['USB', 'usb_out', 'PCM']] },
    pi: { name: 'Raspberry Pi 4 Model B', family: 'LINUX SBC', detail: 'Virtual field DSP controller; concept geometry', ports: [['USB', 'usb_in', 'PCM'], ['AUDIO', 'audio_out', 'OUT'], ['TX', 'uart_tx', 'UART'], ['RX', 'uart_rx', 'UART'], ['GPIO17', 'gpio_out', 'DIGITAL'], ['GPIO27', 'gpio_in', 'DIGITAL'], ['5V', 'power5_in', 'PWR'], ['GND', 'gnd_in', 'RETURN']] },
    pico: { name: 'Raspberry Pi Pico W', family: 'MICROCONTROLLER', detail: 'Control and status companion', ports: [['TX', 'uart_tx', 'UART'], ['RX', 'uart_rx', 'UART'], ['GP15', 'gpio_out', 'DIGITAL'], ['GP14', 'gpio_in', 'DIGITAL'], ['3V3', 'power3_in', 'PWR'], ['GND', 'gnd_in', 'RETURN']] },
    esp32: { name: 'ESP32-S3', family: 'MICROCONTROLLER', detail: 'Optional control/link experiment', ports: [['TX', 'uart_tx', 'UART'], ['RX', 'uart_rx', 'UART'], ['GPIO5', 'gpio_out', 'DIGITAL'], ['GPIO4', 'gpio_in', 'DIGITAL'], ['3V3', 'power3_in', 'PWR'], ['GND', 'gnd_in', 'RETURN']] },
    receiver: { name: 'Control-room listener', family: 'OUTPUT', detail: 'Virtual playback sink', ports: [['AUDIO', 'audio_in', 'PCM']] },
    supply: { name: 'Regulated bench supply', family: 'POWER', detail: 'Voltage labels only; no current model', ports: [['5V', 'power5_out', '5 V'], ['3V3', 'power3_out', '3.3 V'], ['GND', 'gnd_out', 'RETURN']] }
  };
  const defaults = () => ({
    modules: [
      { id: 'mic1', type: 'mic' }, { id: 'mic2', type: 'ambient' }, { id: 'adc1', type: 'adc' },
      { id: 'pi1', type: 'pi' }, { id: 'pico1', type: 'pico' }, { id: 'esp1', type: 'esp32' },
      { id: 'supply1', type: 'supply' }, { id: 'receiver1', type: 'receiver' }
    ],
    wires: [
      ['mic1', 'OUT', 'adc1', 'IN1'], ['mic2', 'OUT', 'adc1', 'IN2'], ['adc1', 'USB', 'pi1', 'USB'],
      ['pi1', 'AUDIO', 'receiver1', 'AUDIO'], ['supply1', '5V', 'pi1', '5V'], ['supply1', 'GND', 'pi1', 'GND'],
      ['supply1', '3V3', 'pico1', '3V3'], ['supply1', 'GND', 'pico1', 'GND'],
      ['supply1', '3V3', 'esp1', '3V3'], ['supply1', 'GND', 'esp1', 'GND'],
      ['pi1', 'TX', 'pico1', 'RX'], ['pico1', 'TX', 'pi1', 'RX'],
      ['pi1', 'GPIO17', 'esp1', 'GPIO4'], ['esp1', 'GPIO5', 'pi1', 'GPIO27']
    ],
    scripts: {
      pi1: '# Virtual control script for Raspberry Pi 4 Model B\nMODE HYBRID\nSTREAM ON\nSET GPIO17 HIGH\nREAD GPIO27\nSEND UART READY\nLOG Field DSP route armed',
      pico1: '# Virtual control script for Pico W\nSET GP15 HIGH\nREAD GP14\nSEND UART STATUS_OK\nLOG Pico status online',
      esp1: '# Virtual control script for ESP32-S3\nSET GPIO5 HIGH\nREAD GPIO4\nLOG ESP32 companion online'
    }
  });
  const counterpart = { analog_out: 'analog_in', usb_out: 'usb_in', audio_out: 'audio_in', uart_tx: 'uart_rx', gpio_out: 'gpio_in', power5_out: 'power5_in', power3_out: 'power3_in', gnd_out: 'gnd_in' };
  let design;
  try {
    const stored = JSON.parse(localStorage.getItem('tv-hardware-v2') || 'null');
    design = validDesign(stored) ? stored : defaults();
  } catch (_) { design = defaults(); }
  let selectedPort = null;
  let activeBoard = design.modules.find(m => m.type === 'pi')?.id || 'pi1';
  let virtualPins = {};
  let lastReport = null;
  let lastRig = null;
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const moduleOf = id => design.modules.find(m => m.id === id);
  const portOf = (id, port) => DEFINITIONS[moduleOf(id)?.type]?.ports.find(p => p[0] === port);
  function validDesign(value) {
    if (!value || !Array.isArray(value.modules) || !Array.isArray(value.wires) || !value.scripts || typeof value.scripts !== 'object' || value.modules.length > 16 || value.wires.length > 80) return false;
    if (value.modules.some(m => typeof m.id !== 'string' || !/^[a-z0-9]{2,15}$/.test(m.id) || !DEFINITIONS[m.type])) return false;
    const ids = new Set(value.modules.map(m => m.id));
    const component = id => value.modules.find(m => m.id === id);
    return ids.size === value.modules.length && value.wires.every(w => Array.isArray(w) && w.length === 4 && ids.has(w[0]) && ids.has(w[2]) && DEFINITIONS[component(w[0]).type].ports.some(p => p[0] === w[1]) && DEFINITIONS[component(w[2]).type].ports.some(p => p[0] === w[3]));
  }
  function save() { try { localStorage.setItem('tv-hardware-v2', JSON.stringify(design)); } catch (_) { /* Simulation still works without storage. */ } }
  const wireKey = w => w.join(':');
  const hasWire = (a, ap, b, bp) => design.wires.some(w => w[0] === a && w[1] === ap && w[2] === b && w[3] === bp);
  function normalizeWire(a, ap, b, bp) {
    const one = portOf(a, ap), two = portOf(b, bp);
    if (!one || !two || a === b) return { error: 'Select ports on two different modules.' };
    if (counterpart[one[1]] === two[1]) return { wire: [a, ap, b, bp] };
    if (counterpart[two[1]] === one[1]) return { wire: [b, bp, a, ap] };
    return { error: `${ap} (${one[1]}) cannot connect to ${bp} (${two[1]}). Match signal type and direction.` };
  }
  function renderModules() {
    $('module-grid').innerHTML = design.modules.map(m => {
      const d = DEFINITIONS[m.type];
      return `<article class="module" data-module="${esc(m.id)}"><div class="module-top"><div><small>${esc(d.family)} / ${esc(m.id.toUpperCase())}</small><h3>${esc(d.name)}</h3></div>${['mic1','mic2','adc1','pi1','receiver1','supply1'].includes(m.id) ? '' : `<button type="button" class="module-remove" data-remove="${esc(m.id)}" aria-label="Remove ${esc(d.name)}">✕</button>`}</div><p>${esc(d.detail)}</p><div class="silicon" aria-hidden="true">${m.type === 'pi' ? 'SBC / DSP' : m.type === 'adc' ? 'SYNC ADC' : m.type === 'supply' ? 'PWR' : m.type === 'mic' || m.type === 'ambient' ? 'TRANSDUCER' : m.type === 'receiver' ? 'AUDIO SINK' : 'MCU / GPIO'}</div><div class="ports">${d.ports.map(([name, kind, role]) => `<button type="button" class="port ${kind.startsWith('power') ? 'power' : kind.startsWith('gnd') ? 'gnd' : ''} ${selectedPort?.[0] === m.id && selectedPort?.[1] === name ? 'selected' : ''} ${design.wires.some(w => (w[0] === m.id && w[1] === name) || (w[2] === m.id && w[3] === name)) ? 'connected' : ''}" data-port="${esc(name)}" data-owner="${esc(m.id)}" aria-label="${esc(d.name)} ${esc(name)} ${esc(role)}">${esc(name)}</button>`).join('')}</div></article>`;
    }).join('');
    $('module-grid').querySelectorAll('[data-port]').forEach(button => button.addEventListener('click', () => choosePort(button.dataset.owner, button.dataset.port)));
    $('module-grid').querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => removeModule(button.dataset.remove)));
    requestAnimationFrame(drawWires);
  }
  function choosePort(id, port) {
    if (!selectedPort) { selectedPort = [id, port]; $('port-hint').textContent = `${DEFINITIONS[moduleOf(id).type].name} ${port} selected. Choose a compatible second port.`; renderModules(); return; }
    if (selectedPort[0] === id && selectedPort[1] === port) { selectedPort = null; $('port-hint').textContent = 'Selection cleared.'; renderModules(); return; }
    const result = normalizeWire(selectedPort[0], selectedPort[1], id, port);
    selectedPort = null;
    if (result.error) $('port-hint').textContent = result.error;
    else if (design.wires.some(w => wireKey(w) === wireKey(result.wire))) $('port-hint').textContent = 'That connection already exists.';
    else if (design.wires.some(w => w[2] === result.wire[2] && w[3] === result.wire[3])) $('port-hint').textContent = 'That input already has a driver. Remove its wire first.';
    else { design.wires.push(result.wire); save(); $('port-hint').textContent = 'Connection added.'; }
    renderAll();
  }
  function removeModule(id) {
    design.modules = design.modules.filter(m => m.id !== id);
    design.wires = design.wires.filter(w => w[0] !== id && w[2] !== id);
    delete design.scripts[id];
    if (activeBoard === id) activeBoard = design.modules.find(m => ['pi','pico','esp32'].includes(m.type))?.id || 'pi1';
    save(); renderAll();
  }
  function drawWires() {
    const stage = $('wiring-stage'), rect = stage.getBoundingClientRect();
    const svg = $('wire-layer'); svg.setAttribute('viewBox', `0 0 ${Math.max(1, stage.clientWidth)} ${Math.max(1, stage.clientHeight)}`);
    svg.innerHTML = design.wires.map(w => {
      const a = stage.querySelector(`[data-owner="${w[0]}"][data-port="${w[1]}"]`), b = stage.querySelector(`[data-owner="${w[2]}"][data-port="${w[3]}"]`);
      if (!a || !b) return '';
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(), x1 = ar.left + ar.width / 2 - rect.left, y1 = ar.top + ar.height / 2 - rect.top, x2 = br.left + br.width / 2 - rect.left, y2 = br.top + br.height / 2 - rect.top;
      const kind = portOf(w[0], w[1])[1];
      return `<path class="wire-line ${kind.startsWith('power') ? 'power' : kind.startsWith('gnd') ? 'gnd' : kind.startsWith('analog') || kind.startsWith('audio') ? 'audio' : ''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${((x1+x2)/2).toFixed(1)} ${y1.toFixed(1)},${((x1+x2)/2).toFixed(1)} ${y2.toFixed(1)},${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
    }).join('');
  }
  function issues() {
    const problems = [];
    const core = [['mic1','OUT','adc1','IN1','Primary microphone → capture CH1'],['mic2','OUT','adc1','IN2','Reference microphone → capture CH2'],['adc1','USB','pi1','USB','Shared-clock interface → processor'],['pi1','AUDIO','receiver1','AUDIO','Processor → listening sink'],['supply1','5V','pi1','5V','5 V supply → processor'],['supply1','GND','pi1','GND','Ground return → processor']];
    core.forEach(([a,ap,b,bp,label]) => { if (!hasWire(a,ap,b,bp)) problems.push(`Missing ${label}`); });
    design.modules.filter(m => ['pico','esp32'].includes(m.type)).forEach(m => {
      if (!hasWire('supply1','3V3',m.id,'3V3')) problems.push(`${m.id}: 3.3 V supply missing`);
      if (!hasWire('supply1','GND',m.id,'GND')) problems.push(`${m.id}: ground return missing`);
      if (!design.wires.some(w => (w[0] === m.id || w[2] === m.id) && !w[1].includes('V') && !w[3].includes('V') && w[1] !== 'GND' && w[3] !== 'GND')) problems.push(`${m.id}: no control link connected`);
    });
    design.modules.filter(m => m.type === 'pi' && m.id !== 'pi1').forEach(m => {
      if (!hasWire('supply1','5V',m.id,'5V')) problems.push(`${m.id}: 5 V supply missing`);
      if (!hasWire('supply1','GND',m.id,'GND')) problems.push(`${m.id}: ground return missing`);
      if (!design.wires.some(w => (w[0] === m.id || w[2] === m.id) && ['TX','RX','GPIO17','GPIO27'].includes(w[0] === m.id ? w[1] : w[3]))) problems.push(`${m.id}: no control link connected`);
    });
    return problems;
  }
  function renderIssues() {
    const problems = issues();
    $('wiring-state').textContent = problems.length ? `${problems.length} wiring check${problems.length === 1 ? '' : 's'} to resolve` : 'Virtual signal path ready';
    $('wiring-state').classList.toggle('ready', !problems.length);
    $('wiring-issues').innerHTML = problems.length ? problems.map(p => `<li>${esc(p)}</li>`).join('') : '<li>Both mic channels share one capture interface.</li><li>Power and return paths are connected in the virtual netlist.</li>';
    $('wire-list').innerHTML = design.wires.map((w, i) => `<div class="wire-entry"><span>${esc(w[0])}.${esc(w[1])} → ${esc(w[2])}.${esc(w[3])}</span><div><button type="button" data-inspect-wire="${i}" aria-label="Inspect wire ${i + 1}">Inspect</button><button type="button" data-wire="${i}" aria-label="Remove wire ${i + 1}">Remove</button></div></div>`).join('');
    $('wire-list').querySelectorAll('[data-wire]').forEach(button => button.addEventListener('click', () => { design.wires.splice(Number(button.dataset.wire), 1); save(); renderAll(); }));
    $('wire-list').querySelectorAll('[data-inspect-wire]').forEach(button => button.addEventListener('click', () => inspectWire(Number(button.dataset.inspectWire))));
  }
  function inspectWire(index) {
    const w = design.wires[index];
    if (!w) return;
    const source = moduleOf(w[0]), sink = moduleOf(w[2]), port = portOf(w[0], w[1]);
    const kind = port?.[1] || 'unknown';
    let state = 'Topology only — run the virtual rig for a logical state.';
    if (lastRig?.ok) {
      if (kind === 'gpio_out') {
        const pinValue = lastRig.pins[`${w[0]}.${w[1]}`];
        state = `${w[0]}.${w[1]} is ${pinValue === 1 ? 'HIGH' : pinValue === 0 ? 'LOW' : 'UNKNOWN'} in this virtual run.`;
      }
      else if (kind.startsWith('power') || kind === 'gnd_out') state = `Virtual destination ${lastRig.power?.[w[2]] ? 'powered' : 'not confirmed powered'}; current and voltage are not measured.`;
      else if (kind === 'uart_tx') state = `Virtual message path ${lastRig.logs.some(l => l.includes(`→ ${w[2]}.RX`)) ? 'used' : 'not used'} in this run.`;
      else state = 'Logical route connected; no physical signal measurement.';
    }
    $('connection-inspector').innerHTML = `<strong>${esc(DEFINITIONS[source.type].name)} ${esc(w[1])} → ${esc(DEFINITIONS[sink.type].name)} ${esc(w[3])}</strong><dl><dt>Net ${index + 1}</dt><dd>${esc(kind.replaceAll('_', ' '))}</dd><dt>Source port</dt><dd>${esc(port[2])}</dd><dt>Destination port</dt><dd>${esc(portOf(w[2], w[3])[2])}</dd><dt>Virtual state</dt><dd>${esc(state)}</dd><dt>Physical status</dt><dd>Unverified. Confirm connector, voltage, driver and test with instruments.</dd></dl>`;
  }
  function inspectPart(meshId) {
    const mapped = { primary_mic: 'mic1', ambient_mic: 'mic2', adc_board: 'adc1', pi_pcb: 'pi1', field_lid: 'pi1', wifi_ap: 'esp1', display_shell: 'receiver1', bank: 'supply1' }[meshId];
    if (!mapped) return;
    const related = design.wires.map((w, i) => ({ w, i })).filter(x => x.w[0] === mapped || x.w[2] === mapped);
    $('part-connections').innerHTML = related.length ? related.map(({ w, i }) => `<button type="button" data-part-wire="${i}">${esc(w[0])}.${esc(w[1])} → ${esc(w[2])}.${esc(w[3])}</button>`).join('') : '<span>No logical nets for this part.</span>';
    $('part-connections').querySelectorAll('[data-part-wire]').forEach(button => button.addEventListener('click', () => { inspectWire(Number(button.dataset.partWire)); $('wiring').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }));
  }
  function renderBoardSelector() {
    const list = design.modules.filter(m => ['pi','pico','esp32'].includes(m.type));
    if (!list.some(m => m.id === activeBoard)) activeBoard = list[0]?.id || '';
    $('code-board').innerHTML = list.map(m => `<option value="${esc(m.id)}">${esc(DEFINITIONS[m.type].name)} / ${esc(m.id)}</option>`).join('');
    $('code-board').value = activeBoard;
    $('code-input').value = design.scripts[activeBoard] || `# Virtual script for ${activeBoard}\nLOG Ready`;
  }
  function renderAll() { lastRig = null; renderModules(); renderIssues(); renderBoardSelector(); }
  function addBoard() {
    if (design.modules.length >= 16) { $('port-hint').textContent = 'Maximum 16 modules in one virtual design.'; return; }
    const type = $('board-type').value;
    const id = `${type}${Math.max(0, ...design.modules.filter(m => m.type === type).map(m => Number(m.id.slice(type.length)) || 0)) + 1}`;
    design.modules.push({ id, type });
    design.scripts[id] = `# Virtual control script for ${DEFINITIONS[type].name}\nLOG ${id} ready`;
    activeBoard = id; save(); renderAll(); $('port-hint').textContent = `${DEFINITIONS[type].name} added. Connect power, ground and a control link.`;
  }
  function runRig() {
    design.scripts[activeBoard] = $('code-input').value;
    save();
    lastRig = window.virtualRigV2.run(design, DEFINITIONS);
    const result = lastRig;
    $('serial-output').textContent = (result.ok ? 'SIMULATION COMPLETE\n' : 'SIMULATION STOPPED\n') + (result.errors.length ? result.errors.join('\n') : result.logs.join('\n'));
    $('virtual-pins').innerHTML = Object.entries(result.pins).map(([pin, value]) => `<span>${esc(pin)} ${value ? 'HIGH' : 'LOW'}</span>`).join('');
    $('rig-summary').textContent = result.ok ? `${result.tasks.filter(t => t.pass).length} / ${result.tasks.length} virtual tasks ready` : `${result.errors.length} script error${result.errors.length === 1 ? '' : 's'} — deploy stopped`;
    $('task-results').innerHTML = result.ok ? result.tasks.map(t => `<div class="task-row ${t.pass ? 'pass' : 'fail'}"><strong>${t.pass ? 'READY' : 'BLOCKED'} · ${esc(t.name)}</strong><span>${esc(t.reason)}</span></div>`).join('') : result.errors.map(e => `<div class="task-row fail"><strong>CODE ERROR</strong><span>${esc(e)}</span></div>`).join('');
    if (result.ok) $('test-track').value = result.mode;
    $('test-status').textContent = result.ok ? (result.tasks.slice(0, 4).every(t => t.pass) ? 'Virtual path ready; run the connected DSP test to measure software output.' : 'Virtual path blocked. Fix the listed task before processing.') : 'Virtual deployment stopped. Fix script errors before processing.';
    window.hardwareModelV2?.setDeviceState?.({ boot: Boolean(result.power?.pi1), stream: Boolean(result.stream), control: Boolean(result.pins?.['pi1.GPIO17']) });
    return result;
  }
  async function runSoftware() {
    const rig = runRig();
    if (!rig.ok || !rig.tasks.slice(0, 4).every(t => t.pass)) return;
    const missing = issues();
    if (missing.length) { $('test-status').textContent = `Virtual circuit is incomplete: ${missing[0]}`; return; }
    const noise = $('test-noise').value, snr_db = Number($('test-snr').value), duration_s = Number($('test-duration').value), seed = Number($('test-seed').value);
    if (!Number.isFinite(snr_db) || snr_db < -15 || snr_db > 20 || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) { $('test-status').textContent = 'Use an SNR from −15 to 20 dB and a non-negative integer seed.'; return; }
    $('run-software').disabled = true; $('test-status').textContent = 'Processing with the connected Python engine…';
    try {
      const response = await fetch('/api/experiments/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ noise, snr_db, duration_s, seed }) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw Error(typeof data.detail === 'string' ? data.detail : `Processor returned ${response.status}`); }
      lastReport = await response.json();
      $('test-status').textContent = `Software run ${lastReport.id} complete in ${rig.mode.toUpperCase()} preview mode. The virtual circuit gated this test; FastAPI processed the audio, not an emulated Pi.`;
      const metrics = lastReport.metrics || {}, fmt = value => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} dB` : 'N/A';
      $('test-metrics').innerHTML = `<div class="metric"><span>Input SNR · synthetic clean reference</span><strong>${fmt(metrics.raw?.snr_db)}</strong></div><div class="metric"><span>${esc(rig.mode.toUpperCase())} output SNR · offline software</span><strong>${fmt(metrics[rig.mode]?.snr_db)}</strong></div><div class="metric"><span>Processing source</span><strong>${esc(lastReport.model || 'spectral DSP fallback')}</strong></div>`;
      $('test-audio').hidden = false; $('open-lab').href = `/index.html?design=2&run=${encodeURIComponent(lastReport.id)}&track=${encodeURIComponent($('test-track').value)}#audio-lab`;
      setAudio();
    } catch (error) { $('test-status').textContent = `Connected processor unavailable: ${error.message}`; }
    finally { $('run-software').disabled = false; }
  }
  function setAudio() {
    if (!lastReport) return;
    const method = $('test-track').value;
    $('test-player').src = window.trishulApiUrl(`/api/experiments/${encodeURIComponent(lastReport.id)}/audio/${method}`);
    $('open-lab').href = `/index.html?design=2&run=${encodeURIComponent(lastReport.id)}&track=${encodeURIComponent(method)}#audio-lab`;
  }
  $('add-board').addEventListener('click', addBoard);
  $('reset-wiring').addEventListener('click', () => { design = defaults(); activeBoard = 'pi1'; selectedPort = null; virtualPins = {}; save(); renderAll(); $('port-hint').textContent = 'Reference virtual circuit restored.'; });
  $('export-netlist').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ version: 1, model: 'virtual concept', ...design }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'trishul-vani-virtual-netlist.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('code-board').addEventListener('change', () => { design.scripts[activeBoard] = $('code-input').value; activeBoard = $('code-board').value; save(); renderBoardSelector(); });
  $('code-input').addEventListener('input', () => { design.scripts[activeBoard] = $('code-input').value; save(); });
  $('load-example').addEventListener('click', () => { const fresh = defaults().scripts; $('code-input').value = fresh[activeBoard] || `# Virtual script\nLOG ${activeBoard} ready`; design.scripts[activeBoard] = $('code-input').value; save(); });
  $('run-code').addEventListener('click', runRig);
  $('run-software').addEventListener('click', runSoftware);
  $('test-track').addEventListener('change', setAudio);
  $('hotspots').addEventListener('click', event => {
    const buttons = [...$('hotspots').querySelectorAll('.hotspot')];
    const index = buttons.indexOf(event.target);
    const meshes = ['primary_mic', 'ambient_mic', 'field_lid', 'pi_pcb', 'adc_board', 'wifi_ap', 'display_shell'];
    if (index >= 0) inspectPart(meshes[index]);
  });
  $('viewer').addEventListener('click', () => setTimeout(() => inspectPart(window.hardwareModelV2?.selectedPart?.()), 0));
  addEventListener('resize', () => requestAnimationFrame(drawWires));
  new ResizeObserver(() => requestAnimationFrame(drawWires)).observe($('wiring-stage'));
  renderAll();
  if (document.body.classList.contains('embedded')) {
    const reportHeight = () => parent.postMessage({ type: 'tv-hardware-height', height: document.documentElement.scrollHeight }, location.origin);
    new ResizeObserver(reportHeight).observe(document.body);
    addEventListener('load', reportHeight);
    addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'tv-hardware-go') return;
      if (!['model', 'wiring', 'code', 'software-test'].includes(event.data.target)) return;
      $(event.data.target).scrollIntoView({ behavior: 'instant' });
    });
    reportHeight();
  }
  window.hardwareBenchV2 = { issues, design: () => structuredClone(design) };
})();
