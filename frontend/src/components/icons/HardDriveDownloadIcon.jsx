import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");



const ARROW_VARIANTS = {
  normal: { y: -1 },
  animate: {
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 10,
      mass: 1,
    },
  },
};

const HardDriveDownloadIcon = forwardRef(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const controls = useAnimation();
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;

    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    };
  });

  const handleMouseEnter = useCallback(
    (e) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e);
      } else {
        controls.start("animate");
      }
    },
    [controls, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e);
      } else {
        controls.start("normal");
      }
    },
    [controls, onMouseLeave]
  );

  return (
    <div
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="8" rx="2" width="20" x="2" y="14" />
        <path d="M6 18h.01" />
        <path d="M10 18h.01" />
        <motion.g animate={controls} variants={ARROW_VARIANTS}>
          <path d="M12 2v8" />
          <path d="m16 6-4 4-4-4" />
        </motion.g>
      </svg>
    </div>
  );
});

HardDriveDownloadIcon.displayName = "HardDriveDownloadIcon";

export { HardDriveDownloadIcon };

export default HardDriveDownloadIcon;
