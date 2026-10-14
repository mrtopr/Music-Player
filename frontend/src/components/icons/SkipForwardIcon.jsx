import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const SkipForwardIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
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
        className={cn(
          "cursor-pointer select-none p-0.5 transition-colors duration-200 flex items-center justify-center",
          className
        )}
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
          <motion.polygon
            animate={controls}
            initial="normal"
            points="5 4 15 12 5 20 5 4"
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            variants={{
              normal: { x: 0 },
              animate: { x: [0, 3, 0] },
            }}
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.05 }}
            variants={{
              normal: { opacity: 1, scaleY: 1 },
              animate: { opacity: [1, 0.7, 1], scaleY: [1, 1.15, 1] },
            }}
            x1="19"
            x2="19"
            y1="5"
            y2="19"
          />
        </svg>
      </div>
    );
  }
);

SkipForwardIcon.displayName = "SkipForwardIcon";
export { SkipForwardIcon };
export default SkipForwardIcon;
