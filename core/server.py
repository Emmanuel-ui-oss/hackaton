import os, sys, json, socketserver, logging, argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

import django
django.setup()

from ml.clustering import detect_critical_zones
from ml.congestion import predict_congestion, get_hourly_forecast
from ml.routes import safe_route
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="[CORE] %(asctime)s %(message)s")
log = logging.getLogger("core")


METHODS = {
    "predict_congestion": lambda p: predict_congestion(
        hora=p["hora"], dia_semana=p.get("dia_semana", datetime.now().weekday()),
        comuna=p.get("comuna"),
    ),
    "congestion_forecast": lambda p: get_hourly_forecast(comuna=p.get("comuna")),
    "zonas_criticas": lambda p: detect_critical_zones(
        eps=p.get("eps", 0.008), min_samples=p.get("min_samples", 3),
    ),
    "ruta_segura": lambda p: safe_route(
        origin_lat=p["origen_lat"], origin_lng=p["origen_lng"],
        dest_lat=p["dest_lat"], dest_lng=p["dest_lng"],
    ),
    "ping": lambda p: {"pong": True, "timestamp": datetime.now().isoformat()},
}


class JSONRPCHandler(socketserver.StreamRequestHandler):
    def handle(self):
        data = self.rfile.readline()
        if not data:
            return
        try:
            req = json.loads(data.decode("utf-8").strip())
            method = req.get("method", "")
            params = req.get("params", {})
            req_id = req.get("id", None)
            log.info(f"→ {method}({params})")
            handler = METHODS.get(method)
            if handler is None:
                self._send({"error": {"message": f"Método no encontrado: {method}"}, "id": req_id})
                return
            result = handler(params)
            self._send({"result": result, "id": req_id})
        except Exception as e:
            log.error(f"Error: {e}")
            self._send({"error": {"message": str(e)}, "id": req_id if 'req_id' in dir() else None})

    def _send(self, msg):
        line = (json.dumps(msg, ensure_ascii=False) + "\n").encode("utf-8")
        self.wfile.write(line)
        self.wfile.flush()


class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description="VisionVial Core Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=9100)
    args = parser.parse_args()

    log.info(f"Iniciando VisionVial Core en {args.host}:{args.port}")
    server = ThreadedServer((args.host, args.port), JSONRPCHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Core detenido")
        server.shutdown()


if __name__ == "__main__":
    main()
