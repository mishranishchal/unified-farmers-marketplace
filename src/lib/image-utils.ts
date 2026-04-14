function encodeSvg(value: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(value)}`;
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AG';
}

export function buildMonogramImage(label: string, subtitle?: string) {
  const primary = '#123524';
  const secondary = '#26734d';
  const accent = '#d8a54a';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="55%" stop-color="${secondary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)" rx="28" ry="28"/>
      <circle cx="120" cy="380" r="180" fill="rgba(255,255,255,0.09)" />
      <circle cx="705" cy="80" r="140" fill="rgba(255,255,255,0.08)" />
      <rect x="52" y="62" width="124" height="124" rx="26" fill="rgba(255,255,255,0.18)" />
      <text x="114" y="138" fill="#ffffff" text-anchor="middle" font-size="52" font-family="Arial, sans-serif" font-weight="700">${initials(label)}</text>
      <text x="52" y="272" fill="#ffffff" font-size="42" font-family="Arial, sans-serif" font-weight="700">${label.slice(0, 28)}</text>
      <text x="52" y="320" fill="rgba(255,255,255,0.86)" font-size="22" font-family="Arial, sans-serif">${(subtitle || 'AgriAssist live catalog asset').slice(0, 60)}</text>
    </svg>
  `;
  return encodeSvg(svg);
}
