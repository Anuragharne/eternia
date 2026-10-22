"use client";

import React, { useState } from "react";

export default function HeroAvatar() {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Dynamic 3D perspective tilt (smooth range: -10 to +10 degrees)
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="w-full flex justify-center items-center relative select-none py-4 cursor-pointer"
      style={{ perspective: "1200px" }}
    >
      {/* Ambient Multi-Layer Glow Aura in Deep Purple (#433075) & Lavender (#A58CF4) */}
      <div
        className="absolute w-[440px] h-[440px] sm:w-[520px] sm:h-[520px] rounded-full pointer-events-none -z-10 transition-transform duration-700 ease-out"
        style={{
          background: "radial-gradient(circle, rgba(67, 48, 117, 0.55) 0%, rgba(165, 140, 244, 0.22) 45%, transparent 70%)",
          filter: "blur(50px)",
          transform: `translate(${rotate.y * 2.5}px, ${-rotate.x * 2.5}px) scale(${isHovered ? 1.08 : 1})`,
        }}
      />

      {/* Subtle Orbital Halo Ring behind Head */}
      <div
        className="absolute w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-full pointer-events-none -z-10 border border-[#A58CF4]/20 transition-all duration-700 ease-out"
        style={{
          transform: `rotateX(68deg) rotateY(${rotate.y * 1.5}deg) translateZ(-40px) scale(${isHovered ? 1.04 : 0.98})`,
          boxShadow: "0 0 40px rgba(165, 140, 244, 0.15)",
        }}
      />

      {/* 3D Floating Avatar Silhouette */}
      <div
        className="relative flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.03 : 1})`,
          transformStyle: "preserve-3d",
        }}
      >
        <img
          src="/images/neural_avatar_cutout.png"
          alt="Living AI neural presence"
          className="w-full max-w-[380px] sm:max-w-[430px] md:max-w-[460px] h-auto object-contain filter contrast-[1.06] brightness-100 select-none pointer-events-none drop-shadow-[0_25px_50px_rgba(67,48,117,0.45)]"
          style={{
            maskImage: "linear-gradient(to bottom, black 82%, transparent 99%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 82%, transparent 99%)",
          }}
        />
      </div>
    </div>
  );
}
