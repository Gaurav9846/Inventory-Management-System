// src/components/ui/NepaliRupeeIcon.jsx
import React from 'react';

export const NepaliRupeeIcon = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '',
  strokeWidth = 2,
  ...props 
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Rs symbol with Nepali styling */}
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fontSize={size * 0.8}
        fontWeight="bold"
        fill={color}
        stroke="none"
        fontFamily="'Noto Sans Devanagari', 'Mangal', 'Arial', sans-serif"
      >
        रु
      </text>
    </svg>
  );
};

export default NepaliRupeeIcon;