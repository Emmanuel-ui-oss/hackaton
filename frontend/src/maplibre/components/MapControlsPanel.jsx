import { Sun, Moon, TrafficLight, CloudRain, Navigation } from "../../icons";
import "../css/MapControlsPanel.css";

const ITEMS = [
    {
        key: "theme",
        iconOff: Sun, iconOn: Moon,
        labelOff: "DÍA", labelOn: "NOCHE",
        accent: "#ffab00",
        getActive: (props) => props.darkMode,
        action: (props) => props.setDarkMode(v => !v),
        always: true,
    },
    {
        key: "traffic",
        iconOff: TrafficLight, iconOn: TrafficLight,
        labelOff: "TRÁFICO", labelOn: "TRÁFICO",
        accent: "#00c853",
        getActive: (props) => props.showTraffic,
        action: (props) => props.setShowTraffic(v => !v),
        always: true,
    },
    {
        key: "radar",
        iconOff: CloudRain, iconOn: CloudRain,
        labelOff: "RADAR", labelOn: "RADAR",
        accent: "#4aa3ff",
        getActive: (props) => props.showRadar,
        action: (props) => props.setShowRadar(v => !v),
        always: true,
    },
    {
        key: "recenter",
        iconOff: Navigation, iconOn: Navigation,
        labelOff: "UBICACIÓN", labelOn: "UBICACIÓN",
        accent: "#2979ff",
        getActive: () => false,
        action: (props) => props.handleRecenter(),
        always: false,
    },
    {
        key: "voice",
        iconOff: "🔊", iconOn: "🔊",
        labelOff: "VOZ", labelOn: "VOZ",
        accent: "#00d4ff",
        getActive: (p) => p.voiceActive,
        action: (p) => p.onVoiceToggle(),
        always: true,
        isSpeaking: (p) => p.isSpeaking,
    },
    {
        key: "gps",
        iconOff: "▶", iconOn: "⏹",
        labelOff: "SIMULAR", labelOn: "SIMULAR",
        accent: "#ff1744",
        getActive: (p) => p.simActivo,
        action: (p) => p.onSimToggle(),
        always: true,
        disabled: (p) => !p.puedeSimular,
    },
];

export default function MapControlsPanel(props) {
    return (
        <div className="ctrl-panel">
            {ITEMS.map(cfg => {
                if (!cfg.always && props.following) return null;
                const isActive = cfg.getActive(props);
                const Icon = isActive ? cfg.iconOn : cfg.iconOff;
                const label = isActive ? cfg.labelOn : cfg.labelOff;
                const isDisabled = cfg.disabled?.(props);
                const isSpeaking = cfg.isSpeaking?.(props);
                const classes = [
                    "ctrl-btn",
                    isActive ? "ctrl-btn--active" : "",
                    isSpeaking ? "ctrl-btn--speaking" : "",
                ].filter(Boolean).join(" ");
                return (
                    <button
                        key={cfg.key}
                        className={classes}
                        style={{ "--accent": cfg.accent }}
                        onClick={() => cfg.action(props)}
                        title={label}
                        disabled={isDisabled}
                    >
                        <span className="ctrl-btn-icon">{Icon}</span>
                        <span className="ctrl-btn-label">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
