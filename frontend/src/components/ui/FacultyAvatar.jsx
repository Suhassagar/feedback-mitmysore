import { useState, useEffect, useMemo } from 'react';
import { safeImageUrl } from '../../utils/urlSanitizer';

// Helper to extract clean initials from faculty names (handles Dr., Prof., etc.)
export function getFacultyInitials(name) {
  if (!name || typeof name !== 'string') return 'F';
  const cleanName = name.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Curated modern gradients for deterministic fallback avatars
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)", // Navy / Blue
  "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)", // Deep Violet
  "linear-gradient(135deg, #065F46 0%, #059669 100%)", // Forest / Emerald
  "linear-gradient(135deg, #9A3412 0%, #EA580C 100%)", // Warm Bronze
  "linear-gradient(135deg, #831843 0%, #DB2777 100%)", // Rose / Pink
  "linear-gradient(135deg, #164E63 0%, #0891B2 100%)", // Cyan / Ocean
  "linear-gradient(135deg, #1E293B 0%, #475569 100%)", // Slate / Charcoal
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

export default function FacultyAvatar({
  name = "",
  photoUrl = null,
  profile_picture_url = null,
  size = 48,
  borderRadius = "50%",
  showBadge = false,
  badgeColor = "#10B981",
  className = "",
  style = {},
  imgStyle = {},
  alt = ""
}) {
  const [imgError, setImgError] = useState(false);
  const rawUrl = photoUrl || profile_picture_url;

  // Reset imgError state if photo URL changes
  useEffect(() => {
    setImgError(false);
  }, [rawUrl]);

  const sanitizedUrl = useMemo(() => {
    return safeImageUrl(rawUrl, null);
  }, [rawUrl]);

  const initials = useMemo(() => {
    return getFacultyInitials(name);
  }, [name]);

  const gradient = useMemo(() => {
    const idx = hashString(name || "FACULTY") % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[idx];
  }, [name]);

  const hasPhoto = Boolean(sanitizedUrl && !imgError);
  const fontSize = Math.max(11, Math.round(size * 0.38));
  const badgeSize = Math.max(10, Math.round(size * 0.22));
  const badgeBorder = Math.max(2, Math.round(size * 0.04));

  return (
    <div
      className={`faculty-avatar-container ${className}`}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        flexShrink: 0,
        borderRadius,
        ...style
      }}
      aria-label={alt || `Faculty avatar of ${name}`}
    >
      {hasPhoto ? (
        <img
          src={sanitizedUrl}
          alt={alt || name || "Faculty"}
          onError={() => setImgError(true)}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius,
            display: "block",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            ...imgStyle
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius,
            background: gradient,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: `${fontSize}px`,
            letterSpacing: "0.5px",
            userSelect: "none",
            boxShadow: "inset 0 1px 2px rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.1)",
            ...imgStyle
          }}
        >
          <span>{initials}</span>
        </div>
      )}

      {showBadge && (
        <div
          style={{
            position: "absolute",
            bottom: "2px",
            right: "2px",
            width: `${badgeSize}px`,
            height: `${badgeSize}px`,
            background: badgeColor,
            border: `${badgeBorder}px solid #FFFFFF`,
            borderRadius: "50%",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            zIndex: 2
          }}
        />
      )}
    </div>
  );
}
