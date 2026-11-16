import React, { useRef, useState } from "react";

/**
 * Card3D — Premium 3D tilt card with depth, shadow, and hover lift.
 * Inspired by AxioTune / Apple Music 3D card style.
 */
export default function Card3D({ children, className, style, onClick, elevation = 1 }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5; // max 5deg
    const rotateY = ((x - centerX) / centerX) * 5;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const elevationStyles = {
    1: { shadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" },
    2: { shadow: "0 8px 32px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" },
    3: { shadow: "0 12px 48px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)" },
  }[elevation];

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={className}
      style={{
        position: "relative",
        borderRadius: "20px",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        border: elevationStyles.border,
        boxShadow: elevationStyles.shadow,
        transition: "transform 0.1s cubic-bezier(0.23, 1, 0.32, 1)",
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Inner glow on hover */}
      <div
        className="card3d-glow"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 50%)",
          opacity: 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      />
      {children}
      <style>{`
        .card3d-glow { transition: opacity 0.3s ease; }
      `}</style>
    </div>
  );
}
