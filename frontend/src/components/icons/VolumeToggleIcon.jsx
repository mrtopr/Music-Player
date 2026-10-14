import React, { forwardRef } from "react";
import LordIcon from "../common/LordIcon";

const VolumeToggleIcon = forwardRef(
  ({ isMuted, className, size = 28, style = {}, ...props }, ref) => {
    return (
      <LordIcon
        ref={ref}
        name={isMuted ? "volume-mute" : "volume-high"}
        size={size}
        trigger="hover"
        className={className}
        style={style}
        {...props}
      />
    );
  }
);

VolumeToggleIcon.displayName = "VolumeToggleIcon";
export { VolumeToggleIcon };

export default VolumeToggleIcon;
