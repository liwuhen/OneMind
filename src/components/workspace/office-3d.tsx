import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ContactShadows,
  RoundedBox,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const SCREEN_ACCENTS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];
const SKIN_TONES = ["#f1c6a8", "#d9a47f", "#b9825f", "#8f5f45", "#6f4635"];
const SHIRT_COLORS = ["#2563eb", "#475569", "#0f766e", "#7c3aed", "#b45309"];
const PANTS_COLORS = ["#1f2937", "#273449", "#334155", "#2b3038", "#20242c"];
const LOCKED_CAMERA_POSITION: [number, number, number] = [0.138, 10.484, -20.106];
const LOCKED_CAMERA_TARGET: [number, number, number] = [0, 0.62, -3.2];
const LOCKED_CAMERA_ZOOM = 100.52;
const SCENE_FLOOR_COLOR = "#eef2ff";
const WORKSTATION_GROUP_OFFSET_X = 3.65;
const WORKSTATION_GROUP_OFFSET_Z = 1.0;
const WORKSTATION_SCALE = 1.18;
const PLANTER_SIDE_OFFSET_X = 1.18;
const RIGHT_STORAGE_ROW_X = -4.2;
const RIGHT_STORAGE_ROW_Z = 4.1;
// 后墙固定位置（与柜子解耦，柜子移动时墙不动）。
const WALL_X = -4.2;
const WALL_Z = 5.2;
const WALL_LOGO_TEXT = "OneMind";

function StaticCameraTarget({
  position,
  target,
  baseZoom,
}: {
  position: [number, number, number];
  target: [number, number, number];
  baseZoom: number;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    if (camera instanceof THREE.OrthographicCamera) {
      const scale = Math.min(size.width / 1180, size.height / 860);
      const zoom = THREE.MathUtils.clamp(
        baseZoom * scale,
        baseZoom * 0.45,
        baseZoom * 1.28,
      );
      camera.zoom = zoom;
    }
    camera.updateProjectionMatrix();
  }, [baseZoom, camera, position, size.height, size.width, target]);

  return null;
}

// 坐姿打字程序员（Mixamo「Typing」动作，FBX 转 GLB，自带正确坐姿+打字动画）。
useGLTF.preload("/models/typing.glb");

/**
 * 坐姿程序员：直接播放 Mixamo Typing 动画（坐着对电脑打字），姿势天然正确。
 * 每个实例克隆骨骼，独立播放循环动画。
 */
function SeatedProgrammer({ seed }: { seed: number }) {
  const { scene, animations } = useGLTF("/models/typing.glb");
  const cloned = useMemo(() => {
    const skin = new THREE.Color(SKIN_TONES[seed % SKIN_TONES.length]);
    const joint = skin.clone().multiplyScalar(0.78);
    const shirt = new THREE.Color(SHIRT_COLORS[seed % SHIRT_COLORS.length]);
    const pants = new THREE.Color(PANTS_COLORS[seed % PANTS_COLORS.length]);
    const shoe = new THREE.Color("#171a20");
    const copy = skeletonClone(scene);
    copy.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geometry = obj.geometry.clone();
      const position = geometry.getAttribute("position");
      const colors = new Float32Array(position.count * 3);

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const absX = Math.abs(x);
        const color =
          y < 0.24
            ? shoe
            : y < 0.72
              ? pants
              : y < 1.28 && absX < 0.48
                ? shirt
                : obj.name.toLowerCase().includes("joint")
                  ? joint
                  : skin;

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      obj.geometry = geometry;
      obj.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.02,
        roughness: 0.72,
      });
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    return copy;
  }, [scene, seed]);
  const { actions, names } = useAnimations(animations, cloned);

  useEffect(() => {
    const a = names.length ? actions[names[0]] : null;
    a?.reset().play();
    return () => void a?.stop();
  }, [actions, names]);

  // 自动缩放到统一高度并落地。
  const { scale, yOff } = useMemo(() => {
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned, true);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y > 0.001 ? size.y : 1;
    const s = 1.5 / h;
    return { scale: s, yOff: -box.min.y * s };
  }, [cloned]);

  // 面向显示器（+z）。
  return (
    <group>
      <primitive
        object={cloned}
        scale={scale}
        position={[0, yOff, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

// 真实办公椅模型（Kenney Furniture Kit，CC0）。
useGLTF.preload("/models/office-chair.glb");

/** 真实办公椅：加载 glb，自动缩放到统一高度并落地。 */
function Chair() {
  const { scene } = useGLTF("/models/office-chair.glb");
  const cloned = useMemo(() => {
    const silverMetal = new THREE.MeshStandardMaterial({
      color: "#c9ced6",
      metalness: 0.78,
      roughness: 0.28,
    });
    const darkLeather = new THREE.MeshStandardMaterial({
      color: "#25272d",
      metalness: 0.02,
      roughness: 0.62,
    });
    const copy = scene.clone(true);
    copy.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      if (materials.some((mat) => mat?.name?.toLowerCase().includes("carpet"))) {
        obj.visible = false;
        return;
      }
      const styled = materials.map((mat) => {
        const name = mat?.name?.toLowerCase() ?? "";
        return name.includes("carpet") ? darkLeather : silverMetal;
      });
      obj.material = Array.isArray(obj.material) ? styled : styled[0];
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    return copy;
  }, [scene]);
  const { scale, y, cx } = useMemo(() => {
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const h = size.y > 0.001 ? size.y : 1;
    const s = 1.1 / h;
    // 因 180° 旋转，x 居中偏移取 +center.x。
    return { scale: s, y: -box.min.y * s, cx: center.x * s };
  }, [cloned]);
  // 椅子正对桌子（+z）：靠背在 -z 侧、座位朝向桌子，x 居中对齐。
  return (
    <group scale={scale} position={[cx, y, 0]} rotation={[0, Math.PI, 0]}>
      <primitive object={cloned} />
      <RoundedBox castShadow receiveShadow args={[2.72, 0.44, 3.02]} radius={0.28} smoothness={8} position={[-1.675, 2.23, 1.57]}>
        <meshStandardMaterial color="#25272d" metalness={0.02} roughness={0.62} />
      </RoundedBox>
      {[-3.02, -0.33].map((x) => (
        <RoundedBox key={x} castShadow receiveShadow args={[0.22, 0.72, 2.28]} radius={0.16} smoothness={8} position={[x, 2.48, 1.62]}>
          <meshStandardMaterial color="#25272d" metalness={0.02} roughness={0.62} />
        </RoundedBox>
      ))}
      <RoundedBox castShadow receiveShadow args={[2.35, 3.45, 0.46]} radius={0.42} smoothness={12} position={[-1.675, 4.05, 2.84]}>
        <meshStandardMaterial color="#25272d" metalness={0.02} roughness={0.62} />
      </RoundedBox>
    </group>
  );
}

type ScreenMode = "code" | "lock" | "windows" | "cf";

/** 显示器屏幕：code=运行滚动代码，lock=锁屏，windows=Windows 桌面，cf=CF 游戏画面。 */
function MonitorScreen({
  accent,
  seed,
  mode = "code",
}: {
  accent: string;
  seed: number;
  mode?: ScreenMode;
}) {
  const { canvas, texture, rows } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 150;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const rnd = (i: number) => {
      const x = Math.sin((i + seed) * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const rows = Array.from({ length: 60 }, (_, i) => ({
      w: 0.25 + rnd(i) * 0.6,
      indent: Math.floor(rnd(i * 2) * 4) * 9,
      hot: rnd(i * 3) > 0.82,
    }));
    return { canvas: c, texture: tex, rows };
  }, [seed]);

  const lastDrawRef = useRef(-1);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // 屏幕贴图限速重绘：动态画面（code/cf）~10fps，静态锁屏/桌面 ~2fps。
    // 否则每帧都会重画 2D 画布并重传纹理，是主线程高 CPU + GC 抖动的主因。
    const minInterval = mode === "lock" || mode === "windows" ? 0.5 : 0.12;
    if (t - lastDrawRef.current < minInterval) return;
    lastDrawRef.current = t;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    // 锁屏样式（无人/未起任务）。
    if (mode === "lock") {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1b2233");
      g.addColorStop(1, "#2b2442");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 锁图标
      const lx = W / 2;
      const ly = 46;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lx, ly, 9, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.fillRect(lx - 13, ly, 26, 19);
      ctx.fillStyle = "#2b2442";
      ctx.fillRect(lx - 2, ly + 6, 4, 7);
      // 时间
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.font = "bold 36px sans-serif";
      ctx.fillText(`${hh}:${mm}`, W / 2, 108);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "13px sans-serif";
      ctx.fillText("已锁定", W / 2, 130);
      ctx.textAlign = "left";
      texture.needsUpdate = true;
      return;
    }

    // Windows 桌面样式。
    if (mode === "windows") {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1e6fd0");
      g.addColorStop(1, "#0a4ea3");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // 桌面图标（左上）
      for (let i = 0; i < 3; i++) {
        const iy = 14 + i * 34;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(12, iy, 18, 16);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fillRect(10, iy + 19, 24, 3);
      }
      // 任务栏
      const barH = 22;
      ctx.fillStyle = "rgba(18,22,30,0.92)";
      ctx.fillRect(0, H - barH, W, barH);
      // 开始按钮（四格 Windows 徽标）
      const sx = 12;
      const sy = H - barH + 6;
      const sq = [
        ["#f25022", 0, 0],
        ["#7fba00", 5, 0],
        ["#00a4ef", 0, 5],
        ["#ffb900", 5, 5],
      ] as const;
      sq.forEach(([c, dx, dy]) => {
        ctx.fillStyle = c;
        ctx.fillRect(sx + dx, sy + dy, 4, 4);
      });
      // 任务栏图标
      ["#4cc2ff", "#ffd34e", "#9aa3b2"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(40 + i * 22, H - barH + 6, 14, 11);
      });
      // 时间（任务栏右侧）
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${hh}:${mm}`, W - 8, H - 8);
      ctx.textAlign = "left";
      texture.needsUpdate = true;
      return;
    }

    // CF 风格第一人称游戏画面。
    if (mode === "cf") {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
      sky.addColorStop(0, "#3b7fc8");
      sky.addColorStop(1, "#9fb6c9");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#6d737c";
      ctx.fillRect(0, H * 0.52, W, H * 0.48);
      ctx.fillStyle = "#4b535d";
      ctx.fillRect(0, H * 0.64, W, H * 0.36);

      // 工业巷道/掩体
      ctx.fillStyle = "#7b817f";
      ctx.fillRect(18, 48, 58, 46);
      ctx.fillStyle = "#596169";
      ctx.fillRect(32, 33, 36, 20);
      ctx.fillStyle = "#8b7461";
      ctx.fillRect(155, 55, 78, 42);
      ctx.fillStyle = "#5e4f43";
      ctx.fillRect(166, 44, 46, 14);
      ctx.fillStyle = "#293241";
      ctx.fillRect(82, 36, 40, 60);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(91, 49, 23, 42);

      // 准星
      const cx = W / 2 + Math.sin(t * 2) * 1.4;
      const cy = H / 2 + Math.cos(t * 1.7) * 1.1;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy);
      ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy);
      ctx.lineTo(cx + 15, cy);
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx, cy - 5);
      ctx.moveTo(cx, cy + 5);
      ctx.lineTo(cx, cy + 15);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,50,50,0.86)";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.stroke();

      // 武器剪影
      ctx.fillStyle = "#141821";
      ctx.fillRect(148, 112, 82, 14);
      ctx.fillRect(196, 100, 26, 18);
      ctx.fillRect(176, 125, 20, 20);
      ctx.fillStyle = "#2b3340";
      ctx.fillRect(130, 119, 50, 8);
      ctx.fillRect(218, 109, 24, 5);

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.48)";
      ctx.fillRect(6, 6, 52, 18);
      ctx.fillRect(6, 126, 70, 18);
      ctx.fillRect(178, 126, 72, 18);
      ctx.fillStyle = "#f5f7fb";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("CF", 13, 20);
      ctx.font = "10px sans-serif";
      ctx.fillText("HP 100", 13, 139);
      ctx.fillText("30 / 90", 188, 139);
      ctx.fillStyle = Math.floor(t * 2) % 2 === 0 ? "#ff4d4d" : "#ffd166";
      ctx.fillRect(62, 11, 8, 8);

      texture.needsUpdate = true;
      return;
    }

    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, 0, W, H);
    // 标题栏 + 三色点
    ctx.fillStyle = "#1a1e27";
    ctx.fillRect(0, 0, W, 16);
    ["#ff5f56", "#ffbd2e", "#27c93f"].forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(11 + i * 13, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 滚动代码行
    const lineH = 10;
    const speed = 16 + (seed % 4) * 6;
    const scroll = (t * speed) % lineH;
    const base = Math.floor((t * speed) / lineH);
    for (let i = 0; i < 14; i++) {
      const r = rows[(base + i) % rows.length];
      const y = 22 + i * lineH - scroll;
      ctx.fillStyle = r.hot ? accent : "rgba(150,162,185,0.45)";
      ctx.fillRect(8 + r.indent, y, Math.max(6, r.w * (W - 24) - r.indent), 3);
    }
    // 闪烁光标
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(10, H - 22, 6, 7);
    }
    // 底部进度条
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(8, H - 8, W - 16, 3);
    ctx.fillStyle = accent;
    const p = (Math.sin(t * 0.5 + seed) * 0.5 + 0.5) * (W - 16);
    ctx.fillRect(8, H - 8, p, 3);

    texture.needsUpdate = true;
  });

  // 屏幕朝向人物一侧（-z）。
  return (
    <mesh position={[0, 0.3, -0.025]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[0.58, 0.34]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** 桌面主机：带前面板、散热孔和随任务色呼吸的状态灯。 */
function ComputerTower({ accent, seed }: { accent: string; seed: number }) {
  const powerMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const stripMaterial = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const pulse = 0.55 + Math.sin(state.clock.elapsedTime * 2.4 + seed) * 0.25;
    if (powerMaterial.current) powerMaterial.current.opacity = pulse;
    if (stripMaterial.current) stripMaterial.current.opacity = pulse * 0.85;
  });

  return (
    <group position={[0.62, 0.86, 0.55]}>
      <mesh castShadow>
        <boxGeometry args={[0.14, 0.3, 0.34]} />
        <meshStandardMaterial color="#23242b" roughness={0.55} metalness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0, -0.174]}>
        <boxGeometry args={[0.116, 0.26, 0.006]} />
        <meshStandardMaterial color="#151820" roughness={0.7} />
      </mesh>
      <mesh position={[-0.047, 0, -0.18]}>
        <boxGeometry args={[0.012, 0.22, 0.008]} />
        <meshBasicMaterial
          ref={stripMaterial}
          color={accent}
          transparent
          opacity={0.55}
          toneMapped={false}
        />
      </mesh>
      {[-0.07, -0.04, -0.01, 0.02, 0.05].map((y) => (
        <mesh key={y} position={[0.02, y, -0.181]}>
          <boxGeometry args={[0.058, 0.006, 0.008]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.65} roughness={0.32} />
        </mesh>
      ))}
      {[-0.075, -0.045, -0.015, 0.015, 0.045, 0.075].map((y) => (
        <mesh key={y} position={[0.071, y, 0.02]}>
          <boxGeometry args={[0.008, 0.006, 0.18]} />
          <meshStandardMaterial color="#c9ced6" metalness={0.65} roughness={0.32} />
        </mesh>
      ))}
      <mesh position={[0.036, 0.096, -0.182]}>
        <circleGeometry args={[0.018, 24]} />
        <meshBasicMaterial
          ref={powerMaterial}
          color={accent}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.036, 0.096, -0.181]}>
        <ringGeometry args={[0.022, 0.026, 24]} />
        <meshStandardMaterial color="#5a6070" roughness={0.45} />
      </mesh>
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} castShadow position={[x, -0.165, 0.09]}>
          <boxGeometry args={[0.035, 0.035, 0.12]} />
          <meshStandardMaterial color="#1b1c22" />
        </mesh>
      ))}
    </group>
  );
}

/** 桌下白色抽屉柜。 */
function DeskCabinet() {
  return (
    <group position={[0.62, 0.34, 0.5]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.62, 0.46]} />
        <meshStandardMaterial color="#f4f5f7" roughness={0.55} />
      </mesh>
      {[-0.14, 0.06, 0.24].map((y) => (
        <mesh key={y} position={[0, y, -0.232]}>
          <boxGeometry args={[0.36, 0.012, 0.01]} />
          <meshStandardMaterial color="#d4d8e0" roughness={0.5} />
        </mesh>
      ))}
      {[-0.065, 0.115, 0.275].map((y) => (
        <mesh key={y} position={[0, y, -0.238]}>
          <boxGeometry args={[0.12, 0.012, 0.012]} />
          <meshStandardMaterial color="#b8bec8" metalness={0.45} roughness={0.32} />
        </mesh>
      ))}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} castShadow position={[x, -0.33, 0.14]}>
          <boxGeometry args={[0.07, 0.06, 0.08]} />
          <meshStandardMaterial color="#e4e7ec" roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

/** 桌面输入设备：键盘 + 鼠标。 */
function DeskInputDevices() {
  return (
    <group position={[0, 0.705, 0.28]}>
      <mesh castShadow receiveShadow position={[-0.08, 0, 0]}>
        <boxGeometry args={[0.58, 0.025, 0.18]} />
        <meshStandardMaterial color="#24262d" roughness={0.5} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        return (
          <mesh
            key={i}
            position={[-0.285 + col * 0.078, 0.017, -0.055 + row * 0.055]}
          >
            <boxGeometry args={[0.052, 0.008, 0.026]} />
            <meshStandardMaterial color="#4b515d" roughness={0.55} />
          </mesh>
        );
      })}
      <group position={[-0.53, 0.006, 0]} rotation={[0, Math.PI, 0]} scale={0.58}>
        <mesh castShadow receiveShadow scale={[0.72, 0.16, 1.12]}>
          <sphereGeometry args={[0.105, 32, 16]} />
          <meshStandardMaterial color="#2f333b" roughness={0.42} />
        </mesh>
        <mesh position={[0, 0.022, -0.024]}>
          <boxGeometry args={[0.01, 0.008, 0.075]} />
          <meshStandardMaterial color="#7b838f" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.027, -0.065]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.026, 16]} />
          <meshStandardMaterial color="#a0a7b2" roughness={0.35} />
        </mesh>
        <mesh position={[-0.026, 0.024, -0.052]}>
          <boxGeometry args={[0.006, 0.006, 0.044]} />
          <meshStandardMaterial color="#555d69" roughness={0.5} />
        </mesh>
        <mesh position={[0.026, 0.024, -0.052]}>
          <boxGeometry args={[0.006, 0.006, 0.044]} />
          <meshStandardMaterial color="#555d69" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** 桌面仙人球：小花盆 + 圆形仙人球。 */
function DeskPlant({ seed }: { seed: number }) {
  const potColors = ["#d97757", "#6b7280", "#f2f4f7"];
  const cactusColors = ["#3f8f55", "#2f7d4f", "#4f8f45", "#26736d"];
  const potColor = potColors[seed % potColors.length];
  const cactusColor = cactusColors[seed % cactusColors.length];
  const spineCount = 6 + (seed % 4);
  const cactusScale: [number, number, number] = [
    0.62 + (seed % 2) * 0.08,
    0.72 + (seed % 3) * 0.08,
    0.62 + ((seed + 1) % 2) * 0.08,
  ];
  const flowerAngle = seed * 1.3;

  return (
    <group position={[-0.64, 0.735, 0.82]} rotation={[0, seed * 0.7, 0]} scale={0.78}>
      <mesh castShadow receiveShadow position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.065, 0.085, 0.07, 18]} />
        <meshStandardMaterial color={potColor} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.079, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.01, 18]} />
        <meshStandardMaterial color="#2a211d" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.15, 0]} scale={cactusScale}>
        <sphereGeometry args={[0.085, 24, 14]} />
        <meshStandardMaterial color={cactusColor} roughness={0.78} />
      </mesh>
      {Array.from({ length: spineCount }, (_, i) => {
        const angle = (i / spineCount) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.046, 0.154 + (i % 3) * 0.014, Math.sin(angle) * 0.046]}
            rotation={[0, -angle, Math.PI / 2]}
          >
            <coneGeometry args={[0.005, 0.026, 6]} />
            <meshStandardMaterial color="#eef2e6" roughness={0.5} />
          </mesh>
        );
      })}
      <mesh
        castShadow
        position={[
          Math.cos(flowerAngle) * 0.025,
          0.21 + (seed % 2) * 0.012,
          Math.sin(flowerAngle) * 0.025,
        ]}
      >
        <sphereGeometry args={[0.017, 12, 8]} />
        <meshStandardMaterial color="#f4a7b9" roughness={0.55} />
      </mesh>
    </group>
  );
}

/** 每排右侧工位旁边的长方体盆栽柜。 */
function RowPlanterCabinet({
  position,
  seed,
}: {
  position: [number, number, number];
  seed: number;
}) {
  const leafColors = ["#2f7d4f", "#3f8f55", "#26736d"];
  const leafColor = leafColors[seed % leafColors.length];

  return (
    <group position={position} scale={WORKSTATION_SCALE}>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.36, 0.62, 1.18]}
        radius={0.045}
        smoothness={6}
        position={[0, 0.31, 0.55]}
      >
        <meshStandardMaterial color="#f3f5f9" roughness={0.58} />
      </RoundedBox>
      <mesh castShadow receiveShadow position={[0, 0.64, 0.55]}>
        <boxGeometry args={[0.3, 0.08, 1.02]} />
        <meshStandardMaterial color="#d6dbe4" roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.69, 0.55]}>
        <boxGeometry args={[0.24, 0.025, 0.92]} />
        <meshStandardMaterial color="#2a211d" roughness={0.9} />
      </mesh>
      {[-0.28, 0, 0.28].map((z, plantIndex) => (
        <group key={z} position={[0, 0.72, 0.55 + z]}>
          <mesh castShadow position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.018, 0.024, 0.18, 10]} />
            <meshStandardMaterial color="#2e6b3d" roughness={0.7} />
          </mesh>
          {Array.from({ length: 5 }, (_, leafIndex) => {
            const angle =
              (leafIndex / 5) * Math.PI * 2 + seed * 0.3 + plantIndex * 0.5;
            const height = 0.17 + (leafIndex % 2) * 0.035;
            return (
              <mesh
                key={leafIndex}
                castShadow
                position={[
                  Math.cos(angle) * 0.055,
                  height,
                  Math.sin(angle) * 0.055,
                ]}
                rotation={[0.55, -angle, 0.25]}
                scale={[0.55, 0.18, 1]}
              >
                <sphereGeometry args={[0.09, 18, 10]} />
                <meshStandardMaterial color={leafColor} roughness={0.72} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// 家具模型：书柜（Quaternius「Bookcase with Books」）、沙发（Quaternius「Sofa」），均 CC0。
useGLTF.preload("/models/sofa.glb");
useGLTF.preload("/models/loveseat.glb");

// 程序化皮革纹理（鹅卵石颗粒 + 细裂纹），生成一次后复用。
let leatherMapsCache: { bump: THREE.CanvasTexture; rough: THREE.CanvasTexture } | null = null;
function getLeatherMaps() {
  if (leatherMapsCache) return leatherMapsCache;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d")!;
  // 中灰底
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, S, S);
  // 鹅卵石颗粒：大量随机小圆，明暗交错形成皮革颗粒感
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    const r = 1.5 + Math.random() * 3.5;
    const v = 128 + (Math.random() - 0.5) * 150;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fill();
  }
  // 细裂纹：随机短曲线，加深皮革分块感
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * S;
    const y = Math.random() * S;
    ctx.strokeStyle = `rgba(60,60,60,0.5)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x;
    let py = y;
    const seg = 3 + Math.floor(Math.random() * 4);
    for (let s = 0; s < seg; s++) {
      px += (Math.random() - 0.5) * 26;
      py += (Math.random() - 0.5) * 26;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(3, 3);
  // 粗糙度图：复用同一纹理，颗粒处更哑光
  const rough = new THREE.CanvasTexture(c);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.set(3, 3);
  leatherMapsCache = { bump, rough };
  return leatherMapsCache;
}

/**
 * 通用家具：加载 glb，自动缩放到目标高度、水平居中并落地。
 * 传入 leatherColor 时，将所有网格替换为带程序化纹理的皮革材质。
 */
function FurnitureModel({
  src,
  position,
  height,
  rotationY = 0,
  leatherColor,
  stretchX = 1,
}: {
  src: string;
  position: [number, number, number];
  height: number;
  rotationY?: number;
  leatherColor?: string;
  stretchX?: number;
}) {
  const { scene } = useGLTF(src);
  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    const leatherMat = leatherColor
      ? (() => {
          const { bump, rough } = getLeatherMaps();
          return new THREE.MeshStandardMaterial({
            color: leatherColor,
            roughness: 0.62,
            metalness: 0.06,
            bumpMap: bump,
            bumpScale: 0.05,
            roughnessMap: rough,
          });
        })()
      : null;
    copy.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (leatherMat) obj.material = leatherMat;
      }
    });
    return copy;
  }, [scene, leatherColor]);
  const { scale, yOff, cx, cz } = useMemo(() => {
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const h = size.y > 0.001 ? size.y : 1;
    const s = height / h;
    return {
      scale: s,
      yOff: -box.min.y * s,
      cx: -center.x * s,
      cz: -center.z * s,
    };
  }, [cloned, height]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group
        position={[cx * stretchX, yOff, cz]}
        scale={[scale * stretchX, scale, scale]}
      >
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// 书脊配色（彩色书籍）。
const BOOK_COLORS = [
  "#b4452f", "#c9882b", "#2f6f4f", "#34598a", "#7a4a86",
  "#9c6b43", "#455a64", "#8a2f3a", "#d9b24a", "#3a7a7a",
  "#5b6770", "#a8762f", "#4d6b2f", "#7d4a3a",
];

const BOOK_TITLES = [
  "AI 系统", "算法", "React", "Rust", "数据", "设计", "模型", "产品",
  "自动化", "工程", "网络", "架构", "测试", "前端", "后端", "协作",
];

/** 简单可复现伪随机数（线性同余）。 */
function makeRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** 在 ctx 的 (ox,oy) 处画一个 128×256 的书脊（供图集复用）。 */
function drawBookSpine(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  title: string,
  color: string,
  index: number,
) {
  const W = 128;
  const H = 256;
  ctx.fillStyle = color;
  ctx.fillRect(ox, oy, W, H);

  const shade = new THREE.Color(color).multiplyScalar(0.62).getStyle();
  ctx.fillStyle = shade;
  ctx.fillRect(ox, oy, 14, H);
  ctx.fillRect(ox + W - 14, oy, 14, H);
  ctx.fillRect(ox, oy + 14, W, 10);
  ctx.fillRect(ox, oy + H - 24, W, 10);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.fillRect(ox + 28, oy + 44, 72, 128);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 3;
  ctx.strokeRect(ox + 28, oy + 44, 72, 128);

  ctx.save();
  ctx.translate(ox + 64, oy + 132);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#111827";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(title, 0, 0, 112);
  ctx.restore();

  ctx.fillStyle = index % 2 ? "#facc15" : "#e5e7eb";
  ctx.fillRect(ox + 38, oy + 188, 52, 12);
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  for (let y = 208; y < 238; y += 8) {
    ctx.fillRect(ox + 36, oy + y, 56, 3);
  }
}

/**
 * 自造「办公室长书柜」：木质框架 + 多层隔板 + 竖向分隔成多个书格，
 * 每格塞满高低错落的彩色书脊。完全程序化，长度/颜色可控。
 */
function Bookcase({
  position,
  height = 1.9,
  rotationY = 0,
  width = 3.6,
  depth = 0.42,
}: {
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  width?: number;
  depth?: number;
}) {
  const designH = 1.9;
  const s = height / designH;
  const W = width;
  const H = designH;
  const D = depth;
  const t = 0.05; // 外框厚度
  const shelfT = 0.035; // 隔板厚度
  const rows = 4; // 层数
  const bays = 4; // 竖向书格数
  const wood = "#9b6a40";
  const woodDark = "#6f4a2e";
  const innerW = W - 2 * t;
  const rowH = (H - 2 * t) / rows;
  const dividerXs = Array.from(
    { length: bays - 1 },
    (_, i) => -W / 2 + t + (innerW / bays) * (i + 1),
  );
  const bayW = innerW / bays;

  // 预生成所有书脊（按格、按层），可复现、不闪烁。
  const books = useMemo(() => {
    const rand = makeRand(
      Math.round(position[0] * 1000) + Math.round(position[2] * 1000) + 7919,
    );
    const out: {
      x: number;
      y: number;
      bw: number;
      bh: number;
      bd: number;
      tilt: number;
      color: string;
      title: string;
    }[] = [];
    const bd = D * 0.7;
    for (let r = 0; r < rows; r++) {
      const base = t + r * rowH; // 该层隔板上表面
      const innerH = rowH - shelfT;
      for (let b = 0; b < bays; b++) {
        const left = -W / 2 + t + b * bayW + 0.015;
        const right = left + bayW - 0.03;
        let x = left;
        while (x < right - 0.05) {
          // 更宽的书 + 更大间隙 → 书脊数量减少约 ⅓，观感仍饱满。
          const bw = 0.05 + rand() * 0.06;
          if (x + bw > right) break;
          const bh = innerH * (0.6 + rand() * 0.36);
          const tilt = rand() < 0.1 ? (rand() - 0.5) * 0.28 : 0;
          out.push({
            x: x + bw / 2,
            y: base + bh / 2 + 0.004,
            bw: bw * 0.9,
            bh,
            bd,
            tilt,
            color: BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)],
            title: BOOK_TITLES[Math.floor(rand() * BOOK_TITLES.length)],
          });
          x += bw + 0.006 + (rand() < 0.12 ? 0.03 : 0);
        }
      }
    }
    return out;
  }, [position, W, H, D, rowH, bayW, innerW]);

  // 所有书脊画进一张图集，全部书合并成单网格：
  // 书脊面 UV 指向各自图集格、侧/页面 UV 指向白格并用顶点色着色。
  // → 整座书柜的书从「N×6 draw call + N 纹理」降到「1 draw call + 1 纹理」。
  const bookBatch = useMemo(() => {
    const K = books.length;
    if (!K) return null;
    const CW = 128;
    const CH = 256;
    const cols = Math.ceil(Math.sqrt(K + 1));
    const rowsN = Math.ceil((K + 1) / cols);
    const cv = document.createElement("canvas");
    cv.width = cols * CW;
    cv.height = rowsN * CH;
    const ctx = cv.getContext("2d")!;
    const cellXY = (idx: number) => ({
      cx: (idx % cols) * CW,
      cy: Math.floor(idx / cols) * CH,
    });
    books.forEach((bk, i) => {
      const { cx, cy } = cellXY(i);
      drawBookSpine(ctx, cx, cy, bk.title, bk.color, i);
    });
    const whiteIdx = K;
    const wr = cellXY(whiteIdx);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(wr.cx, wr.cy, CW, CH);

    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const Wc = cv.width;
    const Hc = cv.height;
    // flipY 默认 true：UV v=0 对应画布底部，故按 (1 - 像素/高) 反算。
    const cellUV = (idx: number) => {
      const { cx, cy } = cellXY(idx);
      return {
        u0: cx / Wc,
        u1: (cx + CW) / Wc,
        v0: 1 - (cy + CH) / Hc,
        v1: 1 - cy / Hc,
      };
    };
    const wuv = cellUV(whiteIdx);
    const whiteU = (wuv.u0 + wuv.u1) / 2;
    const whiteV = (wuv.v0 + wuv.v1) / 2;
    const WHITE = new THREE.Color(1, 1, 1);
    const page = new THREE.Color("#f5ead6");

    const geos: THREE.BufferGeometry[] = [];
    const mtx = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    books.forEach((bk, i) => {
      const g = new THREE.BoxGeometry(bk.bw, bk.bh, bk.bd).toNonIndexed();
      const pos = g.getAttribute("position");
      const uv = g.getAttribute("uv");
      const n = pos.count; // 36：每面 6 顶点，顺序 +X,-X,+Y,-Y,+Z,-Z
      const colors = new Float32Array(n * 3);
      const side = new THREE.Color(bk.color).multiplyScalar(0.72);
      const cell = cellUV(i);
      for (let v = 0; v < n; v++) {
        const col = v < 12 ? side : v < 24 ? page : WHITE;
        colors[v * 3] = col.r;
        colors[v * 3 + 1] = col.g;
        colors[v * 3 + 2] = col.b;
        if (v < 24) {
          uv.setXY(v, whiteU, whiteV); // 侧/页面 → 白格
        } else {
          // 书脊面（±Z）→ 本书图集格，按原 box UV 重映射。
          const u = uv.getX(v);
          const w = uv.getY(v);
          uv.setXY(
            v,
            cell.u0 + u * (cell.u1 - cell.u0),
            cell.v0 + w * (cell.v1 - cell.v0),
          );
        }
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      mtx.makeTranslation(bk.x, bk.y, -D * 0.08);
      rot.makeRotationZ(bk.tilt);
      g.applyMatrix4(mtx.multiply(rot));
      geos.push(g);
    });
    const geometry = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    return geometry ? { geometry, texture } : null;
  }, [books, D]);

  const woodMat = (
    <meshStandardMaterial color={wood} roughness={0.78} metalness={0.02} />
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={s}>
      {/* 背板 */}
      <mesh position={[0, H / 2, -D / 2 + 0.01]} receiveShadow castShadow>
        <boxGeometry args={[W, H, 0.02]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} />
      </mesh>
      {/* 左右侧板 */}
      {[-W / 2 + t / 2, W / 2 - t / 2].map((x) => (
        <mesh key={`side-${x}`} position={[x, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[t, H, D]} />
          {woodMat}
        </mesh>
      ))}
      {/* 顶/底/隔板（rows+1 块） */}
      {Array.from({ length: rows + 1 }, (_, k) => {
        const y = k === 0 ? t / 2 : k === rows ? H - t / 2 : t + k * rowH;
        const th = k === 0 || k === rows ? t : shelfT;
        return (
          <mesh key={`shelf-${k}`} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[W, th, D]} />
            {woodMat}
          </mesh>
        );
      })}
      {/* 竖向分隔板 */}
      {dividerXs.map((x) => (
        <mesh key={`div-${x}`} position={[x, H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[shelfT, H - 2 * t, D]} />
          {woodMat}
        </mesh>
      ))}
      {/* 书脊：全部合并为单网格 + 图集（1 draw call） */}
      {bookBatch && (
        <mesh geometry={bookBatch.geometry} castShadow receiveShadow>
          <meshStandardMaterial
            map={bookBatch.texture}
            vertexColors
            roughness={0.66}
            metalness={0.02}
          />
        </mesh>
      )}
    </group>
  );
}

/** 沙发：浅黑色皮质材质（程序化皮革纹理）。 */
function Sofa(props: {
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  stretchX?: number;
}) {
  return (
    <FurnitureModel
      src="/models/sofa.glb"
      {...props}
      height={props.height ?? 1.0}
      leatherColor="#3a3b40"
    />
  );
}

/**
 * 自造白色冰箱：白色机身 + 上/下门（凹缝）+ 竖向把手 + 上门显示器。
 * 门面朝 -z（rotationY=0 时即朝相机/3D 区下方），完全程序化、朝向可控。
 */
function Fridge({
  position,
  height = 1.95,
  rotationY = 0,
  width = 0.98,
  depth = 0.86,
}: {
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  width?: number;
  depth?: number;
}) {
  const W = width;
  const H = height;
  const D = depth;
  const fz = -D / 2; // 门面（-z）
  const splitY = H * 0.6; // 上/下门分界
  const seam = "#c2c8d0"; // 浅灰门缝
  const white = (
    <meshStandardMaterial color="#f3f4f6" roughness={0.42} metalness={0.06} />
  );
  // 门板：略小于机身、微微凸出，边缘留缝。
  const doorInset = 0.05;
  const upperH = H - splitY - 0.06;
  const lowerH = splitY - 0.06;

  // 显示器屏幕纹理：显示冷藏 / 冷冻温度。
  const screenTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d1730";
    ctx.fillRect(0, 0, 120, 300);
    ctx.textAlign = "center";
    ctx.fillStyle = "#6f9bff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("冷藏", 60, 44);
    ctx.fillStyle = "#9fe0ff";
    ctx.font = "bold 60px monospace";
    ctx.fillText("4°C", 60, 110);
    ctx.strokeStyle = "#22407a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 150);
    ctx.lineTo(100, 150);
    ctx.stroke();
    ctx.fillStyle = "#6f9bff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("冷冻", 60, 196);
    ctx.fillStyle = "#9fe0ff";
    ctx.font = "bold 52px monospace";
    ctx.fillText("-18°", 60, 258);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.center.set(0.5, 0.5);
    t.repeat.x = -1; // 平面朝 -z 翻转后修正镜像
    return t;
  }, []);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 机身 */}
      <RoundedBox
        args={[W, H, D]}
        radius={0.04}
        smoothness={6}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
      >
        {white}
      </RoundedBox>
      {/* 上门板 */}
      <RoundedBox
        args={[W - doorInset * 2, upperH, 0.05]}
        radius={0.03}
        smoothness={5}
        position={[0, splitY + (H - splitY) / 2, fz - 0.01]}
        castShadow
      >
        <meshStandardMaterial color="#fafbfc" roughness={0.4} metalness={0.06} />
      </RoundedBox>
      {/* 下门板 */}
      <RoundedBox
        args={[W - doorInset * 2, lowerH, 0.05]}
        radius={0.03}
        smoothness={5}
        position={[0, splitY / 2, fz - 0.01]}
        castShadow
      >
        <meshStandardMaterial color="#fafbfc" roughness={0.4} metalness={0.06} />
      </RoundedBox>
      {/* 上/下门水平缝 */}
      <mesh position={[0, splitY, fz - 0.005]}>
        <boxGeometry args={[W - 0.04, 0.02, 0.04]} />
        <meshStandardMaterial color={seam} roughness={0.7} />
      </mesh>
      {/* 竖向把手：上门 + 下门（靠中缝右侧） */}
      {[
        [splitY + (H - splitY) / 2, upperH - 0.16] as const,
        [splitY / 2, lowerH - 0.16] as const,
      ].map(([yc, len], i) => (
        <mesh key={i} position={[W / 2 - 0.12, yc, fz - 0.05]} castShadow>
          <boxGeometry args={[0.045, len, 0.05]} />
          <meshStandardMaterial color="#b9bec6" metalness={0.85} roughness={0.28} />
        </mesh>
      ))}
      {/* 上门显示器：深色边框（宽度减半）+ 显示温度的发光屏幕 */}
      <mesh position={[-W * 0.22, H * 0.78, fz - 0.04]}>
        <boxGeometry args={[0.17, 0.42, 0.03]} />
        <meshStandardMaterial color="#16181c" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh
        position={[-W * 0.22, H * 0.78, fz - 0.057]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[0.14, 0.36]} />
        <meshBasicMaterial map={screenTex} toneMapped={false} />
      </mesh>
      {/* 底部踢脚 */}
      <mesh position={[0, 0.03, fz + 0.02]}>
        <boxGeometry args={[W - 0.06, 0.06, 0.04]} />
        <meshStandardMaterial color="#cfd3da" roughness={0.6} />
      </mesh>
    </group>
  );
}

function WallJellyfishLogo() {
  const logoTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const ctx = c.getContext("2d")!;

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const cx = 250;
    const cy = 116;

    ctx.strokeStyle = "rgba(37, 99, 235, 0.58)";
    ctx.lineWidth = 7;
    [-58, -30, 0, 30, 58].forEach((offset, index) => {
      ctx.beginPath();
      ctx.moveTo(cx + offset, cy + 42);
      ctx.bezierCurveTo(
        cx + offset + (index % 2 ? 22 : -18),
        cy + 88,
        cx + offset - (index % 2 ? 16 : -22),
        cy + 124,
        cx + offset + (index % 2 ? 10 : -10),
        cy + 168,
      );
      ctx.stroke();
    });

    ctx.strokeStyle = "rgba(20, 184, 166, 0.68)";
    ctx.lineWidth = 3;
    [-44, -14, 18, 46].forEach((offset, index) => {
      ctx.beginPath();
      ctx.moveTo(cx + offset, cy + 42);
      ctx.bezierCurveTo(
        cx + offset - 16,
        cy + 78,
        cx + offset + 18,
        cy + 118,
        cx + offset - (index % 2 ? 12 : -12),
        cy + 154,
      );
      ctx.stroke();
    });

    const dome = ctx.createLinearGradient(cx - 108, cy - 70, cx + 108, cy + 72);
    dome.addColorStop(0, "#38bdf8");
    dome.addColorStop(0.55, "#14b8a6");
    dome.addColorStop(1, "#6366f1");
    ctx.shadowColor = "rgba(20, 184, 166, 0.26)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.moveTo(cx - 106, cy + 22);
    ctx.bezierCurveTo(cx - 92, cy - 72, cx + 92, cy - 72, cx + 106, cy + 22);
    ctx.bezierCurveTo(cx + 72, cy + 58, cx - 72, cy + 58, cx - 106, cy + 22);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy + 26);
    ctx.quadraticCurveTo(cx - 46, cy + 46, cx - 24, cy + 26);
    ctx.quadraticCurveTo(cx, cy + 48, cx + 24, cy + 26);
    ctx.quadraticCurveTo(cx + 46, cy + 46, cx + 70, cy + 26);
    ctx.stroke();

    [
      [cx - 35, cy - 8, 10],
      [cx + 8, cy - 25, 8],
      [cx + 42, cy + 4, 7],
    ].forEach(([x, y, r]) => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    const textX = 410;
    const textY = 204;
    ctx.textAlign = "start";
    ctx.font = "700 112px Inter, Avenir, Helvetica, Arial, sans-serif";
    const textWidth = ctx.measureText(WALL_LOGO_TEXT).width;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.lineWidth = 12;
    ctx.strokeText(WALL_LOGO_TEXT, textX, textY);
    ctx.fillStyle = "#111827";
    ctx.fillText(WALL_LOGO_TEXT, textX, textY);

    const underlineY = textY + 32;
    const underline = ctx.createLinearGradient(textX, 0, textX + textWidth, 0);
    underline.addColorStop(0, "#38bdf8");
    underline.addColorStop(0.56, "#14b8a6");
    underline.addColorStop(1, "#6366f1");
    ctx.strokeStyle = underline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(textX, underlineY);
    ctx.lineTo(textX + textWidth, underlineY);
    ctx.stroke();

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.center.set(0.5, 0.5);
    t.repeat.x = -1;
    t.repeat.y = -1;
    return t;
  }, []);

  return (
    <mesh
      position={[WALL_X + 5.2, 1.48, WALL_Z - 0.8]}
      rotation={[-Math.PI, 0, 0]}
      renderOrder={3}
    >
      <planeGeometry args={[4.25, 1.32]} />
      <meshBasicMaterial
        map={logoTex}
        transparent
        alphaTest={0.03}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** 双人沙发（2 座）：与 3 座沙发相同的黑色皮质材质。 */
function Loveseat(props: {
  position: [number, number, number];
  height?: number;
  rotationY?: number;
  stretchX?: number;
}) {
  return (
    <FurnitureModel
      src="/models/loveseat.glb"
      {...props}
      height={props.height ?? 0.95}
      leatherColor="#3a3b40"
    />
  );
}

/**
 * 自造茶几：椭圆玻璃台面 + 椭圆下层玻璃隔板 + 四条铬合金腿。完全程序化。
 * 椭圆由圆柱按 z 方向压扁得到。
 */
function CoffeeTable({
  position,
  rotationY = 0,
  width = 1.5,
  depth = 0.85,
  height = 0.42,
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  depth?: number;
  height?: number;
}) {
  const rx = width / 2; // x 半径
  const rz = depth / 2; // z 半径
  const zScale = rz / rx; // 压扁系数
  const topT = 0.035;
  const legR = 0.022;
  const legX = rx * 0.78;
  const legZ = rz * 0.62;
  const chrome = (
    <meshStandardMaterial color="#cfd4db" metalness={0.92} roughness={0.22} />
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 椭圆玻璃台面 */}
      <mesh
        position={[0, height - topT / 2, 0]}
        scale={[1, 1, zScale]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[rx, rx, topT, 56]} />
        <meshPhysicalMaterial
          color="#d8e8f0"
          transparent
          opacity={0.42}
          roughness={0.06}
          metalness={0}
          transmission={0.85}
          thickness={0.25}
          ior={1.45}
        />
      </mesh>
      {/* 台面铬边框（椭圆环：水平放置后压扁 z） */}
      <group position={[0, height - topT, 0]} scale={[1, 1, zScale]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[rx, 0.018, 12, 56]} />
          {chrome}
        </mesh>
      </group>
      {/* 椭圆下层玻璃隔板 */}
      <mesh position={[0, height * 0.3, 0]} scale={[1, 1, zScale]} receiveShadow>
        <cylinderGeometry args={[rx * 0.82, rx * 0.82, 0.025, 56]} />
        <meshPhysicalMaterial
          color="#d8e8f0"
          transparent
          opacity={0.4}
          roughness={0.08}
          metalness={0}
          transmission={0.82}
          thickness={0.2}
          ior={1.45}
        />
      </mesh>
      {/* 四条铬腿 */}
      {[
        [legX, legZ],
        [-legX, legZ],
        [legX, -legZ],
        [-legX, -legZ],
      ].map(([x, z]) => (
        <mesh
          key={`${x}-${z}`}
          position={[x, (height - topT) / 2, z]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[legR, legR, height - topT, 16]} />
          {chrome}
        </mesh>
      ))}
    </group>
  );
}

/** 自造小圆筒座椅（皮质鼓凳）：皮革凳身 + 圆形皮革软垫顶 + 深色底圈。 */
function CylinderStool({
  position,
  radius = 0.23,
  height = 0.44,
  color = "#c9a07a",
}: {
  position: [number, number, number];
  radius?: number;
  height?: number;
  color?: string;
}) {
  // 皮革材质：复用程序化皮革凹凸/粗糙度贴图，纹理清晰。
  const leather = useMemo(() => {
    const { bump, rough } = getLeatherMaps();
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.04,
      bumpMap: bump,
      bumpScale: 0.03,
      roughnessMap: rough,
    });
  }, [color]);
  return (
    <group position={position}>
      {/* 皮革凳身 */}
      <mesh
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
        material={leather}
      >
        <cylinderGeometry args={[radius, radius * 0.94, height, 36]} />
      </mesh>
      {/* 圆形皮革软垫顶（略大、微鼓） */}
      <mesh
        position={[0, height + 0.015, 0]}
        castShadow
        receiveShadow
        material={leather}
      >
        <cylinderGeometry args={[radius + 0.02, radius + 0.01, 0.07, 36]} />
      </mesh>
      {/* 深色底圈 */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, 0.04, 36]} />
        <meshStandardMaterial color="#2a2b30" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

function CokeBottle({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.2, 18]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.3} metalness={0.18} />
      </mesh>
      <mesh position={[0, -0.012, 0]}>
        <cylinderGeometry args={[0.037, 0.041, 0.065, 18]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.012, 0.039]}>
        <boxGeometry args={[0.052, 0.038, 0.006]} />
        <meshBasicMaterial color="#dc2626" toneMapped={false} />
      </mesh>
      <mesh position={[0.027, 0.035, 0.028]}>
        <boxGeometry args={[0.008, 0.13, 0.005]} />
        <meshBasicMaterial color="rgba(255,255,255,0.72)" transparent opacity={0.72} toneMapped={false} />
      </mesh>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.024, 0.028, 0.08, 18]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.38} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.018, 18]} />
        <meshStandardMaterial color="#171717" roughness={0.35} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0.036]}>
        <boxGeometry args={[0.052, 0.045, 0.006]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0.041]}>
        <boxGeometry args={[0.032, 0.01, 0.006]} />
        <meshBasicMaterial color="#b91c1c" toneMapped={false} />
      </mesh>
    </group>
  );
}

function FruitPlate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.16, 0.025, 28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.48} />
      </mesh>
      {[
        ["#f97316", -0.06, 0.03],
        ["#facc15", 0.02, -0.03],
        ["#ef4444", 0.07, 0.04],
        ["#84cc16", -0.01, 0.06],
      ].map(([color, x, z], index) => (
        <mesh key={index} castShadow position={[Number(x), 0.045, Number(z)]}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial color={String(color)} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function SnackPlate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.14, 0.025, 28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.48} />
      </mesh>
      {[-0.07, -0.025, 0.02, 0.065].map((x, index) => {
        const z = (index % 2) * 0.045 - 0.02;
        const wrapper = index % 2 ? "#f59e0b" : "#eab308";
        const stripe = index % 2 ? "#ef4444" : "#22c55e";
        return (
          <group key={index} position={[x, 0.04, z]} rotation={[0, index * 0.35, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.026, 0.046]} />
              <meshStandardMaterial color={wrapper} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.015, 0.001]}>
              <boxGeometry args={[0.048, 0.006, 0.048]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.02, 0.002]}>
              <boxGeometry args={[0.014, 0.006, 0.05]} />
              <meshBasicMaterial color={stripe} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function CounterCoffeeMachine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.46, 0.43, 0.36]}
        radius={0.035}
        smoothness={6}
        position={[0, 0.215, 0]}
      >
        <meshStandardMaterial color="#cfd4dc" roughness={0.22} metalness={0.78} />
      </RoundedBox>
      <mesh castShadow receiveShadow position={[0, 0.39, -0.03]}>
        <boxGeometry args={[0.34, 0.06, 0.25]} />
        <meshStandardMaterial color="#eef2f7" roughness={0.18} metalness={0.72} />
      </mesh>
      <mesh castShadow position={[0, 0.26, 0.166]}>
        <boxGeometry args={[0.34, 0.2, 0.018]} />
        <meshStandardMaterial color="#111827" roughness={0.26} metalness={0.18} />
      </mesh>
      <mesh position={[0.13, 0.305, 0.176]}>
        <boxGeometry args={[0.095, 0.03, 0.008]} />
        <meshBasicMaterial color="#60a5fa" toneMapped={false} />
      </mesh>
      {[-0.14, -0.09, -0.04, 0.01, 0.06].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.176]}>
          <circleGeometry args={[0.011, 14]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.22} metalness={0.55} />
        </mesh>
      ))}
      {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
        <mesh key={`vent-${x}`} position={[x, 0.39, -0.161]}>
          <boxGeometry args={[0.035, 0.008, 0.006]} />
          <meshStandardMaterial color="#9aa3af" roughness={0.28} metalness={0.65} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.475, -0.02]}>
        <cylinderGeometry args={[0.13, 0.16, 0.11, 24]} />
        <meshPhysicalMaterial color="#dbeafe" roughness={0.08} metalness={0.05} transparent opacity={0.6} />
      </mesh>
      {[
        [-0.07, -0.04],
        [-0.025, 0.02],
        [0.035, -0.02],
        [0.075, 0.035],
        [0, -0.06],
        [-0.055, 0.045],
        [0.055, 0.07],
      ].map(([x, z], index) => (
        <group
          key={`bean-${index}`}
          position={[x, 0.475 + (index % 3) * 0.01, -0.02 + z]}
          rotation={[0.35, index * 0.7, 0.25]}
        >
          <mesh castShadow scale={[1.35, 0.72, 0.92]}>
            <sphereGeometry args={[0.026, 16, 10]} />
            <meshStandardMaterial color="#5b341f" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.001, 0.023]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.004, 0.002, 0.035]} />
            <meshStandardMaterial color="#2f1b12" roughness={0.82} />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.43, -0.02]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.78} />
      </mesh>
      <mesh position={[0.13, 0.43, -0.12]}>
        <circleGeometry args={[0.022, 18]} />
        <meshBasicMaterial color="#22c55e" toneMapped={false} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 0.13]}>
        <cylinderGeometry args={[0.055, 0.06, 0.08, 18]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0.142]}>
        <boxGeometry args={[0.17, 0.025, 0.05]} />
        <meshStandardMaterial color="#737b86" metalness={0.82} roughness={0.18} />
      </mesh>
      <mesh castShadow position={[0, 0.14, 0.17]}>
        <cylinderGeometry args={[0.018, 0.018, 0.07, 16]} />
        <meshStandardMaterial color="#8b949e" metalness={0.88} roughness={0.16} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.012, 0.135]}>
        <boxGeometry args={[0.24, 0.018, 0.11]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.32} metalness={0.62} />
      </mesh>
      {[-0.09, -0.045, 0, 0.045, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.027, 0.188]}>
          <boxGeometry args={[0.012, 0.006, 0.045]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.24} metalness={0.72} />
        </mesh>
      ))}
      <mesh castShadow position={[-0.23, 0.215, -0.02]}>
        <boxGeometry args={[0.018, 0.36, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.7} />
      </mesh>
      <mesh castShadow position={[0.23, 0.215, -0.02]}>
        <boxGeometry args={[0.018, 0.36, 0.24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.18} metalness={0.7} />
      </mesh>
    </group>
  );
}

function MicrowaveOven({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.44, 0.24, 0.34]}
        radius={0.025}
        smoothness={6}
        position={[0, 0.12, 0]}
      >
        <meshStandardMaterial color="#f5f7fb" roughness={0.42} metalness={0.18} />
      </RoundedBox>
      <mesh castShadow position={[-0.07, 0.13, 0.172]}>
        <boxGeometry args={[0.25, 0.14, 0.012]} />
        <meshPhysicalMaterial
          color="#1f2937"
          roughness={0.16}
          metalness={0.05}
          transparent
          opacity={0.82}
        />
      </mesh>
      <mesh castShadow position={[0.155, 0.13, 0.174]}>
        <boxGeometry args={[0.08, 0.14, 0.014]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
      </mesh>
      {[-0.04, 0.02, 0.08].map((y, index) => (
        <mesh key={index} position={[0.155, 0.13 + y, 0.184]}>
          <circleGeometry args={[0.012, 14]} />
          <meshStandardMaterial color={index === 0 ? "#22c55e" : "#9ca3af"} roughness={0.36} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.005, 0]}>
        <boxGeometry args={[0.36, 0.018, 0.28]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
}

function CabinetRefreshments() {
  return (
    <group position={[0, 1.06, 0.45]}>
      <CounterCoffeeMachine position={[-0.18, 0, 1.02]} />
      <MicrowaveOven position={[0.18, 0, -1.42]} />
      {[-0.18, -0.08, 0.02].map((x, index) => (
        <CokeBottle key={index} position={[x, 0.09, 0.48 + index * 0.1]} />
      ))}
      <FruitPlate position={[0.18, 0.02, 0.02]} />
      <SnackPlate position={[-0.14, 0.02, -0.42]} />
      <FruitPlate position={[0.15, 0.02, -0.78]} />
    </group>
  );
}

/** 3D 右侧柜体区：固定在画面右上角的一体柜（白色 6 扇门）。 */
function StorageCabinetRow() {
  return (
    <group
      position={[RIGHT_STORAGE_ROW_X, 0, RIGHT_STORAGE_ROW_Z]}
      rotation={[0, Math.PI / 2, 0]}
    >
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.96, 0.95, 3.56]}
        radius={0.04}
        smoothness={6}
        position={[0, 0.475, 0]}
      >
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.6}
          emissive="#ffffff"
          emissiveIntensity={0.42}
        />
      </RoundedBox>
      <mesh castShadow receiveShadow position={[0, 0.97, 0]}>
        <boxGeometry args={[1.0, 0.04, 3.62]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.5}
          emissive="#ffffff"
          emissiveIntensity={0.42}
        />
      </mesh>
      {/* 顶面四周凸起边沿 */}
      <mesh castShadow receiveShadow position={[0.48, 1.01, 0]}>
        <boxGeometry args={[0.05, 0.05, 3.62]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.18} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.48, 1.01, 0]}>
        <boxGeometry args={[0.05, 0.05, 3.62]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.18} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.01, 1.785]}>
        <boxGeometry args={[1.0, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.18} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.01, -1.785]}>
        <boxGeometry args={[1.0, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} emissive="#ffffff" emissiveIntensity={0.18} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.82, 0.08, 3.4]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.72}
          emissive="#ffffff"
          emissiveIntensity={0.42}
        />
      </mesh>
      {/* 6 扇单独柜门：厚门板（边沿有厚度）+ 凹陷中心面板 + 圆形金属旋钮 */}
      {[-1.483, -0.89, -0.297, 0.297, 0.89, 1.483].map((z) => (
        <group key={z} position={[0.5, 0.5, z]}>
          {/* 厚门板 */}
          <RoundedBox
            castShadow
            receiveShadow
            args={[0.08, 0.82, 0.5]}
            radius={0.02}
            smoothness={5}
          >
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.55}
              emissive="#ffffff"
              emissiveIntensity={0.42}
            />
          </RoundedBox>
          {/* 凹陷中心面板（凸显边框厚度） */}
          <RoundedBox
            args={[0.03, 0.66, 0.38]}
            radius={0.012}
            smoothness={4}
            position={[0.035, 0, 0]}
          >
            <meshStandardMaterial
              color="#f1f3f7"
              roughness={0.6}
              emissive="#ffffff"
              emissiveIntensity={0.3}
            />
          </RoundedBox>
          {/* 圆形金属把手（球形旋钮，靠近门一侧） */}
          <mesh castShadow position={[0.06, 0, 0.17]}>
            <sphereGeometry args={[0.032, 18, 18]} />
            <meshStandardMaterial
              color="#9aa3b2"
              metalness={0.85}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}
      {/* 门缝竖直分隔线（从上到下） */}
      {[-1.78, -1.187, -0.593, 0, 0.593, 1.187, 1.78].map((z) => (
        <mesh key={`seam-${z}`} position={[0.502, 0.5, z]}>
          <boxGeometry args={[0.012, 0.86, 0.012]} />
          <meshStandardMaterial color="#cdd3dc" metalness={0.2} roughness={0.55} />
        </mesh>
      ))}
      <CabinetRefreshments />
    </group>
  );
}

/** 单门小柜子（只有一个柜门长度），放在大柜子前下方。 */
function SmallCabinet() {
  const L = 0.66; // 单个柜门长度
  const white = (
    <meshStandardMaterial
      color="#ffffff"
      roughness={0.6}
      emissive="#ffffff"
      emissiveIntensity={0.42}
    />
  );
  return (
    <group
      position={[RIGHT_STORAGE_ROW_X - 1.5, 0, RIGHT_STORAGE_ROW_Z - 0.81]}
      rotation={[0, 0, 0]}
    >
      {/* 柜体 */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.62, 0.95, L]}
        radius={0.04}
        smoothness={6}
        position={[0, 0.475, 0]}
      >
        {white}
      </RoundedBox>
      {/* 顶板 */}
      <mesh castShadow receiveShadow position={[0, 0.97, 0]}>
        <boxGeometry args={[0.66, 0.04, L + 0.06]} />
        {white}
      </mesh>
      {/* 顶面四周凸起边沿 */}
      <mesh castShadow receiveShadow position={[0.3, 1.01, 0]}>
        <boxGeometry args={[0.05, 0.05, L + 0.06]} />
        {white}
      </mesh>
      <mesh castShadow receiveShadow position={[-0.3, 1.01, 0]}>
        <boxGeometry args={[0.05, 0.05, L + 0.06]} />
        {white}
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.01, (L + 0.06) / 2]}>
        <boxGeometry args={[0.66, 0.05, 0.05]} />
        {white}
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.01, -(L + 0.06) / 2]}>
        <boxGeometry args={[0.66, 0.05, 0.05]} />
        {white}
      </mesh>
      {/* 底板 */}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.48, 0.08, L - 0.06]} />
        {white}
      </mesh>
      {/* 单扇柜门：厚门板 + 凹陷中心面板 + 圆形金属旋钮 */}
      <group position={[0.35, 0.5, 0]}>
        <RoundedBox
          castShadow
          receiveShadow
          args={[0.08, 0.82, 0.58]}
          radius={0.02}
          smoothness={5}
        >
          {white}
        </RoundedBox>
        <RoundedBox
          args={[0.03, 0.66, 0.44]}
          radius={0.012}
          smoothness={4}
          position={[0.035, 0, 0]}
        >
          <meshStandardMaterial
            color="#f1f3f7"
            roughness={0.6}
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </RoundedBox>
        <mesh castShadow position={[0.06, 0, 0.2]}>
          <sphereGeometry args={[0.032, 18, 18]} />
          <meshStandardMaterial color="#9aa3b2" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/** 一张完整办公桌：桌体 + 桌面设备 + 装饰。 */
function DeskSetup({
  accent,
  seed,
  screen = "code",
}: {
  accent: string;
  seed: number;
  screen?: ScreenMode;
}) {
  const desk = "#f6f7fb";

  return (
    <>
      {/* 桌面 */}
      <mesh castShadow receiveShadow position={[0, 0.68, 0.55]}>
        <boxGeometry args={[1.7, 0.01, 0.85]} />
        <meshStandardMaterial color={desk} />
      </mesh>
      {/* 桌腿 */}
      {[
        [-0.78, 0.18],
        [0.78, 0.18],
        [-0.78, 0.92],
        [0.78, 0.92],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 0.32, z]}>
          <boxGeometry args={[0.07, 0.72, 0.07]} />
          <meshStandardMaterial color={desk} />
        </mesh>
      ))}
      {/* 桌柜 */}
      <DeskCabinet />
      {/* 显示器 */}
      <group position={[0, 0.76, 0.85]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[0.66, 0.42, 0.04]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        {/* 任务运行画面（朝向相机，CanvasTexture 实时绘制） */}
        <MonitorScreen accent={accent} seed={seed} mode={screen} />
        <mesh castShadow position={[0, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.06]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        <mesh castShadow position={[0, -0.035, 0]}>
          <boxGeometry args={[0.08, 0.08, 0.055]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        <mesh castShadow receiveShadow position={[0, -0.085, -0.005]}>
          <boxGeometry args={[0.34, 0.025, 0.18]} />
          <meshStandardMaterial color="#1c1c22" roughness={0.45} />
        </mesh>
      </group>
      {/* 键盘 + 鼠标 */}
      <DeskInputDevices />
      {/* 小盆景 */}
      <DeskPlant seed={seed} />
      {/* 主机 */}
      <ComputerTower accent={accent} seed={seed} />
    </>
  );
}

/** 一个工位：桌子 + 椅子 +（占用时）角色。occupied=false 时无人、屏幕锁屏。 */
function Workstation({
  position,
  accent,
  seed,
  occupied = true,
  screen = "code",
}: {
  position: [number, number, number];
  accent: string;
  seed: number;
  occupied?: boolean;
  screen?: ScreenMode;
}) {
  return (
    <group position={position} scale={WORKSTATION_SCALE}>
      <DeskSetup accent={accent} seed={seed} screen={screen} />
      {/* 真实办公椅（正对桌子，靠背在人物身后） */}
      <group position={[0, 0, 0.2]}>
        <Chair />
      </group>
      {/* 坐姿程序员：仅在工位被占用（任务运行）时显示 */}
      {occupied && (
        <group position={[0, 0.12, -0.18]}>
          <SeatedProgrammer seed={seed} />
        </group>
      )}
    </group>
  );
}

/**
 * 静态几何合并：场景挂载稳定后（延迟一帧，确保所有 GLTF/子对象已 attach），
 * 把不透明、无贴图的 Standard/Basic 静态网格按材质合并成少量网格，
 * 原网格移到 layer 31 → 从颜色与阴影 pass 彻底移除。draw call 数百→个位数。
 * 排除：SkinnedMesh、透明、带贴图、Physical。GLTF 都是 clone(true)，安全。
 */
function StaticMerger({ rev, children }: { rev: string; children: ReactNode }) {
  const rootRef = useRef<THREE.Group>(null);
  const outRef = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const root = rootRef.current;
    const out = outRef.current;
    if (!root || !out) return;
    let raf2 = 0;

    const disposeOut = () => {
      while (out.children.length) {
        const c = out.children.pop() as THREE.Mesh;
        c.geometry?.dispose();
        const m = c.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      }
    };

    const run = () => {
      disposeOut();
      root.updateWorldMatrix(true, true);
      const rootInv = root.matrixWorld.clone().invert();
      const groups = new Map<
        string,
        { geos: THREE.BufferGeometry[]; mat: THREE.Material; cast: boolean }
      >();

      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) return;
        const mat = obj.material;
        if (Array.isArray(mat)) return;
        const isStd =
          mat instanceof THREE.MeshStandardMaterial &&
          !(mat instanceof THREE.MeshPhysicalMaterial);
        const isBasic = mat instanceof THREE.MeshBasicMaterial;
        if (!isStd && !isBasic) return;
        const m = mat as THREE.MeshStandardMaterial;
        if (
          m.map ||
          m.alphaMap ||
          m.normalMap ||
          m.bumpMap ||
          m.roughnessMap ||
          m.metalnessMap ||
          m.aoMap
        )
          return;
        if (m.transparent) return;
        if (isStd && (m.emissive.r > 0 || m.emissive.g > 0 || m.emissive.b > 0))
          return;
        const src = obj.geometry;
        if (!src || !src.getAttribute("position")) return;

        const g = src.index ? src.toNonIndexed() : src.clone();
        for (const name of Object.keys(g.attributes)) {
          if (name !== "position" && (name !== "normal" || !isStd))
            g.deleteAttribute(name);
        }
        if (isStd && !g.getAttribute("normal")) g.computeVertexNormals();
        g.applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(rootInv, obj.matrixWorld),
        );

        const count = g.getAttribute("position").count;
        const colors = new Float32Array(count * 3);
        const { r, g: cg, b } = m.color;
        for (let i = 0; i < count; i++) {
          colors[i * 3] = r;
          colors[i * 3 + 1] = cg;
          colors[i * 3 + 2] = b;
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const key = isStd
          ? `std|${m.roughness.toFixed(2)}|${m.metalness.toFixed(2)}|${Number(m.flatShading)}`
          : `basic|${Number(m.toneMapped)}`;
        let grp = groups.get(key);
        if (!grp) {
          grp = {
            geos: [],
            mat: isStd
              ? new THREE.MeshStandardMaterial({
                  vertexColors: true,
                  roughness: m.roughness,
                  metalness: m.metalness,
                  flatShading: m.flatShading,
                })
              : new THREE.MeshBasicMaterial({
                  vertexColors: true,
                  toneMapped: m.toneMapped,
                }),
            cast: isStd,
          };
          groups.set(key, grp);
        }
        grp.geos.push(g);

        obj.visible = false;
        obj.layers.set(31);
        obj.matrixAutoUpdate = false;
      });

      for (const { geos, mat, cast } of groups.values()) {
        if (!geos.length) continue;
        const mergedGeo = mergeGeometries(geos, false);
        geos.forEach((gg) => gg.dispose());
        if (!mergedGeo) continue;
        const mesh = new THREE.Mesh(mergedGeo, mat);
        mesh.castShadow = cast;
        mesh.receiveShadow = cast;
        mesh.matrixAutoUpdate = false;
        out.add(mesh);
      }

      gl.shadowMap.needsUpdate = true;
      invalidate();
    };

    // 延迟到挂载后两帧再合并，确保所有异步/GLTF 子对象已 attach 进场景图。
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(run);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      disposeOut();
    };
  }, [rev, gl, invalidate]);

  return (
    <>
      <group ref={rootRef}>{children}</group>
      <group ref={outRef} />
    </>
  );
}

/**
 * 在 frameloop="demand" 下以受控帧率驱动渲染。
 * 既保留呼吸灯/滚动屏等动画观感，又把渲染从 ~60fps 降到 ~30fps；
 * 窗口不可见/最小化时浏览器自动暂停 requestAnimationFrame → 场景停渲，CPU 归零。
 */
function RenderTicker({ fps = 30 }: { fps?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    // 家具/场景是静态的，阴影只需算一次，避免每帧重渲整张 shadow map（CPU 大头）。
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const interval = 1000 / fps;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last >= interval) {
        last = now;
        invalidate();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fps, invalidate]);
  return null;
}

/** 智能体 3D 办公室：按任务数布置工位网格。 */
export function Office3D({
  agentName,
  tasks,
}: {
  agentName: string;
  tasks: { id: string; title: string; running?: boolean }[];
}) {
  const cols = Math.min(2, Math.max(1, tasks.length));
  const rows = Math.ceil(tasks.length / cols);
  const gapX = 2.45;
  const gapZ = 5.0;
  const shadowCenterZ = WORKSTATION_GROUP_OFFSET_Z - ((rows - 1) / 2) * gapZ;
  const visualRightDeskX =
    WORKSTATION_GROUP_OFFSET_X - ((cols - 1) / 2) * gapX;
  const planterX = visualRightDeskX - PLANTER_SIDE_OFFSET_X;
  const hasStartedTasks = tasks.some((task) => task.running);
  const windowsScreenIndex = hasStartedTasks && tasks.length > 1 ? 1 : 0;
  const idleCfCandidates = tasks
    .map((task, index) => ({ index, idle: index !== 0 && !task.running }))
    .filter((item) => item.idle);
  const idleCfSeed = [...agentName, ...tasks.map((task) => task.id)].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const idleCfScreenIndex = idleCfCandidates.length
    ? idleCfCandidates[idleCfSeed % idleCfCandidates.length].index
    : -1;

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border bg-foreground/[0.02] py-12 text-center text-sm text-muted-foreground">
        {agentName} 当前没有进行中的任务
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-visible bg-transparent">
      <div className="relative min-h-0 flex-1 w-full overflow-hidden">
        <Canvas
          orthographic
          shadows
          frameloop="demand"
          dpr={1}
          camera={{
            position: LOCKED_CAMERA_POSITION,
            zoom: LOCKED_CAMERA_ZOOM,
            near: 0.1,
            far: 100,
          }}
        >
          <RenderTicker fps={24} />

          <StaticCameraTarget
            position={LOCKED_CAMERA_POSITION}
            target={LOCKED_CAMERA_TARGET}
            baseZoom={LOCKED_CAMERA_ZOOM}
          />
          <color attach="background" args={[SCENE_FLOOR_COLOR]} />
          <ambientLight intensity={1.1} />
          <directionalLight
            position={[6, 9, 5]}
            intensity={1.55}
            castShadow
            shadow-mapSize={[512, 512]}
          />
          <directionalLight position={[-5, 4, -3]} intensity={0.55} />
          <Suspense fallback={null}>
            <StaticMerger
              rev={`${agentName}|${cols}x${rows}|${tasks
                .map((t) => `${t.id}:${t.running ? 1 : 0}`)
                .join(",")}`}
            >
            {tasks.map((t, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const x = WORKSTATION_GROUP_OFFSET_X + (col - (cols - 1) / 2) * gapX;
              const z = WORKSTATION_GROUP_OFFSET_Z - row * gapZ;
              const occupied = hasStartedTasks ? Boolean(t.running) : i === 0;
              const isThirdRowRight = row === 2 && col === 0;
              const activeScreenMode: ScreenMode = isThirdRowRight
                ? "cf"
                : i === windowsScreenIndex
                  ? "windows"
                  : "code";
              const screenMode: ScreenMode =
                i === idleCfScreenIndex
                  ? "cf"
                  : occupied
                    ? activeScreenMode
                    : "lock";
              return (
                <Workstation
                  key={t.id}
                  position={[x, 0, z]}
                  accent={SCREEN_ACCENTS[i % SCREEN_ACCENTS.length]}
                  seed={i + 1}
                  occupied={occupied}
                  screen={screenMode}
                />
              );
            })}
            {Array.from({ length: rows }, (_, row) => (
              <RowPlanterCabinet
                key={`planter-${row}`}
                position={[planterX, 0, WORKSTATION_GROUP_OFFSET_Z - row * gapZ]}
                seed={row + 1}
              />
            ))}
            {/* 后墙（固定位置，不随柜子移动） */}
            {/* <mesh position={[WALL_X, 1.4, WALL_Z]} receiveShadow>
              <boxGeometry args={[20, 1.56, 0.1]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh> */}
            <WallJellyfishLogo />
            {/* 墙脚踢脚线 */}
            <mesh position={[WALL_X, 0.55, WALL_Z - 0.53]}>
              <boxGeometry args={[20, 0.1, 0.08]} />
              <meshStandardMaterial color="#f7f8fa" roughness={0.9} />
            </mesh>
            <StorageCabinetRow />
            <SmallCabinet />
            {/* 冰箱（场景最上方、靠后墙，门朝向 3D 区下方/相机） */}
            <Fridge position={[-1.9, 0, 4.2]} height={1.65} rotationY={0} />
            {/* 自造办公室长书柜（多格书架，书脊朝相机） */}
            <Bookcase position={[-4.0, 0, -2.2]} height={1.9} width={3.6} rotationY={Math.PI} />
            {/* 沙发（书柜前方，正面朝相机） */}
            <Sofa position={[-4.2, 0, -5.5]} height={1.0} rotationY={Math.PI} stretchX={1.15} />
            {/* 茶几（沙发前方） */}
            <CoffeeTable position={[-4.2, 0, -7.4]} width={1.5} depth={0.8} height={0.42} />
            {/* 双人沙发（茶几另一侧，与 3 座沙发面对面） */}
            <Loveseat position={[-4.2, 0, -10.1]} height={0.95} rotationY={0} />
            {/* 单个皮质小圆筒座椅（茶几左侧，灰黑色皮革） */}
            <CylinderStool position={[-2.6, 0, -7.4]} color="#34363b" />
            {/* 地面 + 接触阴影 */}
            <ContactShadows
              frames={1}
              position={[WORKSTATION_GROUP_OFFSET_X, 0.018, shadowCenterZ]}
              opacity={0.36}
              scale={14}
              blur={2.4}
              far={3.5}
            />
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, 0]}
            >
              <planeGeometry args={[40, 40]} />
              <meshBasicMaterial color={SCENE_FLOOR_COLOR} toneMapped={false} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.006, 0]}
              receiveShadow
            >
              <planeGeometry args={[40, 40]} />
              <shadowMaterial transparent opacity={0.16} />
            </mesh>
            </StaticMerger>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
