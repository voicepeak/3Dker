import { useEffect, useRef } from "react";
import * as THREE from "three";
import { evaluateEntity } from "@semantic-director/scene-core";
import { ENTITY_COLORS } from "@semantic-director/renderer-three";
import { sampleAt, verticalFovRad } from "@semantic-director/camera-solver";
import { peekPlaybackTime, useProjectStore } from "../store/projectStore";

function entityGeometry(type: string, size: [number, number, number]) {
  if (type === "person") {
    return new THREE.CapsuleGeometry(Math.max(size[0], size[2]) * 0.35, Math.max(0.2, size[1] - 0.5), 6, 12);
  }
  return new THREE.BoxGeometry(size[0], size[1], size[2]);
}

export function CameraPreview() {
  const open = useProjectStore((s) => s.previewOpen);
  const togglePreview = useProjectStore((s) => s.togglePreview);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101318);
    const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 80);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(1);
    host.appendChild(renderer.domElement);
    const onContextLost = (event: Event) => event.preventDefault();
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    scene.add(new THREE.HemisphereLight(0xc9d6e3, 0x2a241c, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 0.65);
    dir.position.set(4, 8, 3);
    scene.add(dir);
    scene.add(new THREE.GridHelper(16, 16, 0x2a3138, 0x1b2127));

    const entityGroup = new THREE.Group();
    scene.add(entityGroup);
    const meshes = new Map<string, THREE.Object3D>();
    let lastRev = "";

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
      const rev = state.scene.entities.map((e) => `${e.id}:${e.semanticType}:${e.bounds.size.join(",")}`).join("|");
      if (rev !== lastRev) {
        lastRev = rev;
        entityGroup.clear();
        meshes.clear();
        for (const entity of state.scene.entities) {
          const mesh = new THREE.Mesh(
            entityGeometry(entity.semanticType, entity.bounds.size),
            new THREE.MeshStandardMaterial({ color: ENTITY_COLORS[entity.semanticType], roughness: 0.7 }),
          );
          mesh.position.y = entity.bounds.size[1] / 2;
          const root = new THREE.Group();
          root.add(mesh);
          entityGroup.add(root);
          meshes.set(entity.id, root);
        }
      }
      for (const entity of state.scene.entities) {
        const root = meshes.get(entity.id);
        if (!root) continue;
        const evaluated = evaluateEntity(entity, time);
        root.position.set(evaluated.position[0], 0, evaluated.position[2]);
        root.rotation.set(0, evaluated.yaw, 0);
        root.scale.set(...evaluated.scale);
      }
      if (state.solve) {
        const sample = sampleAt(state.solve, time);
        camera.position.set(...sample.position);
        camera.quaternion.set(...sample.quaternion);
        camera.fov = THREE.MathUtils.radToDeg(verticalFovRad(sample.focalLength));
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="camera-preview">
      <div className="camera-preview-bar">
        <span>摄像机预览</span>
        <button onClick={() => togglePreview(false)}>关闭</button>
      </div>
      <div className="camera-preview-view" ref={hostRef} />
    </div>
  );
}
