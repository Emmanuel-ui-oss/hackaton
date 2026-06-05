import socket, json, sys

HOST = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 9100


def call(method, params=None):
    req = json.dumps({"method": method, "params": params or {}, "id": 1}) + "\n"
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((HOST, PORT))
    s.sendall(req.encode())
    resp = s.recv(65535)
    s.close()
    return json.loads(resp.decode())


if __name__ == "__main__":
    print("=== Test VisionVial Core ===")
    print("ping:", call("ping"))
    print("congestion:", call("predict_congestion", {"hora": 8, "comuna": "Comuna 10 - La Candelaria"}))
    print("forecast:", call("congestion_forecast", {"comuna": "El Poblado"}))
