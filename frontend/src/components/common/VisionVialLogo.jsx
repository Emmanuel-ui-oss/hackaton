export default function VisionVialLogo({ showTagline = false, className = '' }) {
  const height = showTagline ? 130 : 100

  return (
    <svg
      className={className}
      viewBox={`0 0 100 ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="vv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00BCD4" />
          <stop offset="100%" stopColor="#00838F" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100" height="100" rx="20" fill="url(#vv-bg)" />

      <path
        d="M 24 16 L 50 64 L 76 16"
        stroke="white"
        strokeWidth="16"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect x="16" y="40" width="68" height="14" rx="4" fill="white" />

      <text
        x="50"
        y="50"
        textAnchor="middle"
        fill="#0d0d0d"
        fontFamily="'Inter','Segoe UI',Arial,sans-serif"
        fontWeight="700"
        fontSize="6.5"
        letterSpacing="2"
      >VISIONVIAL</text>

      {showTagline && (
        <text
          x="50"
          y="116"
          textAnchor="middle"
          fill="white"
          fontFamily="'Inter','Segoe UI',Arial,sans-serif"
          fontWeight="400"
          fontSize="5.5"
          letterSpacing="1.5"
        >por unos viajes más seguros</text>
      )}
    </svg>
  )
}
