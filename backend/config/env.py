import os
from pathlib import Path


def load_env(env_file: str = None):
    if env_file is None:
        env_file = str(Path(__file__).resolve().parent.parent.parent / ".env")
    if not os.path.isfile(env_file):
        return
    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip("\"'")
            os.environ.setdefault(key, val)


def env(key: str, default: str = None) -> str:
    return os.environ.get(key, default)
