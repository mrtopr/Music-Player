import { motion, useAnimation } from "motion/react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");



const HeartIcon = forwardRef(
  ({ onMouseEnter, onMouseLeave, className, size = 28, fill = "none", color, stroke, strokeWidth = 2, style, ...props }, ref) => {
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

    const resolvedStroke = stroke || color || "currentColor";
    const resolvedFill = fill || "none";

    return (
      <span
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
        {...props}
      >
        <motion.svg
          animate={controls}
          fill={resolvedFill}
          height={size}
          stroke={resolvedStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          transition={{
            duration: 0.45,
            repeat: 2,
          }}
          variants={{
            normal: { scale: 1 },
            animate: { scale: [1, 1.08, 1] },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </motion.svg>
      </span>
    );
  }
);

HeartIcon.displayName = "HeartIcon";

export { HeartIcon };

export default HeartIcon;
