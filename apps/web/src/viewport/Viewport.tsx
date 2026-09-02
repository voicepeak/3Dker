import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { evaluateEntity, evaluateScene } from "@semantic-director/scene-core";
import { ENTITY_COLORS } from "@semantic-director/renderer-three";
import { sampleAt, verticalFovRad } from "@semantic-director/camera-solver";
import { ANCHOR_LABEL } from "../i18n";
import { peekPlaybackTime, useProjectStore } from "../store/projectStore";

function entityGeometry(type: string, size: [number, number, number]) {
  if (type === "person") {
    return new THREE.CapsuleGeometry(Math.max(size[0], size[2]) * 0.35, Math.max(0.2, size[1] - 0.5), 6, 12);
  }
  return new THREE.BoxGeometry(size[0], size[1], size[2]);
}

function meshOffsetY(type: string, size: [number, number, number]) {
  return type === "person" ? size[1] / 2 : size[1] / 2;
}

export function Viewport() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0f12);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    camera.position.set(6, 4, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xc9d6e3, 0x2a241c, 1.1);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(4, 8, 3);
    scene.add(dir);
    const grid = new THREE.GridHelper(20, 20, 0x2a3138, 0x1b2127);
    scene.add(grid);

    const entityGroup = new THREE.Group();
    const overlay = new THREE.Group();
    scene.add(entityGroup, overlay);

    const filmCamera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 12);
    const helper = new THREE.CameraHelper(filmCamera);
    overlay.add(filmCamera, helper);

    const pathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x4cc9f0 }),
    );
    overlay.add(pathLine);

    const lookLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xffffff }),
    );
    overlay.add(lookLine);

    const collisionDots = new THREE.Group();
    overlay.add(collisionDots);
    const actorPath = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xffcc66, dashSize: 0.12, gapSize: 0.08 }),
    );
    overlay.add(actorPath);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode("translate");
    transform.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });
    transform.addEventListener("objectChange", () => {
      if (!transform.dragging) return;
      const obj = transform.object;
      if (!obj || !obj.userData.entityId) return;
      const id = obj.userData.entityId as string;
      const mode = transform.mode;
      if (mode === "rotate") {
        useProjectStore.getState().setTransform(id, "rotation", [0, obj.rotation.y, 0]);
        return;
      }
      if (mode === "scale") {
        useProjectStore.getState().setTransform(id, "scale", [obj.scale.x, obj.scale.y, obj.scale.z]);
        return;
      }
      useProjectStore.getState().setTransform(id, "position", [obj.position.x, 0, obj.position.z]);
      obj.position.y = 0;
    });
    scene.add(transform.getHelper());

    const meshes = new Map<string, THREE.Object3D>();
    const labelCache = new Map<string, THREE.Sprite>();
    let lastSceneRev = "";
    let lastPathKey = "";
    let lastAnchorKey = "";

    const syncEntities = () => {
      const state = useProjectStore.getState();
      const rev = state.scene.entities.map((e) => `${e.id}:${e.semanticType}:${e.bounds.size.join(",")}`).join("|");
      const applyPose = (root: THREE.Object3D, entity: (typeof state.scene.entities)[number]) => {
        const evaluated = evaluateEntity(entity, peekPlaybackTime());
        if (transform.dragging && transform.object === root) return;
        root.position.set(evaluated.position[0], 0, evaluated.position[2]);
        root.rotation.set(0, evaluated.yaw, 0);
        root.scale.set(evaluated.scale[0], evaluated.scale[1], evaluated.scale[2]);
      };
      if (rev === lastSceneRev) {
        for (const entity of state.scene.entities) {
          const mesh = meshes.get(entity.id);
          if (mesh) applyPose(mesh, entity);
        }
        return;
      }
      lastSceneRev = rev;
      entityGroup.clear();
      meshes.clear();
      transform.detach();
      for (const entity of state.scene.entities) {
        const geo = entityGeometry(entity.semanticType, entity.bounds.size);
        const mat = new THREE.MeshStandardMaterial({
          color: ENTITY_COLORS[entity.semanticType],
          roughness: 0.7,
          metalness: 0.05,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.entityId = entity.id;
        mesh.position.y = meshOffsetY(entity.semanticType, entity.bounds.size);
        const root = new THREE.Group();
        root.userData.entityId = entity.id;
        root.add(mesh);
        applyPose(root, entity);
        entityGroup.add(root);
        meshes.set(entity.id, root);
      }
    };

    const anchorGroup = new THREE.Group();
    overlay.add(anchorGroup);
    const syncAnchors = () => {
      const state = useProjectStore.getState();
      const selected = state.scene.entities.find((e) => e.id === state.selectedId);
      const key = selected ? `${selected.id}:${Object.keys(selected.anchors).join(",")}` : "";
      if (key !== lastAnchorKey) {
        lastAnchorKey = key;
        anchorGroup.clear();
        if (!selected) return;
        for (const name of Object.keys(selected.anchors)) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xffcc66 }),
          );
          dot.userData.anchor = name;
          anchorGroup.add(dot);
          if (["chest", "eyes", "head", "top", "center", "feet"].includes(name)) {
            const label = ANCHOR_LABEL[name] ?? name;
            let sprite = labelCache.get(label);
            if (!sprite) {
              sprite = makeLabel(label);
              labelCache.set(label, sprite);
            }
            const clone = sprite.clone();
            clone.userData.anchor = name;
            clone.userData.label = true;
            anchorGroup.add(clone);
          }
        }
      }
      if (!selected) return;
      const evaluated = evaluateEntity(selected, peekPlaybackTime());
      for (const child of anchorGroup.children) {
        const name = child.userData.anchor as string;
        const pos = evaluated.anchorsWorld[name];
        if (!pos) continue;
        child.position.set(pos[0], pos[1] + (child.userData.label ? 0.08 : 0), pos[2]);
      }
    };

    const syncPath = () => {
      const state = useProjectStore.getState();
      const actorKey = state.scene.entities
        .map((e) => e.motionPath?.waypoints.map((p) => p.join(",")).join(">") ?? "")
        .join("|");
      const pathKey = `${state.solve?.samples.length ?? 0}:${state.solve?.warnings.length ?? 0}:${actorKey}`;
      if (pathKey === lastPathKey) return;
      lastPathKey = pathKey;
      collisionDots.clear();
      if (!state.solve) {
        pathLine.geometry.setFromPoints([]);
        actorPath.visible = false;
        return;
      }
      const pts = state.solve.samples.map((s) => new THREE.Vector3(...s.position));
      pathLine.geometry.dispose();
      pathLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      for (const sample of state.solve.samples) {
        if (!sample.collision && sample.visible) continue;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 8),
          new THREE.MeshBasicMaterial({ color: sample.collision ? 0xff4d6d : 0xffb703 }),
        );
        dot.position.set(...sample.position);
        collisionDots.add(dot);
      }
      const moving = state.scene.entities.filter((e) => e.motionPath && e.motionPath.waypoints.length > 1);
      if (moving.length) {
        const pathPts = moving.flatMap((entity) =>
          entity.motionPath!.waypoints.map((p) => new THREE.Vector3(p[0], 0.05, p[2])),
        );
        actorPath.geometry.dispose();
        actorPath.geometry = new THREE.BufferGeometry().setFromPoints(pathPts);
        actorPath.computeLineDistances();
        actorPath.visible = true;
      } else {
        actorPath.visible = false;
      }
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      if (transform.dragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(entityGroup.children, true);
      const hit = hits[0];
      if (!hit) {
        useProjectStore.getState().select(undefined);
        transform.detach();
        return;
      }
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData.entityId) obj = obj.parent;
      if (!obj) return;
      useProjectStore.getState().select(obj.userData.entityId);
      transform.attach(obj);
    };
    renderer.domElement.addEventListener("pointerdown", onClick);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "g") transform.setMode("translate");
      if (event.key === "r") transform.setMode("rotate");
      if (event.key === "s") transform.setMode("scale");
      if (event.key === "Backspace" || event.key === "Delete") {
        useProjectStore.getState().removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf = 0;
    const loop = () => {
      const state = useProjectStore.getState();
      const time = peekPlaybackTime();
      syncEntities();
      syncAnchors();
      syncPath();
      const selected = meshes.get(state.selectedId ?? "");
      if (state.playback.playing) {
        if (transform.object) transform.detach();
      } else if (selected && transform.object !== selected && !transform.dragging) {
        transform.attach(selected);
      } else if (!selected) {
        transform.detach();
      }

      if (state.solve) {
        const sample = sampleAt(state.solve, time);
        filmCamera.position.set(...sample.position);
        filmCamera.quaternion.set(...sample.quaternion);
        filmCamera.fov = THREE.MathUtils.radToDeg(verticalFovRad(sample.focalLength));
        filmCamera.updateProjectionMatrix();
        helper.update();
        const intent = state.cameraIntents[0];
        const target = state.scene.entities.find((e) => e.id === intent.target.entityId);
        if (target) {
          const look = evaluateEntity(target, time).anchorsWorld[intent.target.anchor];
          if (look) {
            lookLine.geometry.setFromPoints([
              new THREE.Vector3(...sample.position),
              new THREE.Vector3(...look),
            ]);
          }
        }
        for (const entity of evaluateScene(state.scene, time)) {
          const mesh = meshes.get(entity.entity.id);
          if (!mesh) continue;
          mesh.position.set(entity.position[0], 0, entity.position[2]);
          mesh.rotation.y = entity.yaw;
        }
      }
      orbit.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      renderer.domElement.removeEventListener("pointerdown", onClick);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="viewport" ref={hostRef}>
      <div className="hint">拖动物体 · G移动 / R旋转 / S缩放 · Delete删除 · 摄像机轨迹由意图求解，不可手K</div>
    </div>
  );
}

function makeLabel(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = "#ffcc66";
  ctx.font = "16px sans-serif";
  ctx.fillText(text, 8, 22);
  const map = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.5, 0.12, 1);
  return sprite;
}
