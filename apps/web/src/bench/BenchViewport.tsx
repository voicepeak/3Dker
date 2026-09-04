import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { quatToTuple, sampleDocument } from "@semantic-director/dsl-runtime";
import { buildPerson, buildProp, makeLabel, posePerson } from "./whiteModels";
import { useBenchStore, solvedNow } from "./store";

export function BenchViewport({ mode }: { mode: "god" | "lens" }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(mode === "lens" ? 35 : 46, 1, 0.05, 200);
    if (mode === "god") camera.position.set(6, 5.5, 2.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xe7dcc0, 0x2a241c, 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffe3b0, 0.85);
    dir.position.set(8, 14, 6);
    dir.castShadow = true;
    scene.add(dir);
    const windowLight = new THREE.DirectionalLight(0xf2c48a, 0);
    windowLight.position.set(0.2, 1.6, 8);
    scene.add(windowLight);
    const coolFill = new THREE.PointLight(0x7ea0c4, 0);
    coolFill.position.set(-1.4, 1.8, 1.2);
    scene.add(coolFill);
    const lamp = new THREE.PointLight(0xe2b34a, 1.4, 18);
    lamp.position.set(4.2, 3.1, 0);
    scene.add(lamp);
    const grid = new THREE.GridHelper(48, 48, 0x3a3429, 0x221e18);
    scene.add(grid);

    const entityGroup = new THREE.Group();
    const overlay = new THREE.Group();
    scene.add(entityGroup, overlay);
    const meshes = new Map<string, THREE.Object3D>();
    const filmCamera = new THREE.PerspectiveCamera(35, 16 / 9, 0.05, 80);
    const helper = new THREE.CameraHelper(filmCamera);
    if (mode === "god") overlay.add(filmCamera, helper);
    const pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xc8922a }));
    overlay.add(pathLine);
    const lookLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xd7cfb8 }),
    );
    overlay.add(lookLine);

    const orbit = mode === "god" ? new OrbitControls(camera, renderer.domElement) : null;
    if (orbit) {
      orbit.enableDamping = true;
      orbit.target.set(0.2, 1.1, 2.4);
    }

    let lastId = "";
    const applyMood = (benchId: string) => {
      const dusk = benchId === "dusk";
      scene.background = new THREE.Color(dusk ? (mode === "lens" ? 0x2a221c : 0x1c1814) : mode === "lens" ? 0x16130e : 0x0b0a08);
      scene.fog = new THREE.Fog(dusk ? 0x2a221c : mode === "lens" ? 0x16130e : 0x0b0a08, dusk ? 7 : 18, dusk ? 16 : 48);
      hemi.intensity = dusk ? 0.35 : 0.9;
      dir.intensity = dusk ? 0.15 : 0.85;
      windowLight.intensity = dusk ? 1.8 : 0;
      coolFill.intensity = dusk ? 0.45 : 0;
      lamp.intensity = dusk ? 0.2 : 1.4;
      grid.visible = !dusk;
      if (orbit) {
        orbit.target.set(dusk ? 0.3 : 0.4, dusk ? 1.15 : 1.2, dusk ? 2.6 : 4);
        if (dusk) camera.position.set(5.2, 4.4, 1.6);
      }
    };
    const syncMeshes = (benchId: string, entities: ReturnType<typeof solvedNow>["entities"]) => {
      if (benchId === lastId && meshes.size) return;
      lastId = benchId;
      applyMood(benchId);
      const samples = sampleDocument(solvedNow().bench.document, 24);
      pathLine.geometry.dispose();
      pathLine.geometry = new THREE.BufferGeometry().setFromPoints(
        samples.map((item) => new THREE.Vector3(...item.camera.position)),
      );
      entityGroup.clear();
      meshes.clear();
      for (const entity of Object.values(entities)) {
        const root =
          entity.type === "person"
            ? buildPerson(entity.id === "person_b" ? "B" : "A")
            : buildProp(entity.type, entity.size, entity.id);
        if (entity.semantic) root.add(makeLabel(entity.semantic));
        entityGroup.add(root);
        meshes.set(entity.id, root);
      }
    };

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
      raf = requestAnimationFrame(loop);
      const solved = solvedNow();
      syncMeshes(solved.bench.id, solved.entities);
      for (const entity of Object.values(solved.entities)) {
        const root = meshes.get(entity.id);
        if (!root) continue;
        root.position.set(entity.position[0], 0, entity.position[2]);
        root.rotation.y = entity.yaw;
        if (entity.type === "person") posePerson(root as THREE.Group, "standing", 0);
      }
      const cam = solved.camera;
      filmCamera.position.set(...cam.position);
      filmCamera.quaternion.set(...quatToTuple(cam.rotation));
      filmCamera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(24 / (2 * cam.focalLength)));
      filmCamera.updateProjectionMatrix();
      if (mode === "lens") {
        camera.position.copy(filmCamera.position);
        camera.quaternion.copy(filmCamera.quaternion);
        camera.fov = filmCamera.fov;
        camera.updateProjectionMatrix();
      } else {
        helper.update();
      }
      const lookOp = [...solved.activeCamera].reverse().find((op) => op.type === "look_at") ??
        solved.bench.document.cameraShot.operators.filter((op) => op.type === "look_at").at(-1);
      const lookId = lookOp?.target?.entityId ?? "person_a";
      const look =
        solved.entities[lookId]?.worldAnchors[lookOp?.target?.anchor ?? "chest"] ??
        solved.entities[lookId]?.position;
      if (look) {
        lookLine.geometry.setFromPoints([new THREE.Vector3(...cam.position), new THREE.Vector3(...look)]);
      }
      orbit?.update();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbit?.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [mode]);

  return <div className={mode === "lens" ? "ground-glass" : "viewport"} ref={hostRef} />;
}
