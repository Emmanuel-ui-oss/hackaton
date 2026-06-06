const s = (d, w = 2) => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
const s2 = (children, w = 2) => <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{children}</svg>

export const User = s('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 1.8)
export const UserCircle = s2([<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" key="u1" />, <circle cx="12" cy="7" r="4" key="u2" />], 1.8)

const _MapPin = s('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 1.8)
export const MapPin = Object.assign(
  { ..._MapPin, $$typeof: _MapPin.$$typeof },
  { withDot: s2([<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" key="p1" />, <circle cx="12" cy="10" r="3" key="p2" />], 1.8) }
)

export const Star = s('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', 1.8)

const _Warning = s('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 1.8)
export const Warning = Object.assign(
  { ..._Warning, $$typeof: _Warning.$$typeof },
  { full: s2([<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" key="w1" />, <line x1="12" y1="9" x2="12" y2="13" key="w2" />, <line x1="12" y1="17" x2="12.01" y2="17" key="w3" />], 1.8) }
)

const _Bell = s('M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 1.8)
export const Bell = Object.assign(
  { ..._Bell, $$typeof: _Bell.$$typeof },
  { full: s2([<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" key="b1" />, <path d="M13.73 21a2 2 0 0 1-3.46 0" key="b2" />], 1.8) }
)
export const Phone = s('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', 1.8)
export const Mail = s2([<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" key="m1" />, <polyline points="22,6 12,13 2,6" key="m2" />], 1.8)
export const Clock = s2([<circle cx="12" cy="12" r="10" key="c1" />, <polyline points="12 6 12 12 16 14" key="c2" />], 1.8)
export const Trash = s2([<polyline points="3 6 5 6 21 6" key="t1" />, <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" key="t2" />], 1.8)
export const Check = s('M20 6L9 17l-5-5', 1.8)
export const Close = s('M18 6L6 18M6 6l12 12', 1.8)
export const Menu = s('M3 12h18M3 6h18M3 18h18', 1.8)
export const Search = s2([<circle cx="11" cy="11" r="8" key="s1" />, <line x1="21" y1="21" x2="16.65" y2="16.65" key="s2" />], 1.8)
export const AlertTriangle = s2([<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" key="a1" />, <line x1="12" y1="9" x2="12" y2="13" key="a2" />, <line x1="12" y1="17" x2="12.01" y2="17" key="a3" />], 1.8)
export const AlertCircle = s2([<circle cx="12" cy="12" r="10" key="a1" />, <line x1="12" y1="8" x2="12" y2="12" key="a2" />, <line x1="12" y1="16" x2="12.01" y2="16" key="a3" />], 1.8)
export const Shield = s2([<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" key="s1" />], 1.8)
export const Target = s2([<circle cx="12" cy="12" r="10" key="t1" />, <circle cx="12" cy="12" r="3" key="t2" />], 1.8)
export const Lightning = s('M13 2L3 14h9l-1 8 10-12h-9l1-8z', 1.8)
export const Prohibited = s2([<circle cx="12" cy="12" r="10" key="p1" />, <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" key="p2" />], 1.8)
export const ThumbsUp = s('M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3', 1.8)
export const ThumbsDown = s('M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3', 1.8)
export const ArrowUp = s('M12 19V5M5 12l7-7 7 7', 1.8)
export const ArrowDown = s('M12 5v14M19 12l-7 7-7-7', 1.8)
export const ArrowRight = s('M5 12h14M12 5l7 7-7 7', 1.8)
export const Map = s2([<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" key="m1" />, <line x1="8" y1="2" x2="8" y2="18" key="m2" />, <line x1="16" y1="6" x2="16" y2="22" key="m3" />], 1.8)
export const Navigation = s2([<polygon points="3 11 22 2 13 21 11 13 3 11" key="n1" />], 1.8)
export const TrafficLight = s2([<rect x="8" y="2" width="8" height="20" rx="2" key="t1" />, <circle cx="12" cy="8" r="1.5" key="t2" />, <circle cx="12" cy="12" r="1.5" key="t3" />, <circle cx="12" cy="16" r="1.5" key="t4" />], 1.8)
export const Sun = s2([<circle cx="12" cy="12" r="5" key="s1" />, <line x1="12" y1="1" x2="12" y2="3" key="s2" />, <line x1="12" y1="21" x2="12" y2="23" key="s3" />, <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" key="s4" />, <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" key="s5" />, <line x1="1" y1="12" x2="3" y2="12" key="s6" />, <line x1="21" y1="12" x2="23" y2="12" key="s7" />, <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" key="s8" />, <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" key="s9" />], 1.5)
export const Moon = s('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', 1.8)
export const Droplet = s('M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z', 1.8)
export const CloudRain = s2([<path d="M16 13v8" key="c1" />, <path d="M8 13v8" key="c2" />, <path d="M12 15v8" key="c3" />, <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 0 0 4 15.25" key="c4" />], 1.8)
export const Train = s2([<rect x="3" y="3" width="18" height="14" rx="2" key="t1" />, <line x1="3" y1="12" x2="21" y2="12" key="t2" />, <circle cx="8" cy="16" r="1.5" key="t3" />, <circle cx="16" cy="16" r="1.5" key="t4" />, <line x1="10" y1="3" x2="8" y2="21" key="t5" />, <line x1="14" y1="3" x2="16" y2="21" key="t6" />], 1.8)
export const Bus = s2([<rect x="2" y="4" width="20" height="14" rx="2" ry="2" key="b1" />, <line x1="2" y1="10" x2="22" y2="10" key="b2" />, <circle cx="7" cy="18" r="2" key="b3" />, <circle cx="17" cy="18" r="2" key="b4" />, <line x1="9" y1="4" x2="9" y2="18" key="b5" />, <line x1="15" y1="4" x2="15" y2="18" key="b6" />], 1.8)
export const CableCar = s2([<path d="M7 21l10-4" key="c1" />, <path d="M11 15l4-8" key="c2" />, <circle cx="12" cy="3" r="1" key="c3" />, <rect x="3" y="15" width="18" height="6" rx="1" key="c4" />, <circle cx="8" cy="18" r="1" key="c5" />, <circle cx="16" cy="18" r="1" key="c6" />], 1.8)
export const Ambulance = s2([<path d="M18 16h2a2 2 0 0 0 2-2V8h-4v10" key="a1" />, <circle cx="7" cy="18" r="2" key="a2" />, <circle cx="17" cy="18" r="2" key="a3" />, <path d="M7 18h10" key="a4" />, <path d="M7 10h4" key="a5" />, <path d="M9 8v4" key="a6" />, <path d="M3 14h3V9h10l3-3v10" key="a7" />], 1.5)
export const Roadwork = s2([<path d="M6 12h12" key="r1" />, <path d="M6 8h12" key="r2" />, <rect x="4" y="14" width="16" height="4" rx="1" key="r3" />, <line x1="12" y1="4" x2="12" y2="8" key="r4" />], 1.8)
export const Clipboard = s2([<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" key="c1" />, <polyline points="14 2 14 8 20 8" key="c2" />, <line x1="16" y1="13" x2="8" y2="13" key="c3" />, <line x1="16" y1="17" x2="8" y2="17" key="c4" />], 1.8)
export const Chart = s2([<line x1="18" y1="20" x2="18" y2="10" key="c1" />, <line x1="12" y1="20" x2="12" y2="4" key="c2" />, <line x1="6" y1="20" x2="6" y2="14" key="c3" />], 1.8)
export const Settings = s2([<circle cx="12" cy="12" r="3" key="s1" />, <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" key="s2" />], 1.5)
export const Car = s2([<path d="M5 17h14M5 17a2 2 0 0 1-2-2v-4l2.5-4A2 2 0 0 1 7.2 7h9.6a2 2 0 0 1 1.7 1L21 11v4a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0" key="c1" />], 1.8)
export const Flag = s2([<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" key="f1" />, <line x1="4" y1="22" x2="4" y2="15" key="f2" />], 1.8)
export const Info = s2([<circle cx="12" cy="12" r="10" key="i1" />, <line x1="12" y1="16" x2="12" y2="12" key="i2" />, <line x1="12" y1="8" x2="12.01" y2="8" key="i3" />], 1.8)
export const CheckCircle = s2([<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" key="c1" />, <polyline points="22 4 12 14.01 9 11.01" key="c2" />], 1.8)
export const Heart = s('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', 1.8)
export const Loader = s2([<line x1="12" y1="2" x2="12" y2="6" key="l1" />, <line x1="12" y1="18" x2="12" y2="22" key="l2" />, <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" key="l3" />, <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" key="l4" />, <line x1="2" y1="12" x2="6" y2="12" key="l5" />, <line x1="18" y1="12" x2="22" y2="12" key="l6" />, <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" key="l7" />, <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" key="l8" />], 1.5)
export const EmptyBox = s2([<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" key="e1" />, <polyline points="3.27 6.96 12 12.01 20.73 6.96" key="e2" />, <line x1="12" y1="22.08" x2="12" y2="12" key="e3" />], 1.5)
export const Activity = s2([<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" key="a1" />], 1.8)
export const Play = s2([<polygon points="5 3 19 12 5 21 5 3" key="p1" />], 1.8)
export const ExternalLink = s2([<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" key="e1" />, <polyline points="15 3 21 3 21 9" key="e2" />, <line x1="10" y1="14" x2="21" y2="3" key="e3" />], 1.8)
export const Plus = s2([<line x1="12" y1="5" x2="12" y2="19" key="p1" />, <line x1="5" y1="12" x2="19" y2="12" key="p2" />], 1.8)
export const Minus = s2([<line x1="5" y1="12" x2="19" y2="12" key="m1" />], 1.8)
export const Lock = s2([<rect x="3" y="11" width="18" height="11" rx="2" ry="2" key="l1" />, <path d="M7 11V7a5 5 0 0 1 10 0v4" key="l2" />], 1.8)
export const Edit = s2([<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" key="e1" />, <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" key="e2" />], 1.8)
export const Circle = ({ color }) => <svg width="1em" height="1em" viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="6" /></svg>

export const MessageCircle = s('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z', 1.8)
export const Send = s('M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z', 1.8)

export const SocialX = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
export const SocialLinkedIn = <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
