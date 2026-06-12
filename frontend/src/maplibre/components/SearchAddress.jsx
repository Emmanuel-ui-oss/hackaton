import { useState, useRef, useMemo } from "react";
import { Star } from "../../icons";
import searchAddress from "../services/searchAddress";

export default function SearchAddress({ onSelect, onSelectName, placeholder = "¿A dónde vas?", favoritos = [] }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    const filteredFavs = useMemo(() => {
        if (!query.trim()) return favoritos;
        const q = query.toLowerCase();
        return favoritos.filter(f =>
            (f.nombre || '').toLowerCase().includes(q) ||
            (f.direccion || '').toLowerCase().includes(q)
        );
    }, [favoritos, query]);

    async function handleChange(value) {
        setQuery(value);
        clearTimeout(debounceRef.current);

        if (!value.trim()) {
            setResults([]);
            onSelect?.(null);
            onSelectName?.('');
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
        onSelectName?.(result.label);
    }

    function handleSelectFav(fav) {
        setQuery(fav.nombre);
        setResults([]);
        onSelect?.([fav.latitud, fav.longitud]);
        onSelectName?.(fav.nombre);
    }

    const showFavs = filteredFavs.length > 0;
    const showResults = results.length > 0;
    const showDropdown = showFavs || showResults || loading;

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
            {showDropdown && (
                <ul className="search-bar__results">
                    {filteredFavs.map((fav) => (
                        <li key={`fav-${fav.id}`} className="search-bar__result" onClick={() => handleSelectFav(fav)}>
                            <span className="search-bar__fav-icon">{Star}</span>
                            <span className="search-bar__result-text">
                                <strong>{fav.nombre}</strong>
                                {fav.direccion && <><br /><small>{fav.direccion}</small></>}
                            </span>
                        </li>
                    ))}
                    {showFavs && showResults && <li className="search-bar__divider" />}
                    {results.map((result, index) => (
                        <li key={`geo-${index}`} className="search-bar__result" onClick={() => handleSelect(result)}>
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
