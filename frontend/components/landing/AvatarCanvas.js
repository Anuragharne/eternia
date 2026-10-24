"use client";

import React, { Suspense, useEffect, useLayoutEffect, useRef, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import PlaceholderAvatar from "./PlaceholderAvatar";

// Error Boundary for WebGL/Canvas runtime crashes
class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("AvatarCanvas WebGL fallback activated:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src="/images/neural_avatar_cutout.png"
            alt="Eternia Avatar"
            className="w-full max-w-[380px] h-auto object-contain filter contrast-[1.05] drop-shadow-[0_20px_40px_rgba(67,48,117,0.5)]"
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 3D Neural Avatar Bust loaded from /models/avatar.glb
 */
function NeuralAvatarModel() {
  const { scene } = useGLTF("/models/avatar.glb");
  const groupRef = useRef();

  // Fix missing normals on glTF primitive and upgrade to Glossy Iridescent Obsidian material
  useLayoutEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if (child.isMesh) {
        // Critical: Compute vertex normals for specular & clearcoat reflection
        child.geometry.computeVertexNormals();

        // Preserve baked texture from glTF model
        const bakedTexture = child.material?.map || null;

        // Upgrade material to Glossy Iridescent Obsidian with vibrant emissive pop
        child.material = new THREE.MeshPhysicalMaterial({
          map: bakedTexture,
          emissiveMap: bakedTexture,
          emissive: new THREE.Color("#ffffff"),
          emissiveIntensity: 0.35,
          roughness: 0.08,
          metalness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          iridescence: 0.85,
          iridescenceIOR: 1.5,
        });

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  // 60 FPS animations: idle breathing and smooth pointer tracking
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // 1. Idle Breathing: 3-second gentle sine wave oscillation
    const breath = 1.0 + 0.015 * Math.sin(t * (2 * Math.PI / 3));
    groupRef.current.scale.set(2.2, 2.2 * breath, 2.2);

    // 2. Smooth Cursor Tracking: Lerp rotation toward pointer position
    // Horizontal tracking: max ±15° (Math.PI / 12)
    const targetY = state.pointer.x * (Math.PI / 12);
    // Vertical tracking: max ±10° (Math.PI / 18)
    const targetX = -state.pointer.y * (Math.PI / 18);

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      0.08
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      0.08
    );
  });

  return (
    <group ref={groupRef} position={[0, -0.1, 0]} scale={2.2}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model binary for instant availability
useGLTF.preload("/models/avatar.glb");

export default function AvatarCanvas() {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [hasWebGL, setHasWebGL] = useState(true);

  // Tab visibility guard to stop burning GPU cycles when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // WebGL availability check for low-end device graceful fallback
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl", { powerPreference: "high-performance" }) ||
        canvas.getContext("experimental-webgl");
      if (!gl) {
        setHasWebGL(false);
      }
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    return (
      <div className="w-full h-full min-h-[460px] flex items-center justify-center p-4">
        <img
          src="/images/neural_avatar_cutout.png"
          alt="Eternia Avatar Presence"
          className="w-full max-w-[380px] h-auto object-contain filter contrast-[1.05] drop-shadow-[0_20px_40px_rgba(67,48,117,0.5)]"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-[460px] sm:h-[520px] md:h-[560px] relative flex items-center justify-center select-none">
      {/* Multi-layer Ambient Backlight Glow matching deep purple & lavender palette */}
      <div
        className="absolute w-[360px] h-[360px] sm:w-[460px] sm:h-[460px] rounded-full pointer-events-none -z-10 blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(67, 48, 117, 0.75) 0%, rgba(165, 140, 244, 0.25) 50%, transparent 70%)",
        }}
      />

      <WebGLErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
          camera={{ position: [0, 0.1, 2.4], fov: 35 }}
          frameloop={isTabVisible ? "always" : "demand"}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* 3-Point Studio Lighting */}
          <directionalLight position={[3, 4, 3]} intensity={1.8} color="#FAFAFA" />
          <directionalLight position={[-3, 2, -1]} intensity={0.9} color="#433075" />
          <directionalLight position={[0, 4, -4]} intensity={2.2} color="#A58CF4" />

          {/* Specular PointLight Rig for clearcoat highlights */}
          <pointLight position={[-1.8, 1.2, 1.5]} color="#00d9ff" intensity={1.5} distance={6} />
          <pointLight position={[1.8, 1.2, 1.5]} color="#ff007f" intensity={1.5} distance={6} />
          <pointLight position={[0, -1.5, 1.2]} color="#f5c542" intensity={1.2} distance={5} />
          <pointLight position={[0, 2.5, -1.0]} color="#8b5cf6" intensity={1.8} distance={6} />

          {/* Studio Environment & Reflections */}
          <Environment preset="studio" />

          {/* Model with procedural fallback inside Suspense */}
          <Suspense fallback={<PlaceholderAvatar />}>
            <NeuralAvatarModel />
          </Suspense>

          {/* Contact Shadows grounding the bust */}
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.45}
            blur={2.5}
            scale={10}
            far={4}
          />

          {/* Horizontal drag-rotation only */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.2}
            maxPolarAngle={Math.PI / 2.2}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
