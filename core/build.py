import os, sys, shutil, subprocess, argparse
from pathlib import Path

BASE = Path(__file__).resolve().parent
DIST = BASE / "dist"

def build():
    parser = argparse.ArgumentParser(description="Build VisionVial Core binary")
    parser.add_argument("--encrypt-key", default=os.getenv("CORE_ENCRYPT_KEY", "change-me-32bytes-aes-key!!"))
    parser.add_argument("--clean", action="store_true", help="Limpiar dist/ antes de build")
    args = parser.parse_args()

    if args.clean and DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    nuitka_args = [
        sys.executable, "-m", "nuitka",
        "--standalone",
        "--onefile",
        "--enable-plugin=django",
        "--django-all",
        "--output-dir", str(DIST),
        "--output-filename", "visionvial-core.exe",
        "--windows-console-mode=disable",
        "--nofollow-import-to=pytest,unittest,test",
        "--follow-stdlib",
        str(BASE / "server.py"),
    ]

    print(f"[BUILD] Compilando core con Nuitka...")
    result = subprocess.run(nuitka_args, cwd=BASE)
    if result.returncode != 0:
        print(f"[BUILD] Error en compilación Nuitka: {result.returncode}")
        sys.exit(1)

    exe_path = DIST / "visionvial-core.exe"
    if not exe_path.exists():
        print(f"[BUILD] No se encontró {exe_path}")
        # Nuitka con --onefile pone el exe en output-dir/server.exe
        alt = DIST / "server.exe"
        if alt.exists():
            alt.rename(exe_path)
        else:
            sys.exit(1)

    print(f"[BUILD] Binario generado: {exe_path}")

    encrypted_path = DIST / "visionvial-core.enc"
    _encrypt_file(exe_path, encrypted_path, args.encrypt_key.encode())
    print(f"[BUILD] Cifrado AES-256: {encrypted_path}")

    # Firmar
    _checksum(encrypted_path, DIST / "visionvial-core.enc.sha256")
    _checksum(exe_path, DIST / "visionvial-core.exe.sha256")
    print(f"[BUILD] Build completo. Archivos en {DIST}")


def _encrypt_file(src, dst, key):
    from cryptography.fernet import Fernet
    import base64, hashlib
    hash_key = hashlib.sha256(key).digest()
    fernet_key = base64.urlsafe_b64encode(hash_key)
    f = Fernet(fernet_key)
    with open(src, "rb") as fin:
        data = fin.read()
    encrypted = f.encrypt(data)
    with open(dst, "wb") as fout:
        fout.write(encrypted)


def _checksum(file_path, output_path):
    import hashlib
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    with open(output_path, "w") as f:
        f.write(h.hexdigest())


if __name__ == "__main__":
    build()
