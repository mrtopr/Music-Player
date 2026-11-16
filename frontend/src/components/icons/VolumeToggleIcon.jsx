import React, { forwardRef, useState } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* Canonical Lucide geometry — renders correctly at any size. */
const SPEAKER_PATH =
  "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z";

/**
 * VolumeToggleIcon — correct, dependency-free mute/volume indicator.
 *
 * Levels:
 *   0 (muted or volume 0) → speaker + X
 *   1 (volume <= 0.5)     → speaker + 1 wave
 *   2 (volume > 0.5)      → speaker + 2 waves
 *
 * Animation is pure CSS (waves slide/fade in, X pops in) so it cannot
 * fall back to a wrong glyph the way the old LordIcon mapping did.
 */
const VolumeToggleIcon = forwardRef(
  ({ isMuted, volume = 1, size = 28, className, style = {}, ...props }, ref) => {
    const [hovered, setHovered] = useState(false);

    const level = isMuted || volume <= 0 ? 0 : volume <= 0.5 ? 1 : 2;

    return (
      <span
        ref={ref}
        className={cn("volume-toggle-icon", className)}
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          color: "inherit",
          transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: hovered ? "scale(1.1)" : "scale(1)",
          ...style,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        {...props}
      >
        <style>{`
          @keyframes vti-wave-in {
            from { opacity: 0; transform: translateX(-2px) scale(0.85); }
            to   { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes vti-x-in {
            0%   { opacity: 0; transform: scale(0.4); }
            60%  { opacity: 1; transform: scale(1.15); }
            100% { opacity: 1; transform: scale(1); }
          }
          .vti-wave { transform-origin: 12px 12px; animation: vti-wave-in 0.22s ease-out both; }
          .vti-wave-2 { animation-delay: 0.07s; }
          .vti-x { transform-origin: 16px 12px; animation: vti-x-in 0.22s ease-out both; }
          @media (prefers-reduced-motion: reduce) {
            .vti-wave, .vti-x { animation: none; }
          }
        `}</style>

        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block", overflow: "visible" }}
          focusable="false"
        >
          <path d={SPEAKER_PATH} />

          {/* key forces a remount so the CSS animation replays on state change */}
          {level === 0 ? (
            <g key="muted" className="vti-x">
              <line x1="21" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="21" y2="15" />
            </g>
          ) : (
            <g key={`level-${level}`}>
              <path className="vti-wave" d="M15.5 8.5a5 5 0 0 1 0 7" />
              {level >= 2 && (
                <path
                  className="vti-wave vti-wave-2"
                  d="M18.6 5.6a9 9 0 0 1 0 12.8"
                />
              )}
            </g>
          )}
        </svg>
      </span>
    );
  }
);

VolumeToggleIcon.displayName = "VolumeToggleIcon";
export { VolumeToggleIcon };
export default VolumeToggleIcon;
