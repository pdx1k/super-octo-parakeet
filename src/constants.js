export const TICK_RATE = 60;
export const MAX_SPECIES = 6;
export const DEFAULT_ARENA_SIZE = 80;
export const DEFAULT_RESOURCE_COUNT = 200;
export const RESOURCE_ENERGY = 30;
export const MAX_CREATURES = 800;
export const BEHAVIOR_UPDATE_INTERVAL = 3; // run each creature's behavior every N ticks (~20Hz)

export const SPECIES_DEFAULTS = {
  attackPower: 10,
  attackRange: 3,
  gatherEfficiency: 1.0,
  turningSpeed: 0.05,
  moveSpeed: 5,
  visionRange: 15,
  defense: 5,
  reproductionThreshold: 100,
};

export const SHAPE_TYPES = [
  'sphere', 'cube', 'tetrahedron',
  'octahedron', 'cone', 'torus',
];
