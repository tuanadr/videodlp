import React from 'react';

/**
 * VisuallyHidden component hides content visually but keeps it accessible to screen readers
 * This is useful for providing additional context to assistive technologies
 */
const VisuallyHidden = ({ 
  children, 
  as: Component = 'span',
  ...props 
}) => {
  return (
    <Component
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default VisuallyHidden;
