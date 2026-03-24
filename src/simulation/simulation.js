import { Creature } from './creature.js';
import { ResourceNode } from './resource.js';
import { SpatialHashGrid } from '../utils/spatial.js';
import {
  TICK_RATE,
  DEFAULT_RESOURCE_COUNT,
  MAX_CREATURES,
  BEHAVIOR_UPDATE_INTERVAL,
} from '../constants.js';

export class Simulation {
  constructor(arena, speciesList, options = {}) {
    this.arena = arena;
    this.species = speciesList;
    this.options = {
      resourceCount: options.resourceCount ?? DEFAULT_RESOURCE_COUNT,
      startingCreatures: options.startingCreatures ?? 10,
      resourceRespawnDelay: options.resourceRespawnDelay ?? 300,
      ...options,
    };

    this.creatures = new Map();
    this.resources = new Map();
    this.grid = new SpatialHashGrid(20);
    this.resourceGrid = new SpatialHashGrid(20);
    this.tick = 0;
    this.running = false;
    this._accumulator = 0;
    this._lastTime = 0;
    this._fixedDt = 1 / TICK_RATE;
    this._animFrameId = null;

    this.onPopulationSnapshot = null;
    this.onFpsUpdate = null;
    this._fpsFrames = 0;
    this._fpsLast = 0;
  }

  initialize() {
    // Clear previous state
    for (const c of this.creatures.values()) c.dispose(this.arena.scene);
    this.creatures.clear();
    this.resources.clear();
    this.grid.clear();
    this.resourceGrid.clear();
    this.tick = 0;

    // Spawn starting creatures per species
    for (const species of this.species) {
      for (let i = 0; i < this.options.startingCreatures; i++) {
        this._spawnCreature(species, this._randomPosOnFloor());
      }
    }

    // Spawn resources
    for (let i = 0; i < this.options.resourceCount; i++) {
      this._createResource(this._randomPosOnFloor());
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._lastTime = performance.now();
    this._fpsLast = this._lastTime;
    this._animFrameId = requestAnimationFrame(this._loop.bind(this));
  }

  stop() {
    this.running = false;
    if (this._animFrameId !== null) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  _loop(timestamp) {
    if (!this.running) return;

    // FPS counter
    this._fpsFrames++;
    if (timestamp - this._fpsLast >= 1000) {
      if (this.onFpsUpdate) this.onFpsUpdate(this._fpsFrames);
      this._fpsFrames = 0;
      this._fpsLast = timestamp;
    }

    const elapsed = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;
    this._accumulator += Math.min(elapsed, 0.1);

    while (this._accumulator >= this._fixedDt) {
      this._step(this._fixedDt);
      this._accumulator -= this._fixedDt;
    }

    this.arena.render();
    this._animFrameId = requestAnimationFrame(this._loop.bind(this));
  }

  _step(dt) {
    this.tick++;

    this._tickResources();
    this._runBehaviors(dt);
    this._resolveActions(dt);
    this._updateMeshes();

    if (this.tick % 60 === 0) this._emitSnapshot();
  }

  _tickResources() {
    for (const res of this.resources.values()) {
      const wasDepleted = res.depleted;
      res.tick();
      if (wasDepleted && !res.depleted) {
        // Just respawned — update grid
        this.resourceGrid.insert(res.id, res.position);
      }
    }
  }

  _runBehaviors(dt) {
    for (const creature of this.creatures.values()) {
      // Round-robin: not every creature recalculates every tick
      if ((creature._behaviorAge ?? 0) % BEHAVIOR_UPDATE_INTERVAL !== this.tick % BEHAVIOR_UPDATE_INTERVAL) {
        creature._behaviorAge = (creature._behaviorAge ?? 0) + 1;
        continue;
      }
      creature._behaviorAge = (creature._behaviorAge ?? 0) + 1;

      const nearby = this._getPerception(creature);
      creature.pendingAction = creature.species.runBehavior(creature.state, nearby, dt);
    }
  }

  _getPerception(creature) {
    const vr = creature.species.config.visionRange;
    const candidateIds = this.grid.queryRadius(creature.position, vr);
    const candidateResourceIds = this.resourceGrid.queryRadius(creature.position, vr);

    const visibleCreatures = [];
    for (const id of candidateIds) {
      if (id === creature.id) continue;
      const other = this.creatures.get(id);
      if (!other) continue;
      const dx = other.position.x - creature.position.x;
      const dy = other.position.y - creature.position.y;
      const dz = other.position.z - creature.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= vr) {
        visibleCreatures.push({
          id: other.id,
          speciesId: other.species.id,
          position: { ...other.position },
          health: other.health,
          energy: other.energy,
          isSameSpecies: other.species.id === creature.species.id,
          distance: dist,
        });
      }
    }
    visibleCreatures.sort((a, b) => a.distance - b.distance);

    const visibleResources = [];
    for (const id of candidateResourceIds) {
      const res = this.resources.get(id);
      if (!res || res.depleted) continue;
      const dx = res.position.x - creature.position.x;
      const dy = res.position.y - creature.position.y;
      const dz = res.position.z - creature.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= vr) {
        visibleResources.push({
          id: res.id,
          position: { ...res.position },
          energy: res.energy,
          distance: dist,
        });
      }
    }
    visibleResources.sort((a, b) => a.distance - b.distance);

    return { creatures: visibleCreatures, resources: visibleResources };
  }

  _resolveActions(dt) {
    const toRemove = [];
    const toSpawn = [];

    for (const creature of this.creatures.values()) {
      // Age + passive energy drain
      creature.age++;
      creature.energy -= 0.05;

      const action = creature.pendingAction;
      if (!action) continue;

      switch (action.type) {
        case 'move':
          this._actionMove(creature, action.target, dt);
          break;
        case 'wander':
          this._actionWander(creature, action.direction, dt);
          break;
        case 'attack':
          this._actionAttack(creature, action.targetId);
          break;
        case 'gather':
          this._actionGather(creature, action.targetId);
          break;
        case 'reproduce':
          if (this.creatures.size < MAX_CREATURES) {
            const child = this._actionReproduce(creature);
            if (child) toSpawn.push(child);
          }
          break;
        case 'idle':
        default:
          break;
      }

      // Clamp energy
      creature.energy = Math.max(0, Math.min(200, creature.energy));

      // Starvation
      if (creature.energy <= 0 || creature.health <= 0) {
        toRemove.push(creature);
      }
    }

    for (const c of toRemove) this._removeCreature(c);
    for (const [species, pos] of toSpawn) this._spawnCreature(species, pos);
  }

  _actionMove(creature, target, dt) {
    if (!target) return;
    const dx = target.x - creature.position.x;
    const dy = target.y - creature.position.y;
    const dz = target.z - creature.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.5) return;
    const speed = creature.species.config.moveSpeed;
    const step = Math.min(speed * dt, dist);
    const inv = step / dist;
    creature.position.x += dx * inv;
    creature.position.y = Math.max(0, creature.position.y + dy * inv);
    creature.position.z += dz * inv;
    this._clampToArena(creature);
    this.grid.update(creature.id, creature.position);
  }

  _actionWander(creature, dir, dt) {
    if (!dir) return;
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    if (len < 0.001) return;
    const inv = 1 / len;
    const speed = creature.species.config.moveSpeed;
    creature.position.x += dir.x * inv * speed * dt;
    creature.position.y = Math.max(0, creature.position.y + dir.y * inv * speed * dt);
    creature.position.z += dir.z * inv * speed * dt;
    this._clampToArena(creature);
    this.grid.update(creature.id, creature.position);
  }

  _actionAttack(creature, targetId) {
    if (!targetId) return;
    const target = this.creatures.get(targetId);
    if (!target) return;
    const dx = target.position.x - creature.position.x;
    const dy = target.position.y - creature.position.y;
    const dz = target.position.z - creature.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > creature.species.config.attackRange * 1.5) return; // slight tolerance
    const damage = Math.max(1, creature.species.config.attackPower - target.species.config.defense);
    target.health -= damage;
    creature.energy -= 2;
    if (target.health <= 0) {
      creature.energy = Math.min(200, creature.energy + 15);
    }
  }

  _actionGather(creature, resourceId) {
    if (!resourceId) return;
    const res = this.resources.get(resourceId);
    if (!res || res.depleted) return;
    const dx = res.position.x - creature.position.x;
    const dz = res.position.z - creature.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > creature.species.config.attackRange * 1.5) return;
    const gained = res.gather(creature.species.config.gatherEfficiency);
    creature.energy = Math.min(200, creature.energy + gained);
    if (res.depleted) {
      this.resourceGrid.remove(res.id);
      res.respawn(this._randomPosOnFloor(), this.options.resourceRespawnDelay);
    }
  }

  _actionReproduce(creature) {
    if (creature.energy < creature.species.config.reproductionThreshold) return null;
    creature.energy *= 0.3;
    const offset = () => (Math.random() - 0.5) * 4;
    const childPos = {
      x: creature.position.x + offset(),
      y: 0,
      z: creature.position.z + offset(),
    };
    this._clampPosToArena(childPos);
    return [creature.species, childPos];
  }

  _clampToArena(creature) {
    this._clampPosToArena(creature.position);
  }

  _clampPosToArena(pos) {
    const r = this.arena.size * 0.95;
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > r) {
      const inv = r / dist;
      pos.x *= inv;
      pos.z *= inv;
    }
    pos.y = 0;
  }

  _updateMeshes() {
    for (const c of this.creatures.values()) c.updateMesh();
  }

  _spawnCreature(species, position) {
    const c = new Creature(species, position);
    this.creatures.set(c.id, c);
    this.arena.scene.add(c.mesh);
    this.grid.insert(c.id, c.position);
    return c;
  }

  _removeCreature(creature) {
    this.grid.remove(creature.id);
    creature.dispose(this.arena.scene);
    this.creatures.delete(creature.id);
  }

  _createResource(position) {
    const res = new ResourceNode(position);
    this.resources.set(res.id, res);
    this.arena.scene.add(res.mesh);
    this.resourceGrid.insert(res.id, res.position);
    return res;
  }

  _randomPosOnFloor() {
    const r = this.arena.size * 0.9;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * r;
    return { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
  }

  _emitSnapshot() {
    if (!this.onPopulationSnapshot) return;
    const counts = {};
    for (const sp of this.species) counts[sp.id] = 0;
    for (const c of this.creatures.values()) {
      counts[c.species.id] = (counts[c.species.id] ?? 0) + 1;
    }
    this.onPopulationSnapshot({ tick: this.tick, counts, total: this.creatures.size });
  }

  getStats() {
    const counts = {};
    for (const sp of this.species) counts[sp.id] = 0;
    for (const c of this.creatures.values()) counts[c.species.id]++;
    return { tick: this.tick, total: this.creatures.size, counts };
  }
}
