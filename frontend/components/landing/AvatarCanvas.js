"use client";

import React, { Suspense, useEffect, useLayoutEffect, useRef, useState, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useTexture, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
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
            className="w-full max-w-[380px] h-auto object-contain filter contrast-[1.05] drop-shadow-[0_20px_40px_rgba(33,11,44,0.7)]"
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
  const texture = useTexture("/models/avatar_enhanced_texture.png");
  const groupRef = useRef();

  // Fix missing normals on glTF primitive and upgrade to Glossy Iridescent Obsidian material
  useLayoutEffect(() => {
    if (!scene || !texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;

    scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.computeVertexNormals();

        child.material = new THREE.MeshPhysicalMaterial({
          map: texture,
          color: new THREE.Color("#FAF6FF"),
          emissiveMap: texture,
          emissive: new THREE.Color("#FFD166"),
          emissiveIntensity: 0.35,
          roughness: 0.18,
          metalness: 0.08,
          clearcoat: 0.9,
          clearcoatRoughness: 0.08,
          iridescence: 0.75,
          iridescenceIOR: 1.45,
        });

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene, texture]);

  // 60 FPS animation: gentle idle breathing while preserving exact fixed beauty angle
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    const breath = 1.0 + 0.012 * Math.sin(t * (2 * Math.PI / 3));
    groupRef.current.scale.set(1.22, 1.22 * breath, 1.22);

    groupRef.current.rotation.y = 0.64;
    groupRef.current.rotation.x = -0.06;
    groupRef.current.rotation.z = 0.02;
  });

  return (
    <group ref={groupRef} position={[-0.01, 0.00, 0]} scale={1.22}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/avatar.glb");
useTexture.preload("/models/avatar_enhanced_texture.png");

export default function AvatarCanvas() {
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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
          className="w-full max-w-[380px] h-auto object-contain filter contrast-[1.05] drop-shadow-[0_20px_40px_rgba(33,11,44,0.7)]"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] h-[520px] sm:h-[560px] md:h-[600px] relative flex items-center justify-center select-none"
      style={{
        maskImage: "linear-gradient(to bottom, black 76%, transparent 98%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 76%, transparent 98%)",
      }}
    >
      {/* Ambient Multi-Layer Glow Aura — Dark Purple, Wisteria & Sunglow palette */}
      <div
        className="absolute w-[420px] h-[420px] sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none -z-10 blur-3xl"
        style={{
          opacity: 0.85,
          background:
            "radial-gradient(circle, rgba(255, 209, 102, 0.45) 0%, rgba(188, 150, 230, 0.35) 42%, rgba(33, 11, 44, 0.6) 72%, transparent 88%)",
        }}
      />

      {/* Subtle Orbital Halo Ring with Sunglow highlight */}
      <div
        className="absolute w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full pointer-events-none -z-10"
        style={{
          border: "1.5px solid rgba(255, 209, 102, 0.4)",
          transform: "translateY(-62px) rotateX(68deg) translateZ(-20px)",
          boxShadow: "0 0 50px rgba(255, 209, 102, 0.35), inset 0 0 30px rgba(188, 150, 230, 0.25)",
        }}
      />

      <WebGLErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
          camera={{ position: [0, 0.04, 2.5], fov: 33 }}
          frameloop={isTabVisible ? "always" : "demand"}
          className="w-full h-full select-none"
        >
          {/* Base ambient — Dark Purple undertone */}
          <ambientLight intensity={0.9} color="#210B2C" />

          {/* 3-Point Studio Lighting — Wisteria & Sunglow harmony */}
          <directionalLight position={[2.5, 3.5, 2]} intensity={1.2} color="#FFFBF0" />
          <directionalLight position={[-2.5, 2, 1.5]} intensity={1.3} color="#BC96E6" />
          <directionalLight position={[0, 3, -3]} intensity={1.6} color="#FFD166" />

          {/* Specular PointLights for warm iridescent highlights */}
          <pointLight position={[-1.2, 0.6, 1.0]} color="#BC96E6" intensity={1.5} distance={4} />
          <pointLight position={[1.2, 0.6, 1.0]} color="#FFD166" intensity={1.8} distance={4} />
          <pointLight position={[0, -1.2, 1.0]} color="#D8C2F2" intensity={0.9} distance={3} />
          <pointLight position={[0, 2.2, -1.0]} color="#FFD166" intensity={1.5} distance={5} />

          <Environment preset="studio" />

          <Suspense fallback={<PlaceholderAvatar />}>
            <NeuralAvatarModel />
          </Suspense>

          <ContactShadows
            position={[0, -0.65, 0]}
            opacity={0.4}
            blur={2.2}
            scale={5}
            far={2}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
