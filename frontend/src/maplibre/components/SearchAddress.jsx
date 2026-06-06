import { useState, useRef } from "react";
import searchAddress from "../services/searchAddress";

export default function SearchAddress({ onSelect, placeholder = "¿A dónde vas?" }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    async function handleChange(value) {
        setQuery(value);
        clearTimeout(debounceRef.current);

        if (!value.trim()) {
            setResults([]);
            onSelect?.(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                setLoading(true);
                const data = await searchAddress(value);
                setResults(data);
            } catch (err) {
                console.error(err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 400);
    }

    function handleSelect(result) {
        setQuery(result.label);
        setResults([]);
        onSelect?.([result.lat, result.lng]);
    }

    return (
        <div className="search-bar">
            <div className="search-bar__field">
                <span className="search-bar__dot search-bar__dot--red" />
                <input
                    className="search-bar__input"
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => handleChange(e.target.value)}
                />
            </div>
            {loading && <div className="search-bar__loading">Buscando...</div>}
            {results.length > 0 && (
                <ul className="search-bar__results">
                    {results.map((result, index) => (
                        <li key={index} className="search-bar__result" onClick={() => handleSelect(result)}>
                            <span className="search-bar__result-text">
                                <strong>{result.label.split(",")[0]}</strong>
                                <br />
                                <small>{result.label.split(",").slice(1, 3).join(",")}</small>
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
