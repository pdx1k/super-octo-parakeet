import Chart from 'chart.js/auto';
import { SPECIES_COLORS_CSS } from '../utils/colors.js';

export class PopulationHUD {
  constructor(canvasEl, species) {
    this._species = species;
    this._maxSamples = 300;
    this._labels = [];
    this._datasets = species.map((s) => ({
      label: s.name,
      data: [],
      borderColor: SPECIES_COLORS_CSS[s.id],
      backgroundColor: SPECIES_COLORS_CSS[s.id] + '22',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
    }));

    this.chart = new Chart(canvasEl, {
      type: 'line',
      data: {
        labels: this._labels,
        datasets: this._datasets,
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#ccc', boxWidth: 12, font: { size: 11 } },
          },
        },
        scales: {
          x: { display: false },
          y: {
            min: 0,
            ticks: { color: '#aaa', font: { size: 10 } },
            grid: { color: '#222' },
          },
        },
      },
    });
  }

  addSnapshot(snapshot) {
    this._labels.push(snapshot.tick);
    if (this._labels.length > this._maxSamples) this._labels.shift();

    for (const ds of this._datasets) {
      const sp = this._species.find((s) => s.name === ds.label);
      if (!sp) continue;
      ds.data.push(snapshot.counts[sp.id] ?? 0);
      if (ds.data.length > this._maxSamples) ds.data.shift();
    }

    this.chart.update('none');
  }

  updateSpeciesLabels(species) {
    this._species = species;
    for (let i = 0; i < this._datasets.length; i++) {
      if (species[i]) this._datasets[i].label = species[i].name;
    }
    this.chart.update('none');
  }

  destroy() {
    this.chart.destroy();
  }
}
