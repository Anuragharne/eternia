"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Eye, Shield, RotateCw } from "lucide-react";

export default function AvatarCanvas() {
  const mountRef = useRef(null);
  const [styleMode, setStyleMode] = useState("avatar"); // "avatar" | "connection"
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (styleMode !== "avatar") return;
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.42, 2.7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Group for entire companion
    const companionGroup = new THREE.Group();
    scene.add(companionGroup);

    // Group for head & neck (for independent cursor tracking)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.65, 0);
    companionGroup.add(headGroup);

    // 1. Stylized Companion Head
    const headGeo = new THREE.SphereGeometry(0.38, 64, 64);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xFAFAFA,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x433075,
      emissiveIntensity: 0.04,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headGroup.add(headMesh);

    // Luminous Cybernetic Visor / Eye Ring
    const visorGeo = new THREE.TorusGeometry(0.24, 0.02, 32, 64, Math.PI);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xA58CF4,
      emissive: 0x433075,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.5,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.02, 0.28);
    visorMesh.rotation.set(-0.1, 0, 0);
    headGroup.add(visorMesh);

    // Subtle Eye Sparkles
    const eyeGeo = new THREE.SphereGeometry(0.028, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xA58CF4 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, 0.04, 0.35);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, 0.04, 0.35);
    headGroup.add(leftEye);
    headGroup.add(rightEye);

    // 2. Neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.2, 32);
    const neckMat = new THREE.MeshStandardMaterial({
      color: 0x433075,
      roughness: 0.4,
      metalness: 0.3,
    });
    const neckMesh = new THREE.Mesh(neckGeo, neckMat);
    neckMesh.position.set(0, 0.38, 0);
    companionGroup.add(neckMesh);

    // 3. Torso & Shoulders (Sculpted capsule/shoulders)
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.24, 0.75, 32);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x0D0D0D,
      roughness: 0.3,
      metalness: 0.15,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, -0.06, 0);
    companionGroup.add(torsoMesh);

    // Left and Right Shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.16, 32, 32);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: 0x433075,
      roughness: 0.35,
      metalness: 0.2,
    });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.38, 0.22, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    rightShoulder.position.set(0.38, 0.22, 0);
    companionGroup.add(leftShoulder);
    companionGroup.add(rightShoulder);

    // 4. Glowing Memory Core (Heart of memories inside the chest)
    const coreGeo = new THREE.SphereGeometry(0.1, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xA58CF4,
      emissive: 0x433075,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.05, 0.16);
    companionGroup.add(coreMesh);

    // Concentric protective halo around core
    const haloGeo = new THREE.TorusGeometry(0.14, 0.012, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xA58CF4 });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 0.05, 0.16);
    companionGroup.add(haloMesh);

    // 5. Memory Stardust Particles (Dual Orbiting Celestial Rings)
    const particleCount = 240;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 0.9 + Math.random() * 0.7;
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const ring = i % 2 === 0 ? 1 : -1;
      
      const x = Math.cos(angle) * radius;
      const y = (Math.sin(angle) * 0.3 * ring) + (Math.random() - 0.5) * 0.25;
      const z = Math.sin(angle) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Subtle blend between lavender and golden memory amber
      if (i % 3 === 0) {
        colors[i * 3] = 0.98; // R
        colors[i * 3 + 1] = 0.75; // G
        colors[i * 3 + 2] = 0.35; // B (Golden memory spark)
      } else {
        colors[i * 3] = 0.75;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.98; // Lavender stardust
      }
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    companionGroup.add(particles);

    // 6. Atmospheric Lighting
    // Soft Key Light (Warm White)
    const keyLight = new THREE.DirectionalLight(0xFFF7ED, 1.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    // Fill Light (Soft Lavender)
    const fillLight = new THREE.DirectionalLight(0xC4B5FD, 0.9);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);

    // Rim Light (Golden Amber)
    const rimLight = new THREE.DirectionalLight(0xFDE68A, 1.2);
    rimLight.position.set(0, -3, -3);
    scene.add(rimLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xEDE9FE, 0.65);
    scene.add(ambientLight);

    // Mouse Tracking State
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = normX;
      mouse.targetY = normY;

      if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        companionGroup.rotation.y += deltaX * 0.008;
        previousMousePosition = { x: event.clientX, y: event.clientY };
      }
    };

    const handleMouseDown = (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleTouchMove = (event) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        mouse.targetX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.targetY = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Lerp mouse coordinates for ultra-smooth head rotation
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // 1. Head turns towards mouse (max ±16° horizontal, ±10° vertical)
      headGroup.rotation.y = mouse.x * 0.32;
      headGroup.rotation.x = -mouse.y * 0.2;

      // 2. Torso tracks mouse slightly (lagged)
      if (!isDragging) {
        companionGroup.rotation.y = THREE.MathUtils.lerp(
          companionGroup.rotation.y,
          mouse.x * 0.15,
          0.04
        );
      }

      // 3. Gentle Breathing (torso scale & position)
      const breath = Math.sin(elapsedTime * 1.6);
      torsoMesh.scale.x = 1 + breath * 0.015;
      torsoMesh.scale.z = 1 + breath * 0.015;
      headGroup.position.y = 0.65 + breath * 0.008;

      // 4. Memory Core Pulsing Glow
      coreMat.emissiveIntensity = 1.0 + Math.sin(elapsedTime * 2.8) * 0.4;
      haloMesh.rotation.z = elapsedTime * 0.8;
      haloMesh.scale.setScalar(1 + breath * 0.03);

      // 5. Floating Hover
      companionGroup.position.y = Math.sin(elapsedTime * 1.1) * 0.06;

      // 6. Orbiting Stardust Particles
      particles.rotation.y = elapsedTime * 0.18;
      particles.rotation.x = Math.sin(elapsedTime * 0.4) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("touchmove", handleTouchMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [styleMode]);

  return (
    <div className="w-full flex flex-col items-center relative">
      {/* Visual Mode Selector Pills */}
      <div className="flex items-center gap-2 mb-4 p-1 rounded-full bg-[#0D0D0D]/90 backdrop-blur-md border border-[#A58CF4]/25 shadow-xs z-20">
        <button
          onClick={() => setStyleMode("avatar")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
            styleMode === "avatar"
              ? "bg-[#433075] text-[#FAFAFA] shadow-xs"
              : "text-[rgba(250,250,250,0.7)] hover:text-[#FAFAFA]"
          }`}
        >
          <Eye size={13} />
          <span>Interactive 3D Avatar</span>
        </button>
        <button
          onClick={() => setStyleMode("connection")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
            styleMode === "connection"
              ? "bg-[#433075] text-[#FAFAFA] shadow-xs"
              : "text-[rgba(250,250,250,0.7)] hover:text-[#FAFAFA]"
          }`}
        >
          <Sparkles size={13} />
          <span>Human & AI Touch</span>
        </button>
      </div>

      {/* Visual Canvas Display */}
      <div
        className="w-full max-w-[840px] h-[360px] sm:h-[420px] md:h-[460px] relative flex items-center justify-center select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {styleMode === "avatar" ? (
          <>
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#433075]/40 via-[#A58CF4]/25 to-transparent blur-3xl" />
            </div>

            {/* 3D WebGL Canvas Container */}
            <div
              ref={mountRef}
              className="w-full h-full relative cursor-grab active:cursor-grabbing z-10"
            />

            {/* Micro Interaction Hint */}
            <div
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0D0D0D]/80 backdrop-blur-md border border-[#A58CF4]/25 text-[11px] text-[#FAFAFA] pointer-events-none transition-opacity duration-300 z-20 ${
                isHovered ? "opacity-90" : "opacity-40"
              }`}
            >
              <RotateCw size={11} className="animate-spin text-[#A58CF4]" style={{ animationDuration: "6s" }} />
              <span>Move mouse to track gaze • Drag to rotate 3D companion</span>
            </div>
          </>
        ) : (
          /* Human & Machine Hand Connection Cinematic Artwork */
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-[24px]">
            <img
              src="/images/ai_human_connection.jpg"
              alt="Machine and human hands connecting with stardust and volumetric light"
              className="w-full h-full object-cover object-center rounded-[24px] shadow-lg filter contrast-[1.02]"
            />
            <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-[#A58CF4]/20 pointer-events-none" />
            <div className="absolute bottom-4 left-6 px-4 py-1.5 rounded-full bg-[#0D0D0D]/80 backdrop-blur-md border border-[#A58CF4]/25 text-[#FAFAFA] text-[12px] flex items-center gap-2">
              <Sparkles size={13} className="text-[#A58CF4]" />
              <span>Michelangelo reinterpretation: Empathy connecting mortal memory & machine</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
