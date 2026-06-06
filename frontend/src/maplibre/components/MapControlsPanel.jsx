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
];

export default function MapControlsPanel(props) {
    return (
        <div className="ctrl-panel">
            {ITEMS.map(cfg => {
                if (!cfg.always && props.following) return null;
                const isActive = cfg.getActive(props);
                const Icon = isActive ? cfg.iconOn : cfg.iconOff;
                const label = isActive ? cfg.labelOn : cfg.labelOff;
                return (
                    <button
                        key={cfg.key}
                        className={`ctrl-btn ${isActive ? "ctrl-btn--active" : ""}`}
                        style={{ "--accent": cfg.accent }}
                        onClick={() => cfg.action(props)}
                        title={label}
                    >
                        <span className="ctrl-btn-icon">{Icon}</span>
                        <span className="ctrl-btn-label">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
