import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const ListMusicIcon = forwardRef(
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
          {/* Note stem and note circle */}
          <motion.g
            animate={controls}
            initial="normal"
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            variants={{
              normal: { y: 0, rotate: 0 },
              animate: { y: [0, -2, 0], rotate: [0, 4, -4, 0] },
            }}
          >
            <path d="M21 15V6" />
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          </motion.g>

          {/* List lines */}
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ duration: 0.3, delay: 0.05 }}
            variants={{
              normal: { x: 0 },
              animate: { x: [0, 2, 0] },
            }}
            x1="12"
            x2="3"
            y1="12"
            y2="12"
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ duration: 0.3, delay: 0.1 }}
            variants={{
              normal: { x: 0 },
              animate: { x: [0, 3, 0] },
            }}
            x1="16"
            x2="3"
            y1="6"
            y2="6"
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={{ duration: 0.3, delay: 0.15 }}
            variants={{
              normal: { x: 0 },
              animate: { x: [0, 1.5, 0] },
            }}
            x1="12"
            x2="3"
            y1="18"
            y2="18"
          />
        </svg>
      </div>
    );
  }
);

ListMusicIcon.displayName = "ListMusicIcon";
export { ListMusicIcon };
export default ListMusicIcon;
