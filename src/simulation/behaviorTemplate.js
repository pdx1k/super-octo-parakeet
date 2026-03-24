export const DEFAULT_BEHAVIOR_SOURCE = `function behavior(self, nearby, dt) {
  // Sort nearby creatures by distance
  const enemies = nearby.creatures.filter(c => !c.isSameSpecies);
  const allies  = nearby.creatures.filter(c => c.isSameSpecies);

  // Attack nearest enemy if in range
  if (enemies.length > 0) {
    const nearest = enemies[0];
    if (nearest.distance <= self.stats.attackRange) {
      return { type: 'attack', targetId: nearest.id };
    }
  }

  // Gather nearest resource if below reproduction threshold
  if (self.energy < self.stats.reproductionThreshold * 0.85 && nearby.resources.length > 0) {
    const res = nearby.resources[0];
    if (res.distance <= self.stats.attackRange) {
      return { type: 'gather', targetId: res.id };
    }
    return { type: 'move', target: res.position };
  }

  // Reproduce when full
  if (self.energy >= self.stats.reproductionThreshold) {
    return { type: 'reproduce' };
  }

  // Chase nearest enemy
  if (enemies.length > 0) {
    return { type: 'move', target: enemies[0].position };
  }

  // Wander using persistent per-creature angle that drifts each update
  return {
    type: 'wander',
    direction: {
      x: Math.cos(self.wanderAngle),
      y: 0,
      z: Math.sin(self.wanderAngle),
    },
  };
}`;
