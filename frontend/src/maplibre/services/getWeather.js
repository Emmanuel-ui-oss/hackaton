export default async function getWeather(lat, lon, setWeather) {
    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const data = await res.json();
        setWeather(data.current_weather);
    } catch (err) {
        console.error("Error clima:", err);
    }
}
