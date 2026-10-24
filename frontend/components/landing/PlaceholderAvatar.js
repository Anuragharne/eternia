"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function PlaceholderAvatar() {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    // Gentle idle breathing oscillation (3-second sine wave cycle)
    const breath = 1.0 + 0.015 * Math.sin(t * (2 * Math.PI / 3));
    groupRef.current.scale.set(2.2, 2.2 * breath, 2.2);
  });

  return (
    <group ref={groupRef} position={[0, -0.1, 0]} scale={2.2}>
      {/* Smooth Capsule Body */}
      <mesh position={[0, -0.22, 0]}>
        <capsuleGeometry args={[0.22, 0.45, 16, 32]} />
        <meshPhysicalMaterial
          color="#2e1b4e"
          emissive="#433075"
          emissiveIntensity={0.25}
          roughness={0.08}
          metalness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          iridescence={0.85}
          iridescenceIOR={1.5}
        />
      </mesh>

      {/* Sphere Head */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshPhysicalMaterial
          color="#2e1b4e"
          emissive="#433075"
          emissiveIntensity={0.3}
          roughness={0.08}
          metalness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          iridescence={0.85}
          iridescenceIOR={1.5}
        />
      </mesh>

      {/* Luminous Neural Halo Ring */}
      <mesh position={[0, 0.24, 0.22]} rotation={[-0.05, 0, 0]}>
        <torusGeometry args={[0.16, 0.012, 16, 48]} />
        <meshStandardMaterial
          color="#A58CF4"
          emissive="#A58CF4"
          emissiveIntensity={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
