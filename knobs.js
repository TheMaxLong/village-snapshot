// knobs.js — the Tune contract every Creator piece shares (a classic script: pages open as file:// too).
//   Knobs.add({ id, label, group, type: 'color' | 'range' | 'asset' | 'text' | 'toggle' | 'choice', value, min, max, step, accept, maxLength, options }, apply)
//   toggle: an on/off switch, value 0 or 1 (a number, so looks saved from the old 0/1 sliders still apply); choice: one of
//   options (strings), drawn as a dropdown. Older pages that wrote a toggle as a 0–1 step-1 range, or a choice as a text knob
//   labelled "(a / b / c)", are drawn as a switch / dropdown by The Creator without changing the page. apply(v) changes
//   the piece; it may return a promise (loading a picture or a splat). An 'asset' knob's value is a path under
//   assets/uploads (a file dropped into The Creator), worlds/builds (a model The Creator rebuilt) or '' for the piece's own
//   default; accept = image | splat | model | hdri. Two flags The Creator reads: hidden (not drawn in Tune — set by code, kept
//   in looks) and rebuild (drawn, but applies only when Tune's Rebuild button runs the page's window.__rebuild scene).
//   Knobs.init()   — after the page is built: applies ?look=<base64 JSON {knobs:{id:value}}> (cap.mjs --look=@file sends it)
// The Creator reads window.__knobs() ({..def, value: now, default}) to draw the Tune panel, calls window.__setKnob(id, v) as you drag, and saves
// window.__look() (only the values you changed) as a look. A knob applies ONLY when it changes: at its default the page
// renders exactly as it did before it had knobs (check.mjs compares renders byte for byte).
(function () {
  const defs = [], vals = {};
  function set(id, v) {
    const d = defs.find(x => x.id === id); if (!d) return false;
    if (d.type === 'asset' && v !== '' && !/^(assets\/uploads|worlds\/builds)\/[^/]+$/.test(String(v))) return false;   // dropped or rebuilt files only
    if (d.type === 'choice' && !(d.options || []).includes(String(v))) return false;
    v = d.type === 'color' || d.type === 'asset' || d.type === 'choice' ? String(v) : d.type === 'text' ? String(v).slice(0, d.maxLength || 40)
      : d.type === 'toggle' ? (+v ? 1 : 0) : Math.min(d.max, Math.max(d.min, +v));
    if (vals[id] === v) return true;
    vals[id] = v; const r = d.apply(v); return r && r.then ? r.then(() => true) : true;
  }
  window.Knobs = {
    add(def, apply) { defs.push(Object.assign({}, def, { apply })); vals[def.id] = def.value; },
    init() {
      let look = {};
      try { const b = new URLSearchParams(location.search).get('look'); if (b) { const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0)))); look = j.knobs || {}; } } catch (e) { console.warn('look ignored:', e.message); }   // cap.mjs sends UTF-8 base64: plain atob turned "·" into "Â·"
      const waits = []; for (const id in look) { const r = set(id, look[id]); if (r && r.then) waits.push(r); }
      return Promise.all(waits);                                  // a page says ready only after its pictures / splats load
    },
  };
  window.__knobs = () => defs.map(({ apply, ...d }) => Object.assign(d, { default: d.value, value: vals[d.id] }));   // value = now, default = the page's own
  window.__setKnob = set;
  window.__look = () => { const o = {}; for (const d of defs) if (vals[d.id] !== d.value) o[d.id] = vals[d.id]; return o; };
})();
