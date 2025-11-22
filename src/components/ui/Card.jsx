import React from 'react';

export const Card = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 ${className}`}>
    {children}
  </div>
);