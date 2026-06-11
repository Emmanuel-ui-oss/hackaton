import { Warning, Clipboard, AlertCircle, Star, Chart, Train, Bus_svg, CableCar_svg, Tranvia_svg } from "../../icons";
import "../css/StatsTogglePanel.css";

const CARD_COLORS = {
    ZONAS: "#ffab00", REPORTES: "#2979ff",
    SOS: "#d500f9", FAVORITOS: "#ffab00",
    METRO: "#E30613", BUS: "#FF6D00", CABLE: "#7B1FA2", TRANVIA: "#E91E63", TOTAL: "#2979ff",
};

const ITEMS = [
    { key: "zonas_riesgo",  icon: Warning,    label: "ZONAS RIESGO",    colorKey: "ZONAS",   layer: "zonas" },
    { key: "reportes_activos", icon: Clipboard, label: "REPORTES",      colorKey: "REPORTES", layer: "reportes" },
    { key: "eventos_sos", icon: AlertCircle, label: "EVENTOS SOS",    colorKey: "SOS",       layer: "sos" },
    { key: "favoritos",   icon: Star,       label: "FAVORITOS",      colorKey: "FAVORITOS", layer: "favoritos" },
    { key: "rutas_metro", icon: Train,     label: "METRO",         colorKey: "METRO",    layer: "transport_metro" },
    { key: "rutas_bus",   icon: Bus_svg,   label: "BUSES",         colorKey: "BUS",      layer: "transport_bus" },
    { key: "rutas_cable", icon: CableCar_svg, label: "METRO CABLE",   colorKey: "CABLE",    layer: "transport_cable" },
    { key: "rutas_tranvia", icon: Tranvia_svg, label: "TRANVÍA",       colorKey: "TRANVIA",  layer: "transport_tranvia" },
    { key: "total_reportes", icon: Chart,      label: "TOTAL REPORTES", colorKey: "TOTAL",    layer: null },
];

function getVal(stats, cfg) {
    let v = stats?.[cfg.key];
    if (v === undefined && cfg.altKey) v = stats?.[cfg.altKey];
    return v ?? 0;
}

export default function StatsTogglePanel({ stats, toggles, onToggle }) {
    const ss = stats || {};
    return (
        <div className="stats-panel">
            {ITEMS.map(cfg => {
                const isActive = cfg.layer && toggles[cfg.layer];
                return (
                    <button
                        key={cfg.key}
                        className={`stats-btn ${isActive ? "stats-btn--active" : ""} ${!cfg.layer ? "stats-btn--info" : ""}`}
                        style={{ "--accent": CARD_COLORS[cfg.colorKey] }}
                        onClick={() => cfg.layer && onToggle(cfg.layer)}
                        title={cfg.label}
                    >
                        <span className="stats-btn-icon">{cfg.icon}</span>
                        <span className="stats-btn-value" style={{ color: CARD_COLORS[cfg.colorKey] }}>
                            {getVal(ss, cfg)}
                        </span>
                        <span className="stats-btn-label">{cfg.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
