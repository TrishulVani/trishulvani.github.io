/* Deterministic logical controller simulator. It never executes uploaded firmware. */
(() => {
  'use strict';
  function run(design, definitions) {
    const logs = [], errors = [], ops = [], pins = {}, sends = [], power = {};
    const has = (a, ap, b, bp) => design.wires.some(w => w[0] === a && w[1] === ap && w[2] === b && w[3] === bp);
    for (const m of design.modules.filter(x => ['pi', 'pico', 'esp32'].includes(x.type))) {
      const input = m.type === 'pi' ? '5V' : '3V3';
      power[m.id] = has('supply1', input, m.id, input) && has('supply1', 'GND', m.id, 'GND');
      const source = String(design.scripts[m.id] || '');
      const lines = source.split(/\r?\n/);
      if (source.length > 4000 || lines.length > 40) { errors.push(`${m.id}: script limit is 40 lines / 4000 characters.`); continue; }
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;
        const where = `${m.id}:L${i + 1}`;
        let match, op;
        if ((match = /^MODE\s+(RAW|NLMS|SPECTRAL|HYBRID)$/i.exec(line))) op = { kind: 'mode', value: match[1].toLowerCase() };
        else if ((match = /^STREAM\s+(ON|OFF)$/i.exec(line))) op = { kind: 'stream', value: match[1].toUpperCase() === 'ON' };
        else if ((match = /^SET\s+([A-Z0-9]+)\s+(HIGH|LOW)$/i.exec(line))) op = { kind: 'set', pin: match[1].toUpperCase(), value: match[2].toUpperCase() === 'HIGH' ? 1 : 0 };
        else if ((match = /^READ\s+([A-Z0-9]+)$/i.exec(line))) op = { kind: 'read', pin: match[1].toUpperCase() };
        else if ((match = /^SEND\s+UART\s+([A-Z0-9_ -]{1,40})$/i.exec(line))) op = { kind: 'send', value: match[1].trim() };
        else if ((match = /^WAIT\s+(\d{1,4})$/i.exec(line)) && Number(match[1]) <= 1000) op = { kind: 'wait', value: Number(match[1]) };
        else if ((match = /^LOG\s+(.{1,80})$/i.exec(line))) op = { kind: 'log', value: match[1] };
        else { errors.push(`${where}: unsupported or out-of-range command.`); continue; }
        const ports = definitions[m.type].ports;
        if (['mode', 'stream'].includes(op.kind) && m.type !== 'pi') errors.push(`${where}: ${op.kind.toUpperCase()} requires the field processor.`);
        if (op.kind === 'set' && !ports.some(p => p[0] === op.pin && p[1] === 'gpio_out')) errors.push(`${where}: ${op.pin} is not a modeled output.`);
        if (op.kind === 'read' && !ports.some(p => p[0] === op.pin && p[1] === 'gpio_in')) errors.push(`${where}: ${op.pin} is not a modeled input.`);
        ops.push({ ...op, board: m.id, line: i + 1 });
      }
    }
    if (errors.length) return { ok: false, errors, logs, pins, tasks: [] };
    let mode = 'hybrid', stream = false;
    // Resolve output state across controllers first so READ is independent of editor tab order.
    for (const op of ops) {
      if (!power[op.board]) continue;
      if (op.kind === 'set') pins[`${op.board}.${op.pin}`] = op.value;
      if (op.kind === 'mode') mode = op.value;
      if (op.kind === 'stream') stream = op.value;
    }
    const clocks = {};
    for (const op of ops) {
      const prefix = `${op.board}:L${op.line}`;
      if (!power[op.board]) { logs.push(`${prefix} BOOT BLOCKED: power or ground missing`); continue; }
      const time = clocks[op.board] || 0;
      if (op.kind === 'wait') { clocks[op.board] = time + op.value; logs.push(`${prefix} ${clocks[op.board]} ms virtual clock`); }
      else if (op.kind === 'read') {
        const driver = design.wires.find(w => w[2] === op.board && w[3] === op.pin);
        const value = driver ? pins[`${driver[0]}.${driver[1]}`] : undefined;
        logs.push(`${prefix} ${time} ms ${op.pin} → ${value === undefined ? 'UNWIRED / UNKNOWN' : value ? 'HIGH' : 'LOW'}`);
      } else if (op.kind === 'send') {
        const paths = design.wires.filter(w => w[0] === op.board && w[1] === 'TX' && w[3] === 'RX' && power[w[2]]);
        paths.forEach(path => sends.push({ from: op.board, to: path[2], message: op.value }));
        logs.push(`${prefix} ${time} ms UART ${op.value} → ${paths.length ? paths.map(p => `${p[2]}.RX`).join(', ') : 'UNWIRED / UNPOWERED'}`);
      } else logs.push(`${prefix} ${time} ms ${op.kind.toUpperCase()} ${op.kind === 'set' ? `${op.pin} ${op.value ? 'HIGH' : 'LOW'}` : op.value}`);
    }
    const tasks = [
      { name: 'Field processor boot', pass: Boolean(power.pi1), reason: power.pi1 ? '5 V and return present in logical netlist.' : 'Processor power or ground missing.' },
      { name: 'Synchronized dual-channel capture', pass: has('mic1','OUT','adc1','IN1') && has('mic2','OUT','adc1','IN2') && has('adc1','USB','pi1','USB'), reason: 'Both microphone channels and shared-clock USB route required.' },
      { name: 'DSP program', pass: Boolean(power.pi1 && ops.some(o => o.board === 'pi1' && o.kind === 'mode')), reason: `Requested mode: ${mode.toUpperCase()}; MODE must appear in the field script.` },
      { name: 'Receiver audio route', pass: Boolean(power.pi1 && stream && has('pi1','AUDIO','receiver1','AUDIO')), reason: stream ? 'STREAM ON and logical audio wire required.' : 'STREAM OFF or missing; receiver remains silent.' },
      { name: 'Pico UART command', pass: sends.some(s => s.from === 'pi1' && s.to === 'pico1'), reason: 'Field TX, powered Pico RX and SEND UART required.' },
      { name: 'ESP32 control input', pass: Boolean(power.esp1 && has('pi1','GPIO17','esp1','GPIO4') && pins['pi1.GPIO17'] === 1), reason: 'Pi GPIO17 HIGH must reach powered ESP32 GPIO4.' }
    ];
    return { ok: true, errors, logs, pins, tasks, mode, stream, power };
  }
  window.virtualRigV2 = { run };
})();
