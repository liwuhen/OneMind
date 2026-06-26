import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Bounds,
  Html,
  useGLTF,
  useAnimations,
} from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const SCREEN_ACCENTS = ["#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

// 坐姿打字程序员（Mixamo「Typing」动作，FBX 转 GLB，自带正确坐姿+打字动画）。
useGLTF.preload("/models/typing.glb");

/**
 * 坐姿程序员：直接播放 Mixamo Typing 动画（坐着对电脑打字），姿势天然正确。
 * 每个实例克隆骨骼，独立播放循环动画。
 */
function SeatedProgrammer({ seed: _seed }: { seed: number }) {
  const { scene, animations } = useGLTF("/models/typing.glb");
  const cloned = useMemo(() => skeletonClone(scene), [scene]);
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

  // 面向显示器（+z）。Mixamo 角色默认朝 -z，转 180°。
  return (
    <primitive
      object={cloned}
      scale={scale}
      position={[0, yOff, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// 真实办公椅模型（Kenney Furniture Kit，CC0）。
useGLTF.preload("/models/office-chair.glb");

/** 真实办公椅：加载 glb，自动缩放到统一高度并落地。 */
function Chair() {
  const { scene } = useGLTF("/models/office-chair.glb");
  const cloned = useMemo(() => scene.clone(true), [scene]);
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
    <primitive
      object={cloned}
      scale={scale}
      position={[cx, y, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

/** 显示器屏幕：CanvasTexture 实时绘制「任务运行中」的滚动代码/终端画面。 */
function MonitorScreen({ accent, seed }: { accent: string; seed: number }) {
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

  useFrame((state) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const t = state.clock.elapsedTime;

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

/** 一个工位：桌子 + 显示器 + 主机 + 椅子 + 角色 + 名字/任务标签。 */
function Workstation({
  position,
  accent,
  name,
  task,
  seed,
}: {
  position: [number, number, number];
  accent: string;
  name: string;
  task: string;
  seed: number;
}) {
  const desk = "#e9e9ef";
  return (
    <group position={position}>
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
      {/* 显示器 */}
      <group position={[0, 0.76, 0.85]}>
        <mesh castShadow position={[0, 0.3, 0]}>
          <boxGeometry args={[0.66, 0.42, 0.04]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
        {/* 任务运行画面（朝向相机，CanvasTexture 实时绘制） */}
        <MonitorScreen accent={accent} seed={seed} />
        <mesh castShadow position={[0, 0.05, 0]}>
          <boxGeometry args={[0.1, 0.12, 0.06]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>
      </group>
      {/* 主机 */}
      <mesh castShadow position={[0.62, 0.86, 0.55]}>
        <boxGeometry args={[0.12, 0.28, 0.32]} />
        <meshStandardMaterial color="#2a2a32" />
      </mesh>
      {/* 真实办公椅（正对桌子，靠背在人物身后） */}
      <group position={[0, 0, 0.2]}>
        <Chair />
      </group>
      {/* 坐姿程序员（坐在椅子座位上、面向显示器打字，含自造平脚掌） */}
      <group position={[0, 0.12, -0.18]}>
        <SeatedProgrammer seed={seed} />
      </group>
      {/* 名字 + 任务标签（固定屏幕尺寸） */}
      <Html position={[0, 1.9, -0.3]} center>
        <div className="pointer-events-none -translate-y-full whitespace-nowrap rounded-md bg-background/70 px-2 py-0.5 text-center backdrop-blur">
          <div className="text-xs font-semibold text-foreground">{name}</div>
          <div className="text-[10px] text-muted-foreground">{task}</div>
        </div>
      </Html>
    </group>
  );
}

/** 智能体 3D 办公室：按任务数布置工位网格。 */
export function Office3D({
  agentName,
  tasks,
}: {
  agentName: string;
  tasks: { id: string; title: string }[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border bg-foreground/[0.02] py-12 text-center text-sm text-muted-foreground">
        {agentName} 当前没有进行中的任务
      </div>
    );
  }

  const cols = Math.min(3, tasks.length);
  const rows = Math.ceil(tasks.length / cols);
  const gapX = 3;
  const gapZ = 3.2;

  // 网格中心（z 向后为负）与按规模自适应的相机距离。
  const centerZ = -((rows - 1) / 2) * gapZ;
  const spreadX = (cols - 1) * gapX + 2.5;
  const spreadZ = (rows - 1) * gapZ + 2.5;
  const dist = Math.max(spreadX, spreadZ) * 1.15 + 4.5;
  // 相机放在人物背后一侧（-z），过肩看向显示器，屏幕内容朝向我们。
  const camPos: [number, number, number] = [
    dist * 0.42,
    dist * 0.7,
    centerZ - dist * 0.82,
  ];

  return (
    <div className="overflow-hidden rounded-2xl border bg-gradient-to-b from-foreground/[0.04] to-transparent">
      <div className="px-4 pt-3 text-center text-sm text-muted-foreground">
        {agentName} 办公室 · {tasks.length} 个任务进行中
      </div>
      <div className="h-[440px] w-full">
        <Canvas shadows dpr={[1, 2]} camera={{ position: camPos, fov: 38 }}>
          <color attach="background" args={["#eceff5"]} />
          <ambientLight intensity={0.9} />
          <directionalLight
            position={[6, 9, 5]}
            intensity={1.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 4, -3]} intensity={0.4} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.15}>
              {tasks.map((t, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = (col - (cols - 1) / 2) * gapX;
                const z = row * gapZ;
                return (
                  <Workstation
                    key={t.id}
                    position={[x, 0, -z]}
                    accent={SCREEN_ACCENTS[i % SCREEN_ACCENTS.length]}
                    name={agentName}
                    task={t.title}
                    seed={i + 1}
                  />
                );
              })}
            </Bounds>
            {/* 地面 + 接触阴影 */}
            <ContactShadows
              position={[0, 0.01, 0]}
              opacity={0.4}
              scale={20}
              blur={2}
              far={5}
            />
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[40, 40]} />
              <meshStandardMaterial color="#e2e6ee" />
            </mesh>
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={4}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.1}
          />
        </Canvas>
      </div>
    </div>
  );
}
