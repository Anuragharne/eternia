"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, MessageCircle, Volume2, ShieldCheck, Heart } from "lucide-react";

export default function AvatarHero() {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Subtle tilt: max 6 degrees
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className="w-full flex justify-center items-center relative select-none">
      {/* Ambient background glow */}
      <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-[#433075]/40 via-[#A58CF4]/25 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Interactive 3D Avatar Card */}
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
        }}
        className="w-full max-w-[420px] rounded-[36px] bg-[#0D0D0D] p-4 sm:p-5 border border-[#A58CF4]/25 shadow-[0_24px_70px_rgba(13,13,13,0.7)] relative flex flex-col items-center"
      >
        {/* Top Status Pill */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#433075]/30 backdrop-blur-md border border-[#A58CF4]/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#A58CF4] animate-pulse" />
            <span className="text-[11.5px] font-medium text-[#FAFAFA]">Companion Active</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#433075]/20 text-[11px] text-[#A58CF4] border border-[#A58CF4]/20">
            <Sparkles size={11} className="text-[#A58CF4]" />
            <span>3D Interactive</span>
          </div>
        </div>

        {/* 3D Character Display Container */}
        <div className="w-full h-[400px] sm:h-[450px] rounded-[28px] overflow-hidden relative shadow-inner bg-gradient-to-b from-[#433075]/25 to-[#0D0D0D] flex items-center justify-center">
          <img
            src="/images/neural_avatar.jpg"
            alt="Living AI neural companion avatar"
            className="w-full h-full object-cover object-center filter contrast-[1.02] transition-transform duration-700 ease-out hover:scale-105"
          />

          {/* Floating Memory Dialogue Bubble */}
          <div className="absolute bottom-4 inset-x-4 p-3.5 rounded-2xl bg-[#0D0D0D]/85 backdrop-blur-md border border-[#A58CF4]/25 shadow-md">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#433075] text-[#FAFAFA] flex items-center justify-center shrink-0 mt-0.5">
                <Heart size={12} className="text-[#A58CF4]" />
              </div>
              <div>
                <p className="text-[12px] leading-[1.4] text-[#FAFAFA] font-medium">
                  &ldquo;I remember your favorite summer stories... what would you like to reflect on today?&rdquo;
                </p>
                <span className="text-[10px] text-[rgba(250,250,250,0.6)] mt-1 block">
                  Anchored in authentic family memories • Voice ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="w-full mt-3 px-2 flex items-center justify-between text-[11px] text-[rgba(250,250,250,0.7)]">
          <span className="flex items-center gap-1">
            <Volume2 size={12} className="text-[#A58CF4]" /> Natural Voice
          </span>
          <span className="text-[#A58CF4]/30">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-[#A58CF4]" /> Grounded RAG
          </span>
          <span className="text-[#A58CF4]/30">•</span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-[#A58CF4]" /> Memory Empathy
          </span>
        </div>

      </div>
    </div>
  );
}
