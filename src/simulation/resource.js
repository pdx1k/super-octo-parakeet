import * as THREE from 'three';

const _resourceGeo = new THREE.IcosahedronGeometry(0.5, 0);
const _resourceMat = new THREE.MeshPhongMaterial({
  color: 0x44ff88,
  emissive: 0x115522,
});

let _nextResourceId = 0;

export class ResourceNode {
  constructor(position) {
    this.id = `r${_nextResourceId++}`;
    this.position = { ...position };
    this.energy = 30;
    this.depleted = false;
    this._respawnIn = 0;

    this.mesh = new THREE.Mesh(_resourceGeo, _resourceMat);
    this.mesh.position.set(position.x, position.y, position.z);
  }

  gather(efficiency) {
    if (this.depleted) return 0;
    const amount = Math.min(this.energy, 5 * efficiency);
    this.energy -= amount;
    if (this.energy <= 0) {
      this.energy = 0;
      this.depleted = true;
      this.mesh.visible = false;
    } else {
      const t = this.energy / 30;
      this.mesh.scale.setScalar(0.4 + t * 0.6);
    }
    return amount;
  }

  respawn(newPosition, delay) {
    this._respawnIn = delay;
    this._pendingPosition = { ...newPosition };
  }

  tick() {
    if (this.depleted && this._respawnIn > 0) {
      this._respawnIn--;
      if (this._respawnIn === 0) {
        this.position = { ...this._pendingPosition };
        this.energy = 30;
        this.depleted = false;
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.scale.setScalar(1);
        this.mesh.visible = true;
      }
    }
  }
}
