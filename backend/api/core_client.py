import os, json, socket, logging

log = logging.getLogger("core_client")

CORE_HOST = os.getenv("CORE_HOST", "127.0.0.1")
CORE_PORT = int(os.getenv("CORE_PORT", "9100"))
CORE_TIMEOUT = int(os.getenv("CORE_TIMEOUT", "5"))


def call(method: str, params: dict = None) -> dict:
    req = json.dumps({"method": method, "params": params or {}, "id": 1}) + "\n"
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(CORE_TIMEOUT)
    try:
        s.connect((CORE_HOST, CORE_PORT))
        s.sendall(req.encode("utf-8"))
        resp = s.recv(65535)
        data = json.loads(resp.decode("utf-8"))
        if "error" in data:
            log.error(f"Core error: {data['error']}")
            return _local_call(method, params or {})
        return data["result"]
    except (socket.timeout, ConnectionRefusedError, OSError) as e:
        log.warning(f"Core ML no disponible ({e}). Usando ML local para '{method}'.")
        return _local_call(method, params or {})
    finally:
        s.close()


def _local_call(method: str, params: dict) -> dict:
    try:
        if method == "predict_congestion":
            from api.ml.congestion import predict_congestion
            return predict_congestion(
                hora=params.get("hora"),
                dia_semana=params.get("dia_semana"),
                comuna=params.get("comuna"),
                lat=params.get("lat"),
                lng=params.get("lng"),
            )
        if method == "congestion_forecast":
            from api.ml.congestion import get_hourly_forecast
            return get_hourly_forecast(
                comuna=params.get("comuna"),
                lat=params.get("lat"),
                lng=params.get("lng"),
            )
        if method == "zonas_criticas":
            from api.ml.clustering import detect_critical_zones
            return detect_critical_zones(
                eps=params.get("eps", 0.008),
                min_samples=params.get("min_samples", 3),
            )
        if method == "ruta_segura":
            from api.ml.routes import safe_route
            return safe_route(
                origin_lat=params["origen_lat"],
                origin_lng=params["origen_lng"],
                dest_lat=params["dest_lat"],
                dest_lng=params["dest_lng"],
            )
        if method == "ping":
            return {"pong": True, "source": "local"}
    except Exception as e:
        log.error(f"ML local error en '{method}': {e}")
    return {"error": f"ML local fallback falló para {method}", "fallback": True}
