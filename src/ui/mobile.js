export function isMobile() {
  return window.innerWidth < 1024;
}

export class BottomSheet {
  constructor(el) {
    this.el = el;
    this._states = ['collapsed', 'half', 'full'];
    this.state = 'collapsed';
    this._startY = 0;
    this._setupHandle();
  }

  _setupHandle() {
    const handle = this.el.querySelector('.sheet-handle');
    if (!handle) return;
    handle.addEventListener('touchstart', (e) => {
      this._startY = e.touches[0].clientY;
    }, { passive: true });
    handle.addEventListener('touchend', (e) => {
      const delta = this._startY - e.changedTouches[0].clientY;
      if (delta > 40) this._advance();
      else if (delta < -40) this._retreat();
    }, { passive: true });
    // Click cycles through states on non-touch
    handle.addEventListener('click', () => this._advance());
  }

  _advance() {
    const idx = this._states.indexOf(this.state);
    if (idx < this._states.length - 1) this.setState(this._states[idx + 1]);
  }

  _retreat() {
    const idx = this._states.indexOf(this.state);
    if (idx > 0) this.setState(this._states[idx - 1]);
  }

  setState(state) {
    this.state = state;
    this.el.dataset.state = state;
  }
}

export function initMobileUI(simulation, species, onStartPause) {
  const toolbar = document.getElementById('mobile-toolbar');
  if (!toolbar) return;
  toolbar.style.display = 'flex';

  const sheet = document.getElementById('bottom-sheet');
  if (!sheet) return;
  sheet.style.display = 'block';
  const bs = new BottomSheet(sheet);

  const btnSpecies = document.getElementById('btn-species');
  const btnStart = document.getElementById('btn-start');
  const btnStats = document.getElementById('btn-stats');

  if (btnSpecies) {
    btnSpecies.addEventListener('click', () => {
      bs.setState('half');
    });
  }

  if (btnStart) {
    btnStart.textContent = simulation.running ? 'Pause' : 'Start';
    btnStart.addEventListener('click', () => {
      if (onStartPause) onStartPause(btnStart);
    });
  }

  if (btnStats) {
    btnStats.addEventListener('click', () => {
      const panel = document.getElementById('stats-panel');
      if (panel) panel.classList.toggle('mobile-visible');
    });
  }

  return bs;
}
