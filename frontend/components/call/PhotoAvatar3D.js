"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Mic, Volume2 } from "lucide-react";

/**
 * PhotoAvatar3D Component
 *
 * Transforms a 2D portrait photo into an interactive 3D Depth Avatar using Three.js WebGL:
 * - Curved 3D plane mesh with vertex-level depth curvature
 * - Real-time cursor gaze tracking & 3D parallax tilt
 * - Cinematic 3-point studio lighting with interactive specular highlights
 * - Natural 3D idle breathing & floating
 * - Audio-reactive mouth displacement / talking articulation when isSpeaking is active
 */
export default function PhotoAvatar3D({
  photoUrl,
  isSpeaking = false,
  audioLevel = 0.5,
  avatarName = "Companion",
  className = "",
}) {
  const mountRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // References for animation loop access without re-triggering effects
  const isSpeakingRef = useRef(isSpeaking);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !photoUrl) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl", { powerPreference: "high-performance" }) ||
        testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    // Dimensions
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 560;

    // Three.js Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Root 3D Group
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Studio Lighting Rig
    // 1. Base Ambient Light (Deep Eternia Purple)
    const ambientLight = new THREE.AmbientLight(0x433075, 1.2);
    scene.add(ambientLight);

    // 2. Key Directional Light (Soft White)
    const keyLight = new THREE.DirectionalLight(0xfafafa, 1.8);
    keyLight.position.set(2.5, 3.0, 3.5);
    scene.add(keyLight);

    // 3. Rim / Accent Light (Lavender #A58CF4)
    const rimLight = new THREE.DirectionalLight(0xa58cf4, 2.2);
    rimLight.position.set(-2.5, 2.0, -1.5);
    scene.add(rimLight);

    // 4. Moving Cursor Point Light for dynamic specular sheen
    const cursorPointLight = new THREE.PointLight(0xa58cf4, 2.0, 5.0);
    cursorPointLight.position.set(0, 0, 2.0);
    scene.add(cursorPointLight);

    // Background Depth Ring Halo
    const ringGeo = new THREE.RingGeometry(1.6, 1.63, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa58cf4,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const haloRing = new THREE.Mesh(ringGeo, ringMat);
    haloRing.position.set(0, 0, -0.2);
    avatarGroup.add(haloRing);

    // Ambient floating particles
    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 3.2;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.035,
      color: 0xa58cf4,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    avatarGroup.add(particles);

    // 3D Portrait Mesh creation
    let portraitMesh = null;
    let basePositions = null;
    let mouthVertexIndices = [];

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    textureLoader.load(
      photoUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;

        // Determine aspect ratio from image
        const img = texture.image;
        const aspect = img ? img.width / img.height : 0.75;
        const meshWidth = 2.2;
        const meshHeight = meshWidth / aspect;

        // Subdivided 3D plane for vertex-level depth curvature & mouth animation
        const segmentsX = 64;
        const segmentsY = 64;
        const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight, segmentsX, segmentsY);

        // Curve the plane into a 3D convex face bust
        const posAttr = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        basePositions = new Float32Array(posAttr.count * 3);

        for (let i = 0; i < posAttr.count; i++) {
          vertex.fromBufferAttribute(posAttr, i);

          // 3D Depth Curvature: push edges back, push center forward
          const normX = vertex.x / (meshWidth * 0.5); // -1 to 1
          const normY = vertex.y / (meshHeight * 0.5); // -1 to 1
          const distSq = normX * normX + normY * normY * 0.6;
          const depthZ = Math.max(-0.45, (1.0 - Math.min(1.0, distSq)) * 0.28);

          vertex.z = depthZ;
          posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);

          basePositions[i * 3] = vertex.x;
          basePositions[i * 3 + 1] = vertex.y;
          basePositions[i * 3 + 2] = vertex.z;

          // Identify mouth / jaw area for audio-reactive articulation
          // Mouth is typically in lower-middle vertical section (y roughly -0.15 to -0.65 of height)
          const relY = vertex.y / (meshHeight * 0.5);
          const relX = vertex.x / (meshWidth * 0.5);
          if (relY > -0.65 && relY < -0.15 && Math.abs(relX) < 0.35) {
            mouthVertexIndices.push(i);
          }
        }

        geometry.computeVertexNormals();

        // Premium Physical Material with Clearcoat and Specular sheen
        const material = new THREE.MeshPhysicalMaterial({
          map: texture,
          roughness: 0.28,
          metalness: 0.05,
          clearcoat: 0.6,
          clearcoatRoughness: 0.15,
          reflectivity: 0.5,
          side: THREE.FrontSide,
        });

        portraitMesh = new THREE.Mesh(geometry, material);
        portraitMesh.position.set(0, 0, 0);
        avatarGroup.add(portraitMesh);

        setIsLoaded(true);
        setLoadError(false);
      },
      undefined,
      (err) => {
        console.warn("Failed to load 3D avatar texture:", err);
        setLoadError(true);
      }
    );

    // Mouse Tracking for Interactive 3D Parallax Tilt
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouse.targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.targetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        mouse.targetX = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        mouse.targetY = -(((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Window Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Render Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth lerp for mouse gaze tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      // 3D Parallax Rotation: avatar follows user gaze
      avatarGroup.rotation.y = mouse.x * 0.28;
      avatarGroup.rotation.x = -mouse.y * 0.16;

      // Cursor light coordinates in 3D space
      cursorPointLight.position.x = mouse.x * 2.2;
      cursorPointLight.position.y = mouse.y * 2.2;

      // 3D Idle Breathing & Floating Bobbing
      const breath = 1.0 + Math.sin(elapsed * 1.8) * 0.012;
      const floatY = Math.sin(elapsed * 1.2) * 0.03;
      avatarGroup.position.y = floatY;
      avatarGroup.scale.set(breath, breath, 1.0);

      // Rotating halo ring
      haloRing.rotation.z = elapsed * 0.12;

      // Floating particles orbit
      particles.rotation.y = elapsed * 0.05;

      // Audio-Reactive Mouth Articulation when speaking
      if (portraitMesh && basePositions && mouthVertexIndices.length > 0) {
        const posAttr = portraitMesh.geometry.attributes.position;
        const speaking = isSpeakingRef.current;
        const level = audioLevelRef.current || 0.6;

        if (speaking) {
          // Dynamic jaw/lip displacement wave
          const speechPulse = Math.sin(elapsed * 16.0) * Math.sin(elapsed * 22.0);
          const jawDisplacement = Math.max(0, speechPulse) * level * 0.045;

          for (let idx of mouthVertexIndices) {
            const baseX = basePositions[idx * 3];
            const baseY = basePositions[idx * 3 + 1];
            const baseZ = basePositions[idx * 3 + 2];

            // Open/displace mouth downwards and slightly forward
            posAttr.setXYZ(
              idx,
              baseX,
              baseY - jawDisplacement,
              baseZ + jawDisplacement * 0.5
            );
          }
          posAttr.needsUpdate = true;
          portraitMesh.geometry.computeVertexNormals();
        } else {
          // Smoothly reset mouth to rest shape if displaced
          let needsReset = false;
          for (let idx of mouthVertexIndices) {
            const curY = posAttr.getY(idx);
            const baseY = basePositions[idx * 3 + 1];
            if (Math.abs(curY - baseY) > 0.001) {
              posAttr.setXYZ(
                idx,
                basePositions[idx * 3],
                basePositions[idx * 3 + 1],
                basePositions[idx * 3 + 2]
              );
              needsReset = true;
            }
          }
          if (needsReset) {
            posAttr.needsUpdate = true;
            portraitMesh.geometry.computeVertexNormals();
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("touchmove", handleTouchMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [photoUrl]);

  // Graceful fallback for non-WebGL devices or loading error
  if (!hasWebGL || loadError) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center p-4 ${className}`}>
        <img
          src={photoUrl}
          alt={avatarName}
          className={`w-full max-w-[380px] h-auto object-cover rounded-3xl shadow-2xl transition-transform duration-300 ${
            isSpeaking ? "scale-105" : "scale-100"
          }`}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Dynamic Ambient Background Glow in Eternia Purple & Lavender */}
      <div
        className="absolute w-[420px] h-[420px] sm:w-[480px] sm:h-[480px] rounded-full pointer-events-none -z-10 blur-3xl opacity-80"
        style={{
          background: isSpeaking
            ? "radial-gradient(circle, rgba(165, 140, 244, 0.45) 0%, rgba(67, 48, 117, 0.75) 45%, transparent 70%)"
            : "radial-gradient(circle, rgba(67, 48, 117, 0.85) 0%, rgba(165, 140, 244, 0.25) 45%, transparent 70%)",
          transition: "background 0.5s ease",
        }}
      />

      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full min-h-[460px] flex items-center justify-center" />


      {/* Speaking Soundwave Pill */}
      {isSpeaking && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#433075]/80 backdrop-blur-md border border-[#A58CF4]/40 text-[#FAFAFA] shadow-xl pointer-events-none animate-bounce">
          <Volume2 size={13} className="text-[#A58CF4] animate-pulse" />
          <span className="text-[11px] font-medium tracking-wide">{avatarName} is speaking...</span>
        </div>
      )}
    </div>
  );
}
