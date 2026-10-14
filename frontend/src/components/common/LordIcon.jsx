import React, { forwardRef } from 'react';
import AnimatedIcon from '../icons/index';

// Re-export all named icons
export * from '../icons/index';

/**
 * AnimatedIcon / LordIcon Adapter
 * Seamlessly routes all icon calls to the Motion-powered lucide-animated system.
 */
const LordIcon = forwardRef(function LordIcon(
  {
    name = 'play',
    size = 24,
    color,
    primaryColor,
    secondaryColor,
    className = '',
    style = {},
    onClick,
    onMouseEnter,
    onMouseLeave,
    trigger,
    state,
    src,
    colors,
    ...restProps
  },
  ref
) {
  const resolvedColor = color || primaryColor || secondaryColor;

  return (
    <AnimatedIcon
      ref={ref}
      name={name}
      size={size}
      color={resolvedColor}
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...restProps}
    />
  );
});

LordIcon.displayName = 'LordIcon';
export default LordIcon;
