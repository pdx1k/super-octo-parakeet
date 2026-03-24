import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Arena {
  constructor(canvas, size) {
    this.size = size;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, size * 1.8, size * 3.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, size * 6);
    this.camera.position.set(0, size * 0.9, size * 1.3);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = size * 2.5;
    this.controls.minDistance = 5;

    this._setupLights();
    this._buildArena();
    this._setupResize();
  }

  _setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x334466, 0x221100, 0.8));

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 500;
    sun.shadow.camera.left = -this.size * 1.2;
    sun.shadow.camera.right = this.size * 1.2;
    sun.shadow.camera.top = this.size * 1.2;
    sun.shadow.camera.bottom = -this.size * 1.2;
    this.scene.add(sun);
  }

  _buildArena() {
    // Solid planet sphere — creatures walk on its surface
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(this.size, 64, 32),
      new THREE.MeshPhongMaterial({
        color: 0x1a3a1a,
        shininess: 8,
        specular: 0x224422,
      })
    );
    planet.receiveShadow = true;
    this.scene.add(planet);

    // Faint wireframe overlay for depth cues
    const overlay = new THREE.Mesh(
      new THREE.SphereGeometry(this.size * 1.001, 32, 16),
      new THREE.MeshBasicMaterial({
        color: 0x336633,
        wireframe: true,
        opacity: 0.08,
        transparent: true,
      })
    );
    this.scene.add(overlay);
  }

  _setupResize() {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(parent);
    this._onResize();
  }

  _onResize() {
    const el = this.renderer.domElement.parentElement;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
