export class SpatialHashGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.entries = new Map(); // id -> { pos, cellKey }
  }

  _key(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  _cellCoords(pos) {
    return {
      cx: Math.floor(pos.x / this.cellSize),
      cy: Math.floor(pos.y / this.cellSize),
      cz: Math.floor(pos.z / this.cellSize),
    };
  }

  insert(id, pos) {
    const { cx, cy, cz } = this._cellCoords(pos);
    const key = this._key(cx, cy, cz);
    if (!this.cells.has(key)) this.cells.set(key, new Set());
    this.cells.get(key).add(id);
    this.entries.set(id, { pos: { ...pos }, cellKey: key });
  }

  update(id, newPos) {
    const entry = this.entries.get(id);
    if (!entry) { this.insert(id, newPos); return; }

    const { cx: ncx, cy: ncy, cz: ncz } = this._cellCoords(newPos);
    const newKey = this._key(ncx, ncy, ncz);

    if (newKey !== entry.cellKey) {
      const oldCell = this.cells.get(entry.cellKey);
      if (oldCell) {
        oldCell.delete(id);
        if (oldCell.size === 0) this.cells.delete(entry.cellKey);
      }
      if (!this.cells.has(newKey)) this.cells.set(newKey, new Set());
      this.cells.get(newKey).add(id);
      entry.cellKey = newKey;
    }
    entry.pos = { ...newPos };
  }

  remove(id) {
    const entry = this.entries.get(id);
    if (!entry) return;
    const cell = this.cells.get(entry.cellKey);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) this.cells.delete(entry.cellKey);
    }
    this.entries.delete(id);
  }

  queryRadius(pos, radius) {
    const results = [];
    const r = radius / this.cellSize;
    const { cx, cy, cz } = this._cellCoords(pos);
    const ir = Math.ceil(r);

    for (let dx = -ir; dx <= ir; dx++) {
      for (let dy = -ir; dy <= ir; dy++) {
        for (let dz = -ir; dz <= ir; dz++) {
          const key = this._key(cx + dx, cy + dy, cz + dz);
          const cell = this.cells.get(key);
          if (cell) {
            for (const id of cell) results.push(id);
          }
        }
      }
    }
    return results;
  }

  clear() {
    this.cells.clear();
    this.entries.clear();
  }
}
