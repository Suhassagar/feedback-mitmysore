import { useState, useMemo } from 'react';
import { useDepartmentProfile } from '../../hooks/useDepartmentName';

// Curated enterprise mesh gradients for deterministic fallback avatars
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", // Blue
  "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", // Indigo/Purple
  "linear-gradient(135deg, #059669 0%, #047857 100%)", // Emerald
  "linear-gradient(135deg, #D97706 0%, #B45309 100%)", // Amber
  "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)", // Crimson
  "linear-gradient(135deg, #0891B2 0%, #0E7490 100%)", // Cyan
  "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)", // Royal Violet
  "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)", // Deep Teal
];

function hashString(str) {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function DepartmentAvatar({
  dept_id,
  logo_url: propLogoUrl,
  logo_lqip: propLogoLqip,
  brand_color: propBrandColor,
  size = 40,
  showRing = true,
  className = "",
  style = {}
}) {
  const profile = useDepartmentProfile(dept_id);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const rawLogoUrl = propLogoUrl !== undefined ? propLogoUrl : profile?.logo_url;
  const logoLqip = propLogoLqip !== undefined ? propLogoLqip : profile?.logo_lqip;
  const brandColor = propBrandColor || profile?.brand_color || '#2563EB';

  // Format backend upload relative path if needed
  const resolvedLogoUrl = useMemo(() => {
    if (!rawLogoUrl) return null;
    if (rawLogoUrl.startsWith('http://') || rawLogoUrl.startsWith('https://') || rawLogoUrl.startsWith('data:')) {
      return rawLogoUrl;
    }
    // Local static uploads served from backend
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8081';
    return `${apiBase.replace(/\/api$/, '')}${rawLogoUrl.startsWith('/') ? '' : '/'}${rawLogoUrl}`;
  }, [rawLogoUrl]);

  // Deterministic fallback gradient
  const fallbackGradient = useMemo(() => {
    const idx = hashString(dept_id || 'DEPT') % FALLBACK_GRADIENTS.length;
    return FALLBACK_GRADIENTS[idx];
  }, [dept_id]);

  const initials = useMemo(() => {
    if (!dept_id) return 'DP';
    const clean = String(dept_id).replace(/[^a-zA-Z0-9]/g, '');
    return clean.slice(0, 3).toUpperCase();
  }, [dept_id]);

  const fontSize = Math.max(10, Math.floor(size * 0.38));

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '50%',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: showRing ? `0 0 0 2px #FFFFFF, 0 0 0 3.5px ${brandColor}40, 0 2px 8px rgba(0,0,0,0.12)` : 'none',
    userSelect: 'none',
    flexShrink: 0,
    ...style
  };

  if (!resolvedLogoUrl || imageError) {
    return (
      <div
        className={`dept-avatar dept-avatar-fallback ${className}`}
        style={{
          ...containerStyle,
          background: brandColor && brandColor !== '#2563EB' ? `linear-gradient(135deg, ${brandColor} 0%, ${profile?.brand_accent || brandColor} 100%)` : fallbackGradient,
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.3px',
          textShadow: '0 1px 2px rgba(0,0,0,0.25)'
        }}
        title={profile?.dept_name || dept_id}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`dept-avatar dept-avatar-image ${className}`}
      style={{
        ...containerStyle,
        background: '#F1F5F9'
      }}
      title={profile?.dept_name || dept_id}
    >
      {/* 1. Micro-LQIP Blurred Placeholder (Zero Layout Shift) */}
      {logoLqip && !imageLoaded && (
        <img
          src={logoLqip}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(6px)',
            transform: 'scale(1.1)',
            zIndex: 1
          }}
        />
      )}

      {/* 2. Full-Resolution Logo (Fade-in on load) */}
      <img
        src={resolvedLogoUrl}
        alt={profile?.dept_name || `${dept_id} Logo`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 2,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
    </div>
  );
}
