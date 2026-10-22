"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, Heart, Volume2, ShieldCheck, RotateCw } from "lucide-react";

export default function Avatar3D() {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 440;
    const height = container.clientHeight || 480;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.05, 3.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Root Avatar Group (drags to rotate)
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, -0.32, 0);
    scene.add(avatarGroup);

    // Head Group (for mouse gaze tracking)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.6, 0);
    avatarGroup.add(headGroup);

    // ==========================================
    // MATERIALS
    // ==========================================
    // 1. Soft White Skin
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xFAFAFA,
      roughness: 0.42,
      metalness: 0.02,
    });

    const innerEarMaterial = new THREE.MeshStandardMaterial({
      color: 0x433075,
      roughness: 0.5,
    });

    // 2. Jet Black Hair
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x0D0D0D,
      roughness: 0.62,
      metalness: 0.04,
    });

    // 3. Deep Purple Hoodie (#433075)
    const hoodieMaterial = new THREE.MeshStandardMaterial({
      color: 0x433075,
      roughness: 0.52,
      metalness: 0.02,
    });

    // 4. Soft White Details (#FAFAFA)
    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xFAFAFA,
      roughness: 0.2,
      metalness: 0.02,
    });

    // 5. Jet Black Pupils (#0D0D0D)
    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x0D0D0D,
      roughness: 0.1,
      metalness: 0.2,
    });

    // 6. Deep Purple Smiling Lips (#433075)
    const smileMaterial = new THREE.MeshStandardMaterial({
      color: 0x433075,
      roughness: 0.35,
    });

    // 7. Lavender Accents (#A58CF4)
    const blushMaterial = new THREE.MeshBasicMaterial({
      color: 0xA58CF4,
      transparent: true,
      opacity: 0.35,
    });

    // ==========================================
    // 1. HEAD & EARS
    // ==========================================
    // Head Sphere - softly proportioned oval
    const headGeo = new THREE.SphereGeometry(0.5, 64, 64);
    headGeo.scale(0.96, 1.05, 0.98);
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headGroup.add(headMesh);

    // Ears (Prominent cute cartoon ears matching reference)
    const earGeo = new THREE.SphereGeometry(0.15, 32, 32);
    earGeo.scale(0.38, 1.15, 0.85);

    const leftEar = new THREE.Mesh(earGeo, skinMaterial);
    leftEar.position.set(-0.51, 0.03, -0.04);
    leftEar.rotation.set(0, 0.25, 0.12);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMaterial);
    rightEar.position.set(0.51, 0.03, -0.04);
    rightEar.rotation.set(0, -0.25, -0.12);
    headGroup.add(rightEar);

    // Inner Ear shading
    const innerEarGeo = new THREE.SphereGeometry(0.08, 16, 16);
    innerEarGeo.scale(0.3, 0.9, 0.7);
    const leftInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    leftInnerEar.position.set(-0.5, 0.03, -0.02);
    headGroup.add(leftInnerEar);

    const rightInnerEar = new THREE.Mesh(innerEarGeo, innerEarMaterial);
    rightInnerEar.position.set(0.5, 0.03, -0.02);
    headGroup.add(rightInnerEar);

    // Cute Rounded Nose
    const noseGeo = new THREE.SphereGeometry(0.058, 32, 32);
    noseGeo.scale(0.85, 0.85, 1.15);
    const noseMesh = new THREE.Mesh(noseGeo, skinMaterial);
    noseMesh.position.set(0, -0.015, 0.505);
    headGroup.add(noseMesh);

    // ==========================================
    // 2. EYES & GAZE
    // ==========================================
    const eyesGroup = new THREE.Group();
    headGroup.add(eyesGroup);

    // Sclera (White of Eyes)
    const scleraGeo = new THREE.SphereGeometry(0.12, 32, 32);
    scleraGeo.scale(0.92, 1.1, 0.75);

    const leftSclera = new THREE.Mesh(scleraGeo, whiteMaterial);
    leftSclera.position.set(-0.165, 0.14, 0.44);
    eyesGroup.add(leftSclera);

    const rightSclera = new THREE.Mesh(scleraGeo, whiteMaterial);
    rightSclera.position.set(0.165, 0.14, 0.44);
    eyesGroup.add(rightSclera);

    // Pupils Group (Tracks cursor dynamically)
    const pupilsGroup = new THREE.Group();
    eyesGroup.add(pupilsGroup);

    const pupilGeo = new THREE.SphereGeometry(0.065, 32, 32);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    leftPupil.position.set(-0.165, 0.14, 0.525);
    pupilsGroup.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
    rightPupil.position.set(0.165, 0.14, 0.525);
    pupilsGroup.add(rightPupil);

    // Catchlight Sparkles (Pixar/Disney sparkle in eyes)
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    // Left main & sub highlight
    const leftHigh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), sparkMat);
    leftHigh.position.set(-0.145, 0.165, 0.575);
    pupilsGroup.add(leftHigh);
    const leftSubHigh = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 16), sparkMat);
    leftSubHigh.position.set(-0.18, 0.12, 0.575);
    pupilsGroup.add(leftSubHigh);

    // Right main & sub highlight
    const rightHigh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 16), sparkMat);
    rightHigh.position.set(0.185, 0.165, 0.575);
    pupilsGroup.add(rightHigh);
    const rightSubHigh = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 16), sparkMat);
    rightSubHigh.position.set(0.15, 0.12, 0.575);
    pupilsGroup.add(rightSubHigh);

    // Friendly Arched Eyebrows (Lifted, Warm & Happy)
    const browGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.20, 16);
    browGeo.scale(1, 1, 0.7);

    const leftBrow = new THREE.Mesh(browGeo, hairMaterial);
    leftBrow.position.set(-0.165, 0.275, 0.485);
    leftBrow.rotation.set(0.12, 0.06, 1.48); // Gentle lifted arch
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, hairMaterial);
    rightBrow.position.set(0.165, 0.275, 0.485);
    rightBrow.rotation.set(0.12, -0.06, -1.48);
    headGroup.add(rightBrow);

    // ==========================================
    // 3. HAPPY SMILE & CHEEKS
    // ==========================================
    // Smile Arc (Smooth curved upward smile)
    const smileGeo = new THREE.TorusGeometry(0.085, 0.018, 16, 32, Math.PI);
    const smileMesh = new THREE.Mesh(smileGeo, smileMaterial);
    smileMesh.position.set(0, -0.14, 0.495);
    smileMesh.rotation.set(-0.06, 0, Math.PI); // Upward happy smiling arc
    headGroup.add(smileMesh);

    // Cheek Blush Discs
    const blushGeo = new THREE.CircleGeometry(0.07, 32);
    const leftBlush = new THREE.Mesh(blushGeo, blushMaterial);
    leftBlush.position.set(-0.30, -0.05, 0.44);
    leftBlush.rotation.set(0, -0.52, 0);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMaterial);
    rightBlush.position.set(0.30, -0.05, 0.44);
    rightBlush.rotation.set(0, 0.52, 0);
    headGroup.add(rightBlush);

    // ==========================================
    // 4. SCULPTED TEXTURED HAIR (Wavy Pompadour)
    // ==========================================
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);

    // Base Hair Helmet
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.51, 32, 32), hairMaterial);
    hairCap.position.set(0, 0.09, -0.05);
    hairCap.scale.set(1.0, 1.05, 1.02);
    hairGroup.add(hairCap);

    // Volumetric Stylized Hair Swooshes (Flowing chestnut hair)
    const hairClusters = [
      // Top crown volume
      { pos: [0, 0.52, 0.08], scale: [0.38, 0.24, 0.32], rot: [0.2, 0, 0] },
      { pos: [-0.16, 0.50, 0.06], scale: [0.32, 0.22, 0.28], rot: [0.1, 0.3, 0.1] },
      { pos: [0.16, 0.50, 0.06], scale: [0.32, 0.22, 0.28], rot: [0.1, -0.3, -0.1] },
      { pos: [0, 0.56, -0.08], scale: [0.36, 0.22, 0.34], rot: [-0.1, 0, 0] },
      // Front swept fringe locks (flowing left-to-right like the photo)
      { pos: [-0.08, 0.44, 0.34], scale: [0.26, 0.18, 0.22], rot: [0.3, 0.4, 0.2] },
      { pos: [0.12, 0.43, 0.32], scale: [0.24, 0.17, 0.22], rot: [0.2, -0.3, -0.15] },
      { pos: [-0.20, 0.40, 0.28], scale: [0.22, 0.16, 0.20], rot: [0.2, 0.5, 0.15] },
      { pos: [0.20, 0.40, 0.28], scale: [0.22, 0.16, 0.20], rot: [0.2, -0.5, -0.15] },
      { pos: [0, 0.47, 0.25], scale: [0.28, 0.20, 0.24], rot: [0.3, 0, 0] },
      // Soft sleek sides (neatly framing temples)
      { pos: [-0.38, 0.26, 0.04], scale: [0.15, 0.22, 0.24], rot: [0, 0, 0.1] },
      { pos: [0.38, 0.26, 0.04], scale: [0.15, 0.22, 0.24], rot: [0, 0, -0.1] },
    ];

    hairClusters.forEach((c) => {
      const geo = new THREE.SphereGeometry(1, 24, 24);
      geo.scale(c.scale[0], c.scale[1], c.scale[2]);
      const mesh = new THREE.Mesh(geo, hairMaterial);
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2]);
      mesh.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
      hairGroup.add(mesh);
    });

    // ==========================================
    // 5. BODY & LIME-GREEN HOODIE
    // ==========================================
    // Neck
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.26, 32), skinMaterial);
    neckMesh.position.set(0, 0.28, 0);
    avatarGroup.add(neckMesh);

    // Inner White Undershirt Collar
    const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 16, 32), whiteMaterial);
    collarMesh.position.set(0, 0.22, 0);
    collarMesh.rotation.set(Math.PI / 2, 0, 0);
    avatarGroup.add(collarMesh);

    // Thick Rolled Hoodie Rim (Framing neck)
    const hoodRoll = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 24, 48), hoodieMaterial);
    hoodRoll.position.set(0, 0.18, -0.02);
    hoodRoll.rotation.set(1.35, 0, 0);
    avatarGroup.add(hoodRoll);

    // Soft Rounded Torso
    const torsoGeo = new THREE.CylinderGeometry(0.44, 0.48, 0.82, 32);
    torsoGeo.scale(1, 1, 0.72);
    const torsoMesh = new THREE.Mesh(torsoGeo, hoodieMaterial);
    torsoMesh.position.set(0, -0.28, 0);
    avatarGroup.add(torsoMesh);

    // Natural Rounded Shoulders
    const shoulderGeo = new THREE.SphereGeometry(0.22, 32, 32);
    const leftShoulder = new THREE.Mesh(shoulderGeo, hoodieMaterial);
    leftShoulder.position.set(-0.46, 0.02, 0);
    const rightShoulder = new THREE.Mesh(shoulderGeo, hoodieMaterial);
    rightShoulder.position.set(0.46, 0.02, 0);
    avatarGroup.add(leftShoulder);
    avatarGroup.add(rightShoulder);

    // Upper Arms (Angled slightly down and out from shoulders)
    const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.34, 32);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, hoodieMaterial);
    leftUpperArm.position.set(-0.52, -0.12, 0.06);
    leftUpperArm.rotation.set(0.35, 0.1, 0.32);
    avatarGroup.add(leftUpperArm);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, hoodieMaterial);
    rightUpperArm.position.set(0.52, -0.12, 0.06);
    rightUpperArm.rotation.set(0.35, -0.1, -0.32);
    avatarGroup.add(rightUpperArm);

    // Elbows
    const elbowGeo = new THREE.SphereGeometry(0.12, 24, 24);
    const leftElbow = new THREE.Mesh(elbowGeo, hoodieMaterial);
    leftElbow.position.set(-0.60, -0.26, 0.16);
    avatarGroup.add(leftElbow);
    const rightElbow = new THREE.Mesh(elbowGeo, hoodieMaterial);
    rightElbow.position.set(0.60, -0.26, 0.16);
    avatarGroup.add(rightElbow);

    // Forearms (Angling forward and up with welcoming shrug)
    const foreArmGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.32, 32);
    const leftForeArm = new THREE.Mesh(foreArmGeo, hoodieMaterial);
    leftForeArm.position.set(-0.56, -0.29, 0.30);
    leftForeArm.rotation.set(1.15, 0.25, 0.35);
    avatarGroup.add(leftForeArm);

    const rightForeArm = new THREE.Mesh(foreArmGeo, hoodieMaterial);
    rightForeArm.position.set(0.56, -0.29, 0.30);
    rightForeArm.rotation.set(1.15, -0.25, -0.35);
    avatarGroup.add(rightForeArm);

    // White Sleeve Cuffs at Wrists
    const cuffGeo = new THREE.TorusGeometry(0.095, 0.026, 16, 32);
    const leftCuff = new THREE.Mesh(cuffGeo, whiteMaterial);
    leftCuff.position.set(-0.52, -0.32, 0.44);
    leftCuff.rotation.set(1.15, 0, 0);
    avatarGroup.add(leftCuff);

    const rightCuff = new THREE.Mesh(cuffGeo, whiteMaterial);
    rightCuff.position.set(0.52, -0.32, 0.44);
    rightCuff.rotation.set(1.15, 0, 0);
    avatarGroup.add(rightCuff);

    // Open Shrugging Palms (Friendly palms facing up)
    const palmGeo = new THREE.SphereGeometry(0.095, 24, 24);
    palmGeo.scale(1.25, 0.4, 1.35);

    const leftHand = new THREE.Mesh(palmGeo, skinMaterial);
    leftHand.position.set(-0.50, -0.33, 0.52);
    leftHand.rotation.set(-0.25, 0.35, 0.2);
    avatarGroup.add(leftHand);

    const rightHand = new THREE.Mesh(palmGeo, skinMaterial);
    rightHand.position.set(0.50, -0.33, 0.52);
    rightHand.rotation.set(-0.25, -0.35, -0.2);
    avatarGroup.add(rightHand);

    // White Hoodie Drawstrings
    const stringGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.36, 16);
    const leftString = new THREE.Mesh(stringGeo, whiteMaterial);
    leftString.position.set(-0.085, 0.01, 0.33);
    leftString.rotation.set(0.08, 0, 0.06);
    avatarGroup.add(leftString);

    const rightString = new THREE.Mesh(stringGeo, whiteMaterial);
    rightString.position.set(0.085, 0.01, 0.33);
    rightString.rotation.set(0.08, 0, -0.06);
    avatarGroup.add(rightString);

    // ==========================================
    // 6. CINEMATIC STUDIO LIGHTING
    // ==========================================
    // Key Light: Warm Pixar Character Light
    // Lighting: Key Light (Soft White)
    const keyLight = new THREE.DirectionalLight(0xFAFAFA, 2.4);
    keyLight.position.set(3.5, 4, 4.5);
    scene.add(keyLight);

    // Fill Light: Deep Purple Tint (#433075)
    const fillLight = new THREE.DirectionalLight(0x433075, 1.8);
    fillLight.position.set(-3.5, 1.5, 3);
    scene.add(fillLight);

    // Rim Light: Lavender Backlight (#A58CF4)
    const rimLight = new THREE.DirectionalLight(0xA58CF4, 2.4);
    rimLight.position.set(0, 3, -3.5);
    scene.add(rimLight);

    // Ambient Soft White Light
    const ambientLight = new THREE.AmbientLight(0xFAFAFA, 0.85);
    scene.add(ambientLight);

    // Floating Memory Sparks
    const sparkCount = 38;
    const sparkGeometry = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 2.6;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 2.2;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparksMaterial = new THREE.PointsMaterial({
      size: 0.032,
      color: 0xA58CF4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const sparks = new THREE.Points(sparkGeometry, sparksMaterial);
    scene.add(sparks);

    // ==========================================
    // 7. INTERACTIVE MOUSE TRACKING & ROTATION
    // ==========================================
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = normX;
      mouse.targetY = normY;

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        avatarGroup.rotation.y += deltaX * 0.008;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        mouse.targetX = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        mouse.targetY = -(((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("touchmove", onTouchMove, { passive: true });

    // Handle Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth Lerp for Cursor Gaze Tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.07;
      mouse.y += (mouse.targetY - mouse.y) * 0.07;

      // Head turns gently to follow cursor
      headGroup.rotation.y = mouse.x * 0.32;
      headGroup.rotation.x = -mouse.y * 0.18;

      // Pupils look directly at cursor
      leftPupil.position.x = -0.165 + mouse.x * 0.022;
      leftPupil.position.y = 0.14 + mouse.y * 0.022;
      rightPupil.position.x = 0.165 + mouse.x * 0.022;
      rightPupil.position.y = 0.14 + mouse.y * 0.022;

      leftHigh.position.x = leftPupil.position.x + 0.02;
      leftHigh.position.y = leftPupil.position.y + 0.025;
      rightHigh.position.x = rightPupil.position.x + 0.02;
      rightHigh.position.y = rightPupil.position.y + 0.025;

      leftSubHigh.position.x = leftPupil.position.x - 0.015;
      leftSubHigh.position.y = leftPupil.position.y - 0.02;
      rightSubHigh.position.x = rightPupil.position.x - 0.015;
      rightSubHigh.position.y = rightPupil.position.y - 0.02;

      // Natural Occasional Eye Blinking
      const blinkCycle = elapsed % 4.0;
      let eyeScaleY = 1;
      if (blinkCycle > 3.85) {
        eyeScaleY = Math.max(0.08, Math.sin(((blinkCycle - 3.85) / 0.15) * Math.PI));
      }
      eyesGroup.scale.y = eyeScaleY;

      // Torso Breathing Expansion
      const breath = Math.sin(elapsed * 1.8);
      torsoMesh.scale.x = 1 + breath * 0.015;
      torsoMesh.scale.z = 0.72 + breath * 0.012;
      headGroup.position.y = 0.6 + breath * 0.008;

      // Gentle Floating Bobbing
      avatarGroup.position.y = -0.32 + Math.sin(elapsed * 1.2) * 0.035;

      // Memory Sparks Slow Orbit
      sparks.rotation.y = elapsed * 0.07;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("touchmove", onTouchMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full flex justify-center items-center relative select-none">
      {/* Soft Ambient Violet Glow */}
      <div className="absolute w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#433075]/40 via-[#A58CF4]/25 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* 3D Character Card Frame */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-full max-w-[420px] rounded-[36px] bg-[#0D0D0D]/90 backdrop-blur-xl p-4 sm:p-5 border border-[#A58CF4]/25 shadow-[0_24px_70px_rgba(13,13,13,0.7)] relative flex flex-col items-center group transition-all duration-300 hover:border-[#A58CF4]/45"
      >
        {/* Top Status Pill */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#433075]/30 backdrop-blur-md border border-[#A58CF4]/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-pulse" />
            <span className="text-[11.5px] font-medium text-[#FAFAFA]">3D Companion Active</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#433075]/20 text-[11px] text-[#A58CF4] border border-[#A58CF4]/20">
            <Sparkles size={11} className="text-[#A58CF4]" />
            <span>Interactive Three.js</span>
          </div>
        </div>

        {/* 3D WebGL Canvas Container */}
        <div className="w-full h-[400px] sm:h-[440px] rounded-[28px] overflow-hidden relative shadow-inner bg-gradient-to-b from-[#433075]/25 to-[#0D0D0D] flex items-center justify-center cursor-grab active:cursor-grabbing border border-[#A58CF4]/20">
          <div ref={mountRef} className="w-full h-full relative z-10" />

          {/* Micro Interaction Hint */}
          <div
            className={`absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0D0D0D]/80 backdrop-blur-md border border-[#A58CF4]/25 text-[11px] text-[#FAFAFA] pointer-events-none transition-opacity duration-300 z-20 ${
              isHovered ? "opacity-100" : "opacity-45"
            }`}
          >
            <RotateCw size={11} className="animate-spin text-[#A58CF4]" style={{ animationDuration: "6s" }} />
            <span>Gaze tracks mouse • Drag to rotate 3D</span>
          </div>
        </div>

        {/* Floating Dialogue Memory Bubble */}
        <div className="w-full mt-3 p-3.5 rounded-2xl bg-[#0D0D0D]/85 backdrop-blur-md border border-[#A58CF4]/25 text-[#FAFAFA] shadow-md">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-[#433075] border border-[#A58CF4]/30 text-[#A58CF4] flex items-center justify-center shrink-0 mt-0.5">
              <Heart size={12} className="text-[#A58CF4]" />
            </div>
            <div>
              <p className="text-[12px] leading-[1.4] text-[#FAFAFA] font-medium">
                &ldquo;I remember your favorite stories... what would you like to reflect on together today?&rdquo;
              </p>
              <span className="text-[10px] text-[rgba(250,250,250,0.6)] mt-1 block">
                Anchored in authentic memories • Voice ready • Grounded RAG
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="w-full mt-2.5 px-2 flex items-center justify-between text-[11px] text-[rgba(250,250,250,0.7)]">
          <span className="flex items-center gap-1">
            <Volume2 size={12} className="text-[#A58CF4]" /> Natural Voice
          </span>
          <span className="text-[#A58CF4]/30">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-[#A58CF4]" /> Anti-Hallucination
          </span>
          <span className="text-[#A58CF4]/30">•</span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-[#A58CF4]" /> Real-time 3D
          </span>
        </div>
      </div>
    </div>
  );
}
