import * as THREE from "three";

export type ConnectorKind = "rj45" | "usb" | "power";

/** Frees every geometry, material, and texture below an object. */
export function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)&&!(child instanceof THREE.Sprite)) return;
    if(child instanceof THREE.Mesh)geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  const images=new Set<any>();
  textures.forEach(texture => {images.add(texture.image);texture.dispose();});
  images.forEach(image=>{if(typeof image?.close==="function")image.close();});
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

/**
 * Builds a plugged-in cable whose connector sits in a socket on a +Z-facing panel.
 * `socket` is the centre of the socket opening and `unit` the socket width, both in
 * the parent's local space, so the cable stays attached when the parent rotates.
 */
export function buildCable(socket: THREE.Vector3, unit: number, color: string, kind: ConnectorKind = "rj45", seed = 0, route: "down" | "up" = "down"): THREE.Group {
  const cable = new THREE.Group();
  const col = new THREE.Color(color);
  // Not tone-mapped, and pre-darkened for the scenes' strong lighting, so zone colours stay true.
  const body = new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(0.42), toneMapped: false });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7bdc5, roughness: 0.3, metalness: 0.85 });

  const w = unit * (kind === "usb" ? 0.8 : kind === "power" ? 0.6 : 0.92);
  const h = unit * (kind === "usb" ? 0.38 : kind === "power" ? 0.6 : 0.72);
  const d = unit * 1.1;
  // Sink the rear third into the socket so the plug reads as inserted, not floating.
  const plugZ = socket.z + d * 0.5 - d * 0.3;
  const plug = new THREE.Mesh(kind === "power" ? new THREE.CylinderGeometry(w / 2, w / 2, d, 20) : new THREE.BoxGeometry(w, h, d), body);
  if (kind === "power") plug.rotation.x = Math.PI / 2;
  plug.position.set(socket.x, socket.y, plugZ);
  cable.add(plug);

  if (kind === "rj45") {
    const latch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, h * 0.14, d * 0.55), body);
    latch.position.set(socket.x, socket.y + h * 0.55, plugZ + d * 0.15);
    cable.add(latch);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.15, metalness: 0.95 });
    for (let pin = 0; pin < 8; pin++) {
      const contact = new THREE.Mesh(new THREE.BoxGeometry(w * 0.06, h * 0.3, d * 0.08), gold);
      contact.position.set(socket.x + (pin - 3.5) * w * 0.11, socket.y - h * 0.18, plugZ + d * 0.46);
      cable.add(contact);
    }
  } else {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, h * 0.6, d * 0.4), metal);
    tip.position.set(socket.x, socket.y, socket.z - d * 0.1);
    cable.add(tip);
  }

  const bootZ = plugZ + d * 0.5;
  const radius = unit * 0.2;
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.6, radius * 1.15, d * 0.55, 14), body);
  boot.rotation.x = Math.PI / 2;
  boot.position.set(socket.x, socket.y, bootZ + d * 0.27);
  cable.add(boot);

  // Deterministic sideways sway per socket keeps neighbouring cables apart. Upper-row
  // sockets on stacked panels route upward so they never hide the row beneath.
  const sway = (((seed % 7) + 7) % 7 - 3) * unit * 0.12;
  const start = bootZ + d * 0.55;
  const points = route === "up"
    ? [ // Arc up and drape back over the chassis lid.
        new THREE.Vector3(socket.x, socket.y, start),
        new THREE.Vector3(socket.x + sway * 0.2, socket.y + unit * 0.6, start + unit * 0.6),
        new THREE.Vector3(socket.x + sway * 0.5, socket.y + unit * 1.9, start + unit * 0.2),
        new THREE.Vector3(socket.x + sway * 0.8, socket.y + unit * 2.3, socket.z - unit * 1.5),
        new THREE.Vector3(socket.x + sway, socket.y + unit * 2.2, socket.z - unit * 5),
      ]
    : [
        new THREE.Vector3(socket.x, socket.y, start),
        new THREE.Vector3(socket.x + sway * 0.2, socket.y - unit * 0.4, start + unit * 0.9),
        new THREE.Vector3(socket.x + sway * 0.6, socket.y - unit * 1.6, start + unit * 1.6),
        new THREE.Vector3(socket.x + sway, socket.y - unit * 3.2, start + unit * 1.9),
        new THREE.Vector3(socket.x + sway, socket.y - unit * 5, start + unit * 2),
      ];
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 10, false), body);
  cable.add(tube);
  return cable;
}

/**
 * Fits the firewall.glb scene: scaled to 8 units wide and centred on the origin.
 * Size is measured before any rotation so socket anchors match the unrotated model.
 */
export function fitFortiGateModel(model: THREE.Object3D): THREE.Vector3 {
  const raw = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(8 / Math.max(raw.x, raw.y, raw.z));
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  model.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      material.side = THREE.FrontSide;
      material.needsUpdate = true;
    }
  });
  return box.getSize(new THREE.Vector3());
}

/** Centre of a FortiGate socket opening in the fitted model's local space. */
export function fortiGateSocket(xFraction: number, yFraction: number, size: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(xFraction * size.x, yFraction * size.y, size.z / 2);
}

export interface MeasuredSocket { center: THREE.Vector3; width: number; height: number; facing: 1 | -1; }

/**
 * Locates named socket meshes in a fitted model. Each socket faces +Z (front panel)
 * or -Z (rear panel); `center` is the middle of its opening in `parent`'s space.
 * Call it before `parent` is rotated: corners are mapped individually.
 */
export function measureSockets(model: THREE.Object3D, parent: THREE.Object3D, nodes: { id: string; node: string }[]): Record<string, MeasuredSocket> {
  parent.updateMatrixWorld(true);
  const sockets: Record<string, MeasuredSocket> = {};
  for (const { id, node } of nodes) {
    const object = model.getObjectByName(node);
    if (!object) continue;
    const box = new THREE.Box3().setFromObject(object);
    box.min.applyMatrix4(new THREE.Matrix4().copy(parent.matrixWorld).invert());
    box.max.applyMatrix4(new THREE.Matrix4().copy(parent.matrixWorld).invert());
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const facing = mid.z >= 0 ? 1 : -1;
    sockets[id] = { center: new THREE.Vector3(mid.x, mid.y, facing === 1 ? box.max.z : box.min.z), width: size.x, height: size.y, facing };
  }
  return sockets;
}

/** buildCable for a measured socket, turning the cable around for rear-facing sockets. */
export function buildSocketCable(socket: MeasuredSocket, color: string, kind: ConnectorKind, seed: number, route: "down" | "up" = "down"): THREE.Group {
  if (socket.facing === 1) return buildCable(socket.center, socket.width, color, kind, seed, route);
  // Build as if on a front panel at the mirrored point, then spin 180° about Y.
  const cable = buildCable(new THREE.Vector3(-socket.center.x, socket.center.y, -socket.center.z), socket.width, color, kind, seed, route);
  cable.rotation.y = Math.PI;
  return cable;
}

/** Small rounded text label that always faces the camera and draws over the model. */
export function labelSprite(text: string, scale: number, background = "rgba(15,23,42,0.85)"): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.beginPath(); ctx.roundRect(4, 8, 120, 48, 10); ctx.fill();
  ctx.font = `600 ${text.length > 3 ? 26 : 30}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#f8fafc"; ctx.fillText(text, 64, 33);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(scale, scale / 2, 1);
  sprite.renderOrder = 2;
  return sprite;
}
