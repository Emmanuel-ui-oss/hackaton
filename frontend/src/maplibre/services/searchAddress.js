export default async function searchAddress(query) {
    const res = await fetch(`/api/v1/geocode/autocomplete?q=${encodeURIComponent(query)}&limit=10`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
}
