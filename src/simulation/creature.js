import * as THREE from 'three';
import { SHAPE_TYPES } from '../constants.js';

const GEOMETRY_FACTORIES = {
  sphere:      () => new THREE.SphereGeometry(0.8, 8, 6),
  cube:        () => new THREE.BoxGeometry(1.2, 1.2, 1.2),
  tetrahedron: () => new THREE.TetrahedronGeometry(1.0),
  octahedron:  () => new THREE.OctahedronGeometry(1.0),
  cone:        () => new THREE.ConeGeometry(0.7, 1.4, 8),
  torus:       () => new THREE.TorusGeometry(0.6, 0.25, 8, 16),
};

const _geometryCache = new Map();

export function getSharedGeometry(shapeType) {
  if (!_geometryCache.has(shapeType)) {
    const factory = GEOMETRY_FACTORIES[shapeType] ?? GEOMETRY_FACTORIES.sphere;
    _geometryCache.set(shapeType, factory());
  }
  return _geometryCache.get(shapeType);
}

export function disposeGeometryCache() {
  for (const geo of _geometryCache.values()) geo.dispose();
  _geometryCache.clear();
}

let _nextId = 0;

export class Creature {
  constructor(species, position) {
    this.id = `c${_nextId++}`;
    this.species = species;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.energy = species.config.reproductionThreshold * 0.5;
    this.health = 100;
    this.age = 0;
    this._wanderAngle = Math.random() * Math.PI * 2;
    this.pendingAction = null;
    this._indexInSpecies = -1; // for instanced mesh tracking

    const geo = getSharedGeometry(species.config.shape);
    const mat = new THREE.MeshPhongMaterial({ color: species.config.color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.castShadow = true;
  }

  get state() {
    return {
      id: this.id,
      speciesId: this.species.id,
      position: { ...this.position },
      velocity: { ...this.velocity },
      wanderAngle: this._wanderAngle,
      energy: this.energy,
      health: this.health,
      age: this.age,
      stats: { ...this.species.config },
    };
  }

  updateMesh() {
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    const s = 0.5 + (this.health / 100) * 0.5;
    this.mesh.scale.setScalar(s);
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.mesh.material.dispose(); // geometry is shared, do NOT dispose it
  }
}
