import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React from 'react';

export default function Tooltip({ children, content, side = "top" }) {
  if (!content) return children;
  
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content 
            side={side} 
            sideOffset={5} 
            style={{
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 10000
            }}
          >
            {content}
            <TooltipPrimitive.Arrow style={{ fill: 'rgba(20, 20, 20, 0.95)' }} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
