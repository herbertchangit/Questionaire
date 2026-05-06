import React from 'react';
import { User } from 'lucide-react';

/**
 * Avatar component - displays profile_picture if available, else gradient initial
 */
function Avatar({ src, name, size = 48, className = '' }) {
  const initial = (name || '').trim().charAt(0).toUpperCase();
  const sizeClasses = `w-[${size}px] h-[${size}px]`;
  const inlineSize = { width: size, height: size, fontSize: Math.max(12, size * 0.4) };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        style={inlineSize}
        className={`rounded-full object-cover bg-zinc-100 ${className}`}
      />
    );
  }

  return (
    <div
      style={inlineSize}
      className={`rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-black ${className}`}
    >
      {initial || <User className="w-1/2 h-1/2" />}
    </div>
  );
}

export default Avatar;
