import * as THREE from "three";

const CLAY: Record<string, number> = {
  personA: 0xd7b089,
  personB: 0x9aa7b5,
  column: 0xc9c2b4,
  train: 0x6a717c,
  furniture: 0x6e4b32,
  platform: 0x3a3833,
  architecture: 0xb8b09f,
  lamp: 0xc9b37a,
  canopy: 0x4a463e,
  booth: 0x8a6a45,
  door: 0x4d6a7a,
  wall: 0xb7c0c8,
  prop: 0x8aa0b4,
  window: 0xc9e4f2,
  coat: 0xe8d3b0,
  pants: 0x3c3a38,
};

function clay(color: number, roughness = 0.62) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });
}

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(mat: THREE.Material, r: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function cyl(mat: THREE.Material, rt: number, rb: number, h: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function buildPerson(kind: "A" | "B"): THREE.Group {
  const root = new THREE.Group();
  const skin = clay(kind === "A" ? CLAY.personA : CLAY.personB, 0.48);
  const coat = clay(kind === "A" ? CLAY.coat : CLAY.personB, 0.58);
  const pants = clay(CLAY.pants, 0.62);
  const mat = coat;
  const body = new THREE.Group();
  body.name = "body";
  body.add(box(pants, 0.28, 0.16, 0.16, 0, 0.92, 0));
  body.add(box(coat, 0.34, 0.52, 0.2, 0, 1.18, 0.02));
  body.add(cyl(skin, 0.05, 0.06, 0.1, 0, 1.48, 0));
  body.add(sphere(skin, 0.11, 0, 1.64, 0.02));
  root.add(body);

  const addArm = (name: string, side: 1 | -1) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(0.2 * side, 1.38, 0);
    g.add(box(mat, 0.07, 0.28, 0.07, 0, -0.16, 0));
    const fore = new THREE.Group();
    fore.name = `${name}_fore`;
    fore.position.set(0, -0.32, 0);
    fore.add(box(mat, 0.06, 0.26, 0.06, 0, -0.12, 0));
    fore.add(box(mat, 0.07, 0.08, 0.09, 0, -0.28, 0.01));
    g.add(fore);
    root.add(g);
  };
  addArm("armR", 1);
  addArm("armL", -1);

  const addLeg = (name: string, side: 1 | -1) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(0.09 * side, 0.9, 0);
    g.add(box(pants, 0.1, 0.36, 0.12, 0, -0.16, 0));
    const shin = new THREE.Group();
    shin.name = `${name}_shin`;
    shin.position.set(0, -0.36, 0);
    shin.add(box(pants, 0.08, 0.34, 0.1, 0, -0.16, 0));
    shin.add(box(pants, 0.1, 0.07, 0.22, 0, -0.36, 0.04));
    g.add(shin);
    root.add(g);
  };
  addLeg("legR", 1);
  addLeg("legL", -1);
  return root;
}

export function posePerson(root: THREE.Group, pose?: string, time = 0) {
  const running = pose === "running_ready" || pose === "walking_ready";
  const swing = running ? Math.sin(time * 11) * 0.7 : 0;
  const bob = running ? Math.abs(Math.sin(time * 11)) * 0.04 : 0;
  const body = root.getObjectByName("body");
  if (body) body.position.y = bob;
  const armR = root.getObjectByName("armR");
  const armL = root.getObjectByName("armL");
  const legR = root.getObjectByName("legR");
  const legL = root.getObjectByName("legL");
  if (armR) {
    armR.position.y = 1.38 + bob;
    armR.rotation.z = 0.12;
    armR.rotation.x = swing;
  }
  if (armL) {
    armL.position.y = 1.38 + bob;
    armL.rotation.z = -0.12;
    armL.rotation.x = -swing;
  }
  const foreR = root.getObjectByName("armR_fore");
  const foreL = root.getObjectByName("armL_fore");
  if (foreR) foreR.rotation.x = running ? -0.7 : -0.15;
  if (foreL) foreL.rotation.x = running ? -0.7 : -0.15;
  if (legR) {
    legR.position.y = 0.9 + bob;
    legR.rotation.x = -swing * 0.85;
  }
  if (legL) {
    legL.position.y = 0.9 + bob;
    legL.rotation.x = swing * 0.85;
  }
  const shinR = root.getObjectByName("legR_shin");
  const shinL = root.getObjectByName("legL_shin");
  if (shinR) shinR.rotation.x = running ? 0.45 + Math.max(0, swing) * 0.4 : 0.05;
  if (shinL) shinL.rotation.x = running ? 0.45 + Math.max(0, -swing) * 0.4 : 0.05;
}

export function buildProp(type: string, size: [number, number, number], id: string): THREE.Object3D {
  const root = new THREE.Group();
  if (type === "train" || id.startsWith("train")) {
    const mat = clay(CLAY.train, 0.4);
    const dark = clay(0x2f3338, 0.5);
    const [sx, sy, sz] = size;
    root.add(box(mat, sx, sy * 0.72, sz, 0, sy * 0.46, 0));
    root.add(box(dark, sx * 0.92, sy * 0.18, sz * 0.98, 0, sy * 0.88, 0));
    for (const z of [-sz * 0.32, 0, sz * 0.32]) {
      root.add(box(dark, sx * 0.18, sy * 0.28, 0.9, sx * 0.38, sy * 0.5, z));
    }
    return root;
  }
  if (type === "column" || id.startsWith("column")) {
    const mat = clay(CLAY.column);
    root.add(cyl(mat, 0.22, 0.26, size[1] * 0.9, 0, size[1] * 0.5, 0));
    root.add(box(mat, 0.7, 0.12, 0.7, 0, size[1] * 0.06, 0));
    root.add(box(mat, 0.62, 0.1, 0.62, 0, size[1] - 0.08, 0));
    return root;
  }
  if (id.startsWith("lamp")) {
    const iron = clay(0x3d3a36);
    const glow = clay(CLAY.lamp, 0.3);
    root.add(cyl(iron, 0.05, 0.07, 3.1, 0, 1.55, 0));
    root.add(sphere(glow, 0.16, 0, 3.2, 0));
    return root;
  }
  if (id.startsWith("canopy")) {
    const mat = clay(CLAY.canopy, 0.7);
    root.add(box(mat, size[0], 0.12, size[2], 0, size[1], 0));
    for (const [x, z] of [
      [-size[0] * 0.4, -size[2] * 0.35],
      [size[0] * 0.4, -size[2] * 0.35],
      [-size[0] * 0.4, size[2] * 0.35],
      [size[0] * 0.4, size[2] * 0.35],
    ]) {
      root.add(cyl(mat, 0.08, 0.1, size[1], x, size[1] / 2, z));
    }
    return root;
  }
  if (id.startsWith("curtain")) {
    root.add(box(clay(0xc48a58, 0.78), size[0], size[1], size[2], 0, size[1] / 2, 0));
    return root;
  }
  if (type === "window" || id.startsWith("window")) {
    const glass = clay(0x9ec9e8, 0.18);
    glass.metalness = 0.15;
    root.add(box(clay(0xd8c4a2, 0.7), size[0] + 0.12, size[1] + 0.12, 0.05, 0, size[1] / 2, 0));
    root.add(box(glass, size[0] * 0.86, size[1] * 0.82, 0.03, 0, size[1] / 2, 0.02));
    return root;
  }
  if (id.startsWith("rug")) {
    root.add(box(clay(0x8b5a3c, 0.9), size[0], Math.max(size[1], 0.03), size[2], 0, 0.02, 0));
    return root;
  }
  if (id.startsWith("sofa")) {
    const fabric = clay(0xb08968, 0.8);
    root.add(box(fabric, size[0], size[1] * 0.45, size[2], 0, size[1] * 0.28, 0));
    root.add(box(fabric, size[0], size[1] * 0.55, 0.16, 0, size[1] * 0.62, -size[2] * 0.38));
    root.add(box(fabric, 0.14, size[1] * 0.5, size[2] * 0.9, -size[0] * 0.42, size[1] * 0.5, 0));
    root.add(box(fabric, 0.14, size[1] * 0.5, size[2] * 0.9, size[0] * 0.42, size[1] * 0.5, 0));
    return root;
  }
  if (id.startsWith("booth") || type === "architecture") {
    const mat = clay(CLAY.booth);
    const roof = clay(0x5c4030);
    root.add(box(mat, size[0], size[1] * 0.75, size[2], 0, size[1] * 0.4, 0));
    root.add(box(roof, size[0] * 1.15, 0.12, size[2] * 1.15, 0, size[1] * 0.86, 0));
    return root;
  }
  if (id.startsWith("crate") || id.startsWith("pallet")) {
    const mat = clay(0x8a6a45, 0.7);
    const dark = clay(0x5c4030, 0.75);
    root.add(box(mat, size[0], size[1] * 0.48, size[2], 0, size[1] * 0.24, 0));
    if (size[1] > 0.4) root.add(box(dark, size[0] * 0.92, size[1] * 0.42, size[2] * 0.9, 0.04, size[1] * 0.72, -0.04));
    return root;
  }
  if (type === "vehicle" || id.startsWith("truck")) {
    const mat = clay(0x6a717c, 0.45);
    const dark = clay(0x2f3338, 0.5);
    const [sx, sy, sz] = size;
    root.add(box(mat, sx, sy * 0.55, sz, 0, sy * 0.42, 0));
    root.add(box(dark, sx * 0.7, sy * 0.28, sz * 0.35, 0, sy * 0.82, -sz * 0.22));
    root.add(cyl(dark, 0.28, 0.28, 0.22, -sx * 0.32, 0.28, -sz * 0.28));
    root.add(cyl(dark, 0.28, 0.28, 0.22, sx * 0.32, 0.28, -sz * 0.28));
    root.add(cyl(dark, 0.28, 0.28, 0.22, -sx * 0.32, 0.28, sz * 0.28));
    root.add(cyl(dark, 0.28, 0.28, 0.22, sx * 0.32, 0.28, sz * 0.28));
    return root;
  }
  if (type === "furniture" || id.startsWith("bench")) {
    const mat = clay(CLAY.furniture);
    root.add(box(mat, size[0], 0.08, size[2], 0, 0.42, 0));
    root.add(box(mat, size[0], 0.28, 0.08, 0, 0.62, -size[2] * 0.35));
    root.add(box(mat, 0.08, 0.4, 0.08, -size[0] * 0.4, 0.2, size[2] * 0.3));
    root.add(box(mat, 0.08, 0.4, 0.08, size[0] * 0.4, 0.2, size[2] * 0.3));
    return root;
  }
  if (type === "platform" || id.startsWith("floor")) {
    const mesh = box(clay(id.startsWith("floor") ? 0x8d6b4a : CLAY.platform, 0.85), size[0], size[1], size[2], 0, size[1] / 2, 0);
    mesh.receiveShadow = true;
    root.add(mesh);
    return root;
  }
  root.add(box(clay(CLAY[type] ?? 0x8aa0b4), size[0], size[1], size[2], 0, size[1] / 2, 0));
  return root;
}

export function makeLabel(text: string, color = "#e2b34a") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(16,14,11,0.72)";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = color;
  ctx.font = "600 28px IBM Plex Sans, sans-serif";
  ctx.fillText(text, 16, 42);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.position.y = 2.15;
  return sprite;
}
