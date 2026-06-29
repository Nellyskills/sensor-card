// ─── Editor ───────────────────────────────────────────────────────────────────
class SensorCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._updateForm();
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-entity-picker").forEach(p => { p.hass = hass; });
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  _val(key, fallback = "") {
    return this._config[key] ?? fallback;
  }

  connectedCallback() {
    this._buildShell();
  }

  // Build the static shell once — only called on first connect
  _buildShell() {
    this.innerHTML = `
      <style>
        .sce { display:flex; flex-direction:column; gap:14px; padding:4px 0; }
        .sce-section { font-size:11px; font-weight:500; text-transform:uppercase;
          letter-spacing:0.08em; color:var(--secondary-text-color); margin:6px 0 0; }
        .sce-row { display:flex; flex-direction:column; gap:5px; }
        .sce-row label { font-size:13px; color:var(--primary-text-color); }
        .sce-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .sce-numfield {
          width:100%; padding:8px 10px; border-radius:8px; font-size:14px;
          background:var(--secondary-background-color);
          color:var(--primary-text-color); border:1px solid var(--divider-color);
          box-sizing:border-box;
        }
        .sce-hint { font-size:12px; color:var(--secondary-text-color); }
        .sce-divider { border:none; border-top:1px solid var(--divider-color); margin:2px 0; }
        ha-entity-picker { display:block; }
        .sce-togglerow {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px; background:var(--secondary-background-color);
          border-radius:8px; cursor:pointer; user-select:none;
        }
        .sce-togglerow span { font-size:14px; color:var(--primary-text-color); pointer-events:none; }
        .tog-track {
          width:38px; height:22px; border-radius:11px; position:relative;
          background:#888; transition:background 0.2s; flex-shrink:0; pointer-events:none;
        }
        .tog-track.on { background:var(--primary-color, #03a9f4); }
        .tog-thumb {
          position:absolute; top:3px; left:3px; width:16px; height:16px;
          border-radius:50%; background:#fff; transition:transform 0.2s; pointer-events:none;
        }
        .tog-track.on .tog-thumb { transform:translateX(16px); }
      </style>
      <div class="sce">
        <div class="sce-section">Pflichtfelder</div>
        <div class="sce-row">
          <label>Temperatur-Sensor *</label>
          <ha-entity-picker id="pick-temperature" allow-custom-entity></ha-entity-picker>
        </div>
        <div class="sce-row">
          <label>Luftfeuchtigkeit-Sensor *</label>
          <ha-entity-picker id="pick-humidity" allow-custom-entity></ha-entity-picker>
        </div>

        <hr class="sce-divider">
        <div class="sce-section">Luftfeuchtigkeit – Gutbereich</div>
        <div class="sce-hint">Welcher Bereich soll grün angezeigt werden?</div>
        <div class="sce-grid2">
          <div class="sce-row">
            <label>Minimum %</label>
            <input class="sce-numfield" type="number" id="num-humidity_good_min" min="0" max="100">
          </div>
          <div class="sce-row">
            <label>Maximum %</label>
            <input class="sce-numfield" type="number" id="num-humidity_good_max" min="0" max="100">
          </div>
        </div>

        <hr class="sce-divider">
        <div class="sce-section">CO₂ / Luftqualität (optional)</div>
        <div class="sce-togglerow" id="co2-togglerow">
          <span>CO₂-Block aktivieren</span>
          <div class="tog-track" id="co2-track"><div class="tog-thumb"></div></div>
        </div>
        <div id="co2-fields" style="display:none;flex-direction:column;gap:14px;">
          <div class="sce-row">
            <label>CO₂-Sensor (ppm)</label>
            <ha-entity-picker id="pick-co2" allow-custom-entity></ha-entity-picker>
          </div>
          <div class="sce-section">CO₂ – Gutbereich</div>
          <div class="sce-hint">Typisch: 400–800 ppm gut, ab 1200 schlecht</div>
          <div class="sce-grid2">
            <div class="sce-row">
              <label>Gut ab (ppm)</label>
              <input class="sce-numfield" type="number" id="num-co2_good_min" min="0">
            </div>
            <div class="sce-row">
              <label>Gut bis (ppm)</label>
              <input class="sce-numfield" type="number" id="num-co2_good_max" min="0">
            </div>
          </div>
          <div class="sce-grid2">
            <div class="sce-row">
              <label>Skala min (ppm)</label>
              <input class="sce-numfield" type="number" id="num-co2_min" min="0">
            </div>
            <div class="sce-row">
              <label>Skala max (ppm)</label>
              <input class="sce-numfield" type="number" id="num-co2_max" min="0">
            </div>
          </div>
        </div>
      </div>`;

    // Entity pickers
    ["temperature", "humidity", "co2"].forEach(key => {
      const picker = this.querySelector(`#pick-${key}`);
      if (!picker) return;
      if (this._hass) picker.hass = this._hass;
      picker.addEventListener("value-changed", (e) => {
        const val = e.detail.value;
        const newConfig = { ...this._config };
        if (val) newConfig[key] = val;
        else delete newConfig[key];
        this._config = newConfig;
        this._fire(newConfig);
      });
    });

    // Number inputs
    ["humidity_good_min","humidity_good_max","humidity_min","humidity_max",
     "co2_good_min","co2_good_max","co2_min","co2_max"].forEach(key => {
      const el = this.querySelector(`#num-${key}`);
      if (!el) return;
      el.addEventListener("change", () => {
        this._config = { ...this._config, [key]: parseFloat(el.value) };
        this._fire(this._config);
      });
    });

    // CO2 toggle — direct click on the row div
    const toggleRow = this.querySelector("#co2-togglerow");
    toggleRow.addEventListener("click", () => {
      const hasCo2 = this._config.co2 !== undefined;
      const newConfig = { ...this._config };
      if (hasCo2) {
        delete newConfig.co2;
      } else {
        newConfig.co2 = "";
        newConfig.co2_good_min = newConfig.co2_good_min ?? 400;
        newConfig.co2_good_max = newConfig.co2_good_max ?? 800;
        newConfig.co2_min      = newConfig.co2_min      ?? 400;
        newConfig.co2_max      = newConfig.co2_max      ?? 2000;
      }
      this._config = newConfig;
      this._fire(newConfig);
      this._updateForm();
    });

    this._updateForm();
  }

  // Update form values without rebuilding the DOM
  _updateForm() {
    if (!this.querySelector("#co2-togglerow")) return; // shell not ready yet

    const c = this._config;
    const hasCo2 = c.co2 !== undefined;

    // Entity pickers
    const setPickerVal = (id, val) => {
      const el = this.querySelector(id);
      if (el && el.value !== val) el.value = val || "";
      if (el && this._hass) el.hass = this._hass;
    };
    setPickerVal("#pick-temperature", c.temperature);
    setPickerVal("#pick-humidity",    c.humidity);
    setPickerVal("#pick-co2",         c.co2);

    // Number fields
    const setNum = (id, val) => {
      const el = this.querySelector(id);
      if (el) el.value = val;
    };
    setNum("#num-humidity_good_min", c.humidity_good_min ?? 40);
    setNum("#num-humidity_good_max", c.humidity_good_max ?? 60);
    setNum("#num-co2_good_min",      c.co2_good_min      ?? 400);
    setNum("#num-co2_good_max",      c.co2_good_max      ?? 800);
    setNum("#num-co2_min",           c.co2_min            ?? 400);
    setNum("#num-co2_max",           c.co2_max            ?? 2000);

    // Toggle visual state
    const track = this.querySelector("#co2-track");
    if (track) track.classList.toggle("on", hasCo2);

    // Show/hide CO2 fields
    const fields = this.querySelector("#co2-fields");
    if (fields) fields.style.display = hasCo2 ? "flex" : "none";
  }
}

customElements.define("sensor-card-editor", SensorCardEditor);


// ─── Card ─────────────────────────────────────────────────────────────────────
class SensorCard extends HTMLElement {
  static getStubConfig() {
    return { temperature: "", humidity: "", humidity_good_min: 40, humidity_good_max: 60 };
  }

  static getConfigElement() {
    return document.createElement("sensor-card-editor");
  }

  setConfig(config) {
    this.config = {
      humidity_good_min: 40,
      humidity_good_max: 60,
      humidity_min: 0,
      humidity_max: 100,
      co2_good_min: 400,
      co2_good_max: 800,
      co2_min: 400,
      co2_max: 2000,
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _getState(entityId) {
    if (!this._hass || !entityId) return null;
    const s = this._hass.states[entityId];
    if (!s) return null;
    const v = parseFloat(s.state);
    return isNaN(v) ? null : v;
  }

  _buildBar(value, min, max, goodMin, goodMax) {
    const totalRange = max - min;
    const badLeftWidth  = Math.max(0, goodMin - min) / totalRange;
    const goodWidth     = Math.max(0, Math.min(goodMax, max) - Math.max(goodMin, min)) / totalRange;
    const badRightWidth = Math.max(0, max - goodMax) / totalRange;

    const warnLeft  = badLeftWidth  * 0.4;
    const warnRight = badRightWidth * 0.4;
    const redLeft   = badLeftWidth  * 0.6;
    const redRight  = badRightWidth * 0.6;

    const segs = [];
    if (redLeft   > 0) segs.push({ w: redLeft,   color: "#e74c3c" });
    if (warnLeft  > 0) segs.push({ w: warnLeft,  color: "#e67e22" });
    if (goodWidth > 0) segs.push({ w: goodWidth, color: "#2ecc71" });
    if (warnRight > 0) segs.push({ w: warnRight, color: "#e67e22" });
    if (redRight  > 0) segs.push({ w: redRight,  color: "#e74c3c" });

    const barsHTML = segs
      .map(s => `<div style="flex:${s.w};background:${s.color};height:100%;min-width:2px;"></div>`)
      .join("");

    const pct = ((Math.max(min, Math.min(max, value)) - min) / totalRange) * 100;

    return `
      <div style="position:relative;width:100%;display:flex;flex-direction:column;gap:2px;">
        <div style="position:relative;width:100%;height:10px;">
          <div style="position:absolute;left:${pct}%;transform:translateX(-50%);bottom:0;
            font-size:10px;color:var(--primary-text-color);line-height:1;">▼</div>
        </div>
        <div style="display:flex;width:100%;height:6px;border-radius:3px;overflow:hidden;">${barsHTML}</div>
      </div>`;
  }

  _render() {
    const c = this.config;
    if (!c) return;

    const temp   = this._getState(c.temperature);
    const hum    = this._getState(c.humidity);
    const co2    = c.co2 ? this._getState(c.co2) : null;
    const hasCo2 = !!c.co2;

    const tempStr = temp !== null ? `${temp.toFixed(1)}°C` : "–°C";
    const humStr  = hum  !== null ? `${Math.round(hum)}%`  : "–%";
    const co2Str  = co2  !== null ? `${Math.round(co2)}`   : "–";

    const humBar = hum !== null
      ? this._buildBar(hum, c.humidity_min, c.humidity_max, c.humidity_good_min, c.humidity_good_max)
      : `<div style="height:16px;"></div>`;

    const co2Bar = co2 !== null
      ? this._buildBar(co2, c.co2_min, c.co2_max, c.co2_good_min, c.co2_good_max)
      : `<div style="height:16px;"></div>`;

    const divider = `<div style="width:1px;height:36px;background:var(--divider-color);flex-shrink:0;align-self:center;"></div>`;

    const numStyle = `font-size:24px;font-weight:600;color:var(--primary-text-color);line-height:1;`;
    const unitStyle = `font-size:13px;font-weight:400;color:var(--secondary-text-color);margin-left:2px;`;

    const co2Block = hasCo2 ? `
      ${divider}
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-width:0;">
        <div style="${numStyle}">
          ${co2Str}<span style="${unitStyle}">ppm</span>
        </div>
        ${co2Bar}
        <div style="font-size:10px;color:var(--secondary-text-color);text-transform:uppercase;letter-spacing:0.06em;">CO₂</div>
      </div>` : "";

    this.innerHTML = `
      <ha-card>
        <div style="display:flex;align-items:center;gap:16px;padding:12px 16px;">
          <div style="font-size:28px;font-weight:600;color:var(--primary-text-color);white-space:nowrap;line-height:1;flex-shrink:0;">
            ${tempStr}
          </div>
          ${divider}
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1;min-width:0;">
            <div style="${numStyle}">${humStr}</div>
            ${humBar}
            <div style="font-size:10px;color:var(--secondary-text-color);text-transform:uppercase;letter-spacing:0.06em;">Luftfeuchtigkeit</div>
          </div>
          ${co2Block}
        </div>
      </ha-card>`;
  }

  getCardSize() { return 1; }
}

customElements.define("sensor-card", SensorCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "sensor-card",
  name: "Sensor Card",
  description: "Kompakte Karte für Temperatur, Luftfeuchtigkeit und CO₂",
  preview: true,
});
