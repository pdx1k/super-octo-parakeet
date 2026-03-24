import { BehaviorEditor } from './editor.js';
import { SHAPE_TYPES } from '../constants.js';
import { SPECIES_COLORS_CSS } from '../utils/colors.js';

const SLIDER_DEFS = [
  { key: 'moveSpeed',              label: 'Move Speed',               min: 1,   max: 20,  step: 0.5 },
  { key: 'visionRange',            label: 'Vision Range',             min: 5,   max: 40,  step: 1   },
  { key: 'attackPower',            label: 'Attack Power',             min: 1,   max: 50,  step: 1   },
  { key: 'attackRange',            label: 'Attack Range',             min: 1,   max: 20,  step: 0.5 },
  { key: 'defense',                label: 'Defense',                  min: 0,   max: 30,  step: 1   },
  { key: 'gatherEfficiency',       label: 'Gather Efficiency',        min: 0.1, max: 3.0, step: 0.1 },
  { key: 'turningSpeed',           label: 'Turning Speed',            min: 0.01,max: 0.2, step: 0.01},
  { key: 'reproductionThreshold',  label: 'Reproduction Threshold',   min: 50,  max: 200, step: 5   },
];

export function initControls(sidebarEl, { species, simulation, onReset, onStartPause }) {
  sidebarEl.innerHTML = '';

  // ── Arena Settings ──────────────────────────────────────────
  const arenaSection = document.createElement('section');
  arenaSection.className = 'sidebar-section';
  arenaSection.innerHTML = '<h3>Arena Settings</h3>';

  const arenaFields = [
    { label: 'Resource Count', id: 'opt-resources', type: 'number', min: 50, max: 500, step: 10, key: 'resourceCount', getter: () => simulation.options.resourceCount },
    { label: 'Starting Creatures', id: 'opt-starting', type: 'number', min: 1, max: 30, step: 1, key: 'startingCreatures', getter: () => simulation.options.startingCreatures },
    { label: 'Respawn Delay (ticks)', id: 'opt-respawn', type: 'number', min: 60, max: 1200, step: 60, key: 'resourceRespawnDelay', getter: () => simulation.options.resourceRespawnDelay },
  ];

  for (const field of arenaFields) {
    const row = document.createElement('div');
    row.className = 'control-row';
    const lbl = document.createElement('label');
    lbl.htmlFor = field.id;
    lbl.textContent = field.label;
    const input = document.createElement('input');
    input.type = field.type;
    input.id = field.id;
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = field.getter();
    input.addEventListener('change', () => {
      simulation.options[field.key] = Number(input.value);
    });
    row.appendChild(lbl);
    row.appendChild(input);
    arenaSection.appendChild(row);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const startBtn = document.createElement('button');
  startBtn.id = 'btn-start-desktop';
  startBtn.textContent = simulation.running ? 'Pause' : 'Start';
  startBtn.className = 'btn-primary';
  startBtn.addEventListener('click', () => {
    if (onStartPause) onStartPause(startBtn);
  });

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.className = 'btn-secondary';
  resetBtn.addEventListener('click', () => onReset());

  btnRow.appendChild(startBtn);
  btnRow.appendChild(resetBtn);
  arenaSection.appendChild(btnRow);
  sidebarEl.appendChild(arenaSection);

  // ── Species Tabs ─────────────────────────────────────────────
  const tabsSection = document.createElement('section');
  tabsSection.className = 'sidebar-section species-tabs-section';

  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';

  const tabPanels = document.createElement('div');
  tabPanels.className = 'tab-panels';

  const editors = {};

  species.forEach((sp, idx) => {
    // Tab button
    const tab = document.createElement('button');
    tab.className = 'tab-btn' + (idx === 0 ? ' active' : '');
    tab.textContent = `S${sp.id + 1}`;
    tab.style.borderBottom = `3px solid ${SPECIES_COLORS_CSS[sp.id]}`;
    tab.dataset.idx = idx;

    tab.addEventListener('click', () => {
      tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      tabPanels.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = tabPanels.querySelector(`.tab-panel[data-idx="${idx}"]`);
      if (panel) panel.classList.add('active');
    });

    tabBar.appendChild(tab);

    // Tab panel
    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (idx === 0 ? ' active' : '');
    panel.dataset.idx = idx;

    // Name
    const nameRow = document.createElement('div');
    nameRow.className = 'control-row';
    const nameLbl = document.createElement('label');
    nameLbl.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = sp.name;
    nameInput.addEventListener('change', () => { sp.name = nameInput.value; tab.title = nameInput.value; });
    nameRow.appendChild(nameLbl);
    nameRow.appendChild(nameInput);
    panel.appendChild(nameRow);

    // Shape selector
    const shapeRow = document.createElement('div');
    shapeRow.className = 'control-row shape-row';
    const shapeLbl = document.createElement('label');
    shapeLbl.textContent = 'Shape';
    const shapeSelect = document.createElement('select');
    SHAPE_TYPES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      if (s === sp.config.shape) opt.selected = true;
      shapeSelect.appendChild(opt);
    });
    shapeSelect.addEventListener('change', () => { sp.config.shape = shapeSelect.value; });
    shapeRow.appendChild(shapeLbl);
    shapeRow.appendChild(shapeSelect);
    panel.appendChild(shapeRow);

    // Color
    const colorRow = document.createElement('div');
    colorRow.className = 'control-row';
    const colorLbl = document.createElement('label');
    colorLbl.textContent = 'Color';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = SPECIES_COLORS_CSS[sp.id];
    colorInput.addEventListener('input', () => {
      const hex = parseInt(colorInput.value.slice(1), 16);
      sp.config.color = hex;
      // Update existing creature meshes
      for (const c of simulation.creatures.values()) {
        if (c.species.id === sp.id) {
          c.mesh.material.color.setHex(hex);
        }
      }
    });
    colorRow.appendChild(colorLbl);
    colorRow.appendChild(colorInput);
    panel.appendChild(colorRow);

    // Sliders
    for (const def of SLIDER_DEFS) {
      const row = document.createElement('div');
      row.className = 'slider-row';

      const labelEl = document.createElement('label');
      labelEl.textContent = def.label;

      const sliderEl = document.createElement('input');
      sliderEl.type = 'range';
      sliderEl.min = def.min;
      sliderEl.max = def.max;
      sliderEl.step = def.step;
      sliderEl.value = sp.config[def.key];

      const valueEl = document.createElement('span');
      valueEl.className = 'slider-value';
      valueEl.textContent = sp.config[def.key];

      sliderEl.addEventListener('input', () => {
        sp.config[def.key] = Number(sliderEl.value);
        valueEl.textContent = sliderEl.value;
      });

      row.appendChild(labelEl);
      row.appendChild(sliderEl);
      row.appendChild(valueEl);
      panel.appendChild(row);
    }

    // Code editor (lazy init when tab first activated)
    const editorContainer = document.createElement('div');
    editorContainer.className = 'editor-container';

    const editorPlaceholder = document.createElement('div');
    editorPlaceholder.className = 'editor-placeholder';
    editorPlaceholder.textContent = 'Loading editor…';
    editorContainer.appendChild(editorPlaceholder);

    let editorLoaded = false;
    const loadEditor = () => {
      if (editorLoaded) return;
      editorLoaded = true;
      editorContainer.innerHTML = '';
      const ed = new BehaviorEditor(editorContainer, sp.behaviorSource, (src) => {
        const ok = sp.updateBehaviorSource(src);
        const msg = document.createElement('div');
        msg.className = 'editor-msg ' + (ok ? 'success' : 'error');
        msg.textContent = ok ? 'Behavior applied!' : 'Compile error — check console.';
        editorContainer.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
      });
      editors[sp.id] = ed;
    };

    // Load editor for first tab immediately, others lazily
    if (idx === 0) {
      setTimeout(loadEditor, 50);
    } else {
      tab.addEventListener('click', loadEditor, { once: true });
    }

    panel.appendChild(editorContainer);
    tabPanels.appendChild(panel);
  });

  tabsSection.appendChild(tabBar);
  tabsSection.appendChild(tabPanels);
  sidebarEl.appendChild(tabsSection);

  return {
    setStartBtnText: (text) => {
      const btn = sidebarEl.querySelector('#btn-start-desktop');
      if (btn) btn.textContent = text;
    },
  };
}
