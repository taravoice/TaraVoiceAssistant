
import React from 'react';

interface MediaRendererProps {
  src: string;
  alt: string;
  className?: string;
  videoClassName?: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ 
  src, 
  alt, 
  className = '',
  videoClassName 
}) => {
  if (!src) return null;

  // Check for video extension
  const isVideo = src.toLowerCase().endsWith('.mp4');

  if (isVideo) {
    return (
      <video
        src={src}
        className={videoClassName || className}
        autoPlay
        loop
        muted
        playsInline
        aria-label={alt}
        style={{ objectFit: 'cover' }} // Ensure videos cover area like images
      />
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
    />
  );
};
