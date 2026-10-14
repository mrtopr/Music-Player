import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const ShuffleIcon = forwardRef(
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
          <motion.path
            animate={controls}
            initial="normal"
            variants={{
              normal: { pathLength: 1, opacity: 1, x: 0 },
              animate: { x: [0, 2, 0], transition: { duration: 0.4 } },
            }}
            d="m18 14 4 4-4 4"
          />
          <motion.path
            animate={controls}
            initial="normal"
            variants={{
              normal: { pathLength: 1, opacity: 1, x: 0 },
              animate: { x: [0, 2, 0], transition: { duration: 0.4 } },
            }}
            d="m18 2 4 4-4 4"
          />
          <motion.path
            animate={controls}
            initial="normal"
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0.6, 1],
                transition: { duration: 0.5, ease: "easeInOut" },
              },
            }}
            d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"
          />
          <motion.path
            animate={controls}
            initial="normal"
            variants={{
              normal: { opacity: 1 },
              animate: { opacity: [0.4, 1], transition: { duration: 0.4 } },
            }}
            d="m2 6h1.4c1.3 0 2.5.6 3.3 1.7l1.4 2"
          />
          <motion.path
            animate={controls}
            initial="normal"
            variants={{
              normal: { opacity: 1 },
              animate: { opacity: [0.4, 1], transition: { duration: 0.4 } },
            }}
            d="m14.5 14.3 1.4 2c.8 1.1 2 1.7 3.3 1.7H22"
          />
        </svg>
      </div>
    );
  }
);

ShuffleIcon.displayName = "ShuffleIcon";
export { ShuffleIcon };
export default ShuffleIcon;
