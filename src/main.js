import './style.css';
import { Arena } from './simulation/arena.js';
import { Simulation } from './simulation/simulation.js';
import { Species } from './simulation/species.js';
import { initControls } from './ui/controls.js';
import { PopulationHUD } from './ui/hud.js';
import { isMobile, initMobileUI } from './ui/mobile.js';
import { SPECIES_COLORS } from './utils/colors.js';
import { DEFAULT_ARENA_SIZE } from './constants.js';

let simulation = null;
let hud = null;
let controls = null;

function boot() {
  const canvas = document.getElementById('three-canvas');
  const arena = new Arena(canvas, DEFAULT_ARENA_SIZE);

  const numSpecies = 3;
  const species = Array.from({ length: numSpecies }, (_, i) =>
    new Species(i, `Species ${i + 1}`, SPECIES_COLORS[i])
  );

  // Population HUD
  const chartWrap = document.getElementById('population-chart-wrap');
  const chartCanvas = document.getElementById('population-chart');
  if (hud) hud.destroy();
  hud = new PopulationHUD(chartCanvas, species);

  // Simulation
  simulation = new Simulation(arena, species, {
    resourceCount: 200,
    startingCreatures: 10,
    resourceRespawnDelay: 300,
  });

  simulation.onPopulationSnapshot = (snapshot) => {
    hud.addSnapshot(snapshot);
    updateStatsDisplay(snapshot, species);
  };

  simulation.onFpsUpdate = (fps) => {
    const el = document.getElementById('stat-fps');
    if (el) el.textContent = fps;
  };

  simulation.initialize();

  // Controls
  controls = initControls(
    document.getElementById('sidebar'),
    {
      species,
      simulation,
      onReset: () => {
        simulation.stop();
        // Remove all meshes from old arena — arena is re-created via boot()
        for (const c of simulation.creatures.values()) {
          arena.scene.remove(c.mesh);
          c.mesh.material.dispose();
        }
        for (const r of simulation.resources.values()) {
          arena.scene.remove(r.mesh);
        }
        arena.dispose();
        boot();
      },
      onStartPause: (btn) => {
        if (simulation.running) {
          simulation.stop();
          btn.textContent = 'Start';
          const mobileBtn = document.getElementById('btn-start');
          if (mobileBtn) mobileBtn.textContent = 'Start';
        } else {
          simulation.start();
          btn.textContent = 'Pause';
          const mobileBtn = document.getElementById('btn-start');
          if (mobileBtn) mobileBtn.textContent = 'Pause';
        }
      },
    }
  );

  // Mobile
  if (isMobile()) {
    initMobileUI(simulation, species, (btn) => {
      if (simulation.running) {
        simulation.stop();
        btn.textContent = 'Start';
        controls.setStartBtnText('Start');
      } else {
        simulation.start();
        btn.textContent = 'Pause';
        controls.setStartBtnText('Pause');
      }
    });
  }

  // Move species tabs into bottom sheet for mobile
  if (isMobile()) {
    const sheetContent = document.getElementById('sheet-content');
    const speciesSection = document.querySelector('.species-tabs-section');
    if (sheetContent && speciesSection) {
      sheetContent.appendChild(speciesSection);
    }
  }

  // Auto-start
  simulation.start();
  controls.setStartBtnText('Pause');
  const mobileStartBtn = document.getElementById('btn-start');
  if (mobileStartBtn) mobileStartBtn.textContent = 'Pause';
}

function updateStatsDisplay(snapshot, species) {
  const el = document.getElementById('stats-display');
  if (!el) return;

  const tickEl = document.getElementById('stat-tick');
  const totalEl = document.getElementById('stat-total');
  if (tickEl) tickEl.textContent = snapshot.tick;
  if (totalEl) totalEl.textContent = snapshot.total;

  const list = el.querySelector('.species-count-list');
  if (!list) return;
  list.innerHTML = '';
  for (const sp of species) {
    const row = document.createElement('div');
    row.className = 'species-count-row';
    const colorHex = '#' + sp.config.color.toString(16).padStart(6, '0');
    row.innerHTML = `
      <span class="species-dot" style="background:${colorHex}"></span>
      <span style="flex:1;color:#aab;font-size:11px">${sp.name}</span>
      <span class="stat-val" style="font-size:11px">${snapshot.counts[sp.id] ?? 0}</span>
    `;
    list.appendChild(row);
  }
}

document.addEventListener('DOMContentLoaded', boot);
