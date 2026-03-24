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

  // Wander in the tangent plane of the sphere at the creature's position
  const r = Math.sqrt(self.position.x**2 + self.position.y**2 + self.position.z**2) || 1;
  const nx = self.position.x / r, ny = self.position.y / r, nz = self.position.z / r;
  // Build two orthonormal tangent vectors (e1, e2) at this point on the sphere
  const refX = Math.abs(ny) < 0.9 ? 0 : 1, refY = Math.abs(ny) < 0.9 ? 1 : 0, refZ = 0;
  const t1x = refY * nz - refZ * ny, t1y = refZ * nx - refX * nz, t1z = refX * ny - refY * nx;
  const t1len = Math.sqrt(t1x**2 + t1y**2 + t1z**2);
  const e1x = t1x / t1len, e1y = t1y / t1len, e1z = t1z / t1len;
  const e2x = ny * e1z - nz * e1y, e2y = nz * e1x - nx * e1z, e2z = nx * e1y - ny * e1x;
  return {
    type: 'wander',
    direction: {
      x: Math.cos(self.wanderAngle) * e1x + Math.sin(self.wanderAngle) * e2x,
      y: Math.cos(self.wanderAngle) * e1y + Math.sin(self.wanderAngle) * e2y,
      z: Math.cos(self.wanderAngle) * e1z + Math.sin(self.wanderAngle) * e2z,
    },
  };
}`;
