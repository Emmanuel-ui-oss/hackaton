import { Warning, Clipboard, Bell, Train, AlertCircle, Star, MapPin, Chart } from "../../icons";
import "../css/StatsTogglePanel.css";

const CARD_COLORS = {
    ZONAS: "#ffab00", REPORTES: "#2979ff", ALERTAS: "#ff1744",
    LINEAS: "#00c853", SOS: "#d500f9", FAVORITOS: "#ffab00",
    PARADAS: "#00bcd4", TOTAL: "#2979ff",
};

const ITEMS = [
    { key: "zonas_riesgo",  icon: Warning,    label: "ZONAS RIESGO",    colorKey: "ZONAS",   layer: "zonas" },
    { key: "reportes_activos", icon: Clipboard, label: "REPORTES",      colorKey: "REPORTES", layer: "reportes" },
    { key: "alertas_enviadas", icon: Bell,      label: "ALERTAS",        colorKey: "ALERTAS",  layer: "alertas",
      altKey: "alertas_no_leidas" },
    { key: "lineas_transporte", icon: Train,     label: "LINEAS TRANS.", colorKey: "LINEAS",   layer: "paradas" },
    { key: "eventos_sos", icon: AlertCircle, label: "EVENTOS SOS",    colorKey: "SOS",       layer: "sos" },
    { key: "favoritos",   icon: Star,       label: "FAVORITOS",      colorKey: "FAVORITOS", layer: "favoritos" },
    { key: "paradas",     icon: MapPin,     label: "PARADAS",        colorKey: "PARADAS",   layer: "paradas" },
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
