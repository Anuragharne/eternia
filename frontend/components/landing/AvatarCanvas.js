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
  const texture = useTexture("/models/avatar_enhanced_texture.png");
  const groupRef = useRef();

  // Fix missing normals on glTF primitive and upgrade to Glossy Iridescent Obsidian material
  useLayoutEffect(() => {
    if (!scene || !texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;

    scene.traverse((child) => {
      if (child.isMesh) {
        // Critical: Compute vertex normals for specular & clearcoat reflection
        child.geometry.computeVertexNormals();

        // Upgrade material to Glossy Ethereal Iridescent Obsidian with vibrant neural glow
        child.material = new THREE.MeshPhysicalMaterial({
          map: texture,
          color: new THREE.Color("#FAFAFA"),
          emissiveMap: texture,
          emissive: new THREE.Color("#ffffff"),
          emissiveIntensity: 0.65,
          roughness: 0.16,
          metalness: 0.1,
          clearcoat: 0.9,
          clearcoatRoughness: 0.08,
          iridescence: 0.8,
          iridescenceIOR: 1.5,
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

    // Idle Breathing: 3-second gentle sine wave oscillation
    const breath = 1.0 + 0.012 * Math.sin(t * (2 * Math.PI / 3));
    groupRef.current.scale.set(1.22, 1.22 * breath, 1.22);

    // Fixed at the exact three-quarter poise shown in the reference image
    // (~36° horizontal turn showcasing the luminous rainbow temple + slight upward chin tilt)
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

// Preload the model binary and enhanced neural texture for instant availability
useGLTF.preload("/models/avatar.glb");
useTexture.preload("/models/avatar_enhanced_texture.png");

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
    <div
      className="w-full max-w-[440px] sm:max-w-[480px] md:max-w-[500px] h-[520px] sm:h-[560px] md:h-[600px] relative flex items-center justify-center select-none"
      style={{
        maskImage: "linear-gradient(to bottom, black 76%, transparent 98%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 76%, transparent 98%)",
      }}
    >
      {/* Ambient Multi-Layer Glow Aura in Deep Purple (#433075) & Lavender (#A58CF4) */}
      <div
        className="absolute w-[420px] h-[420px] sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none -z-10 blur-3xl opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(67, 48, 117, 0.85) 0%, rgba(165, 140, 244, 0.32) 45%, transparent 70%)",
        }}
      />

      {/* Subtle Orbital Halo Ring elevated behind Head */}
      <div
        className="absolute w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full pointer-events-none -z-10 border border-[#A58CF4]/30"
        style={{
          transform: "translateY(-62px) rotateX(68deg) translateZ(-20px)",
          boxShadow: "0 0 50px rgba(165, 140, 244, 0.25)",
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
          {/* Base ambient tone so shadowed face areas stay deep ethereal purple */}
          <ambientLight intensity={0.9} color="#352468" />

          {/* 3-Point Studio Lighting */}
          <directionalLight position={[2.5, 3.5, 2]} intensity={1.1} color="#f5f0ff" />
          <directionalLight position={[-2.5, 2, 1.5]} intensity={1.2} color="#8b5cf6" />
          <directionalLight position={[0, 3, -3]} intensity={1.8} color="#00d9ff" />

          {/* Specular PointLight Rig for clearcoat iridescent highlights */}
          <pointLight position={[-1.2, 0.6, 1.0]} color="#00d9ff" intensity={1.4} distance={4} />
          <pointLight position={[1.2, 0.6, 1.0]} color="#ec4899" intensity={1.4} distance={4} />
          <pointLight position={[0, -1.2, 1.0]} color="#a58cf4" intensity={0.8} distance={3} />
          <pointLight position={[0, 2.2, -1.0]} color="#c084fc" intensity={1.8} distance={5} />

          {/* Studio Environment & Reflections */}
          <Environment preset="studio" />

          {/* Model with procedural fallback inside Suspense */}
          <Suspense fallback={<PlaceholderAvatar />}>
            <NeuralAvatarModel />
          </Suspense>

          {/* Contact Shadows grounding the bust */}
          <ContactShadows
            position={[0, -0.65, 0]}
            opacity={0.35}
            blur={2.0}
            scale={5}
            far={2}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
