import React, { useEffect, useRef, useState } from "react";

/**
 * BackgroundAnimation — Mesh-gradient / fluid background animation
 * inspired by AxioTune and modern music player references.
 * Uses CSS mesh gradients + animated blobs for a premium, lively feel.
 */
export default function BackgroundAnimation() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div className="bg-animation" style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden" }}>
      {/* Base dark gradient */}
      <div
        className="bg-base"
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #070A08 0%, #0E1712 50%, #08110B 100%)",
        }}
      />

      {/* Animated mesh blobs that follow mouse gently */}
      <div className="bg-blob blob-1" style={{ left: `${20 + mouse.x * 30}%`, top: `${20 + mouse.y * 30}%` }} />
      <div className="bg-blob blob-2" style={{ left: `${60 - mouse.x * 20}%`, top: `${60 - mouse.y * 20}%` }} />
      <div className="bg-blob blob-3" style={{ left: `${40 + mouse.x * 10}%`, top: `${80 - mouse.y * 10}%` }} />
      <div className="bg-blob blob-4" style={{ left: `${80 - mouse.x * 30}%`, top: `${30 + mouse.y * 20}%` }} />
      <div className="bg-blob blob-5" style={{ left: `${10 + mouse.x * 15}%`, top: `${50 - mouse.y * 15}%` }} />

      {/* Subtle grain texture */}
      <div className="bg-grain" style={{ position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none" }} />

      <style>{`
        @keyframes mesh-move {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          33% { transform: translate(20px, -30px) scale(1.1); opacity: 0.8; }
          66% { transform: translate(-20px, 30px) scale(0.9); opacity: 0.5; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        }

        .bg-blob {
          position: absolute;
          width: clamp(300px, 40vw, 600px);
          height: clamp(300px, 40vw, 600px);
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          z-index: 0;
          animation: mesh-move 12s ease-in-out infinite;
          pointer-events: none;
        }

        .blob-1 { background: rgba(16, 185, 129, 0.32); animation-delay: 0s; }
        .blob-2 { background: rgba(5, 150, 105, 0.22); animation-delay: -4s; }
        .blob-3 { background: rgba(52, 211, 153, 0.22); animation-delay: -8s; }
        .blob-4 { background: rgba(16, 185, 129, 0.24); animation-delay: -2s; }
        .blob-5 { background: rgba(4, 120, 87, 0.20); animation-delay: -6s; }

        .bg-grain {
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .bg-blob { animation: none; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
