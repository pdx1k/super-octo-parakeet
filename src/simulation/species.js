import { SPECIES_DEFAULTS, SHAPE_TYPES } from '../constants.js';
import { compileBehavior, callBehavior } from '../utils/sandbox.js';
import { DEFAULT_BEHAVIOR_SOURCE } from './behaviorTemplate.js';

export class Species {
  constructor(id, name, color, shape) {
    this.id = id;
    this.name = name;
    this.config = {
      ...SPECIES_DEFAULTS,
      color,
      shape: shape ?? SHAPE_TYPES[id % SHAPE_TYPES.length],
    };
    this.behaviorSource = DEFAULT_BEHAVIOR_SOURCE;
    this._compiledBehavior = compileBehavior(DEFAULT_BEHAVIOR_SOURCE);
    this.alive = true;
  }

  updateBehaviorSource(source) {
    const fn = compileBehavior(source);
    if (fn) {
      this.behaviorSource = source;
      this._compiledBehavior = fn;
      return true;
    }
    return false;
  }

  runBehavior(self, nearby, dt) {
    if (!this._compiledBehavior) return { type: 'idle' };
    return callBehavior(this._compiledBehavior, self, nearby, dt);
  }
}
