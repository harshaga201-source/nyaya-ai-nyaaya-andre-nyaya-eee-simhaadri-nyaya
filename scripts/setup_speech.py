"""Install the offline speech engine used for voice language auto-detection.

Usage:
    python scripts/setup_speech.py               # whisper.cpp + base + small (~620 MB)
    python scripts/setup_speech.py --model medium  # stronger, slower transcription
    python scripts/setup_speech.py --model base  # smallest useful pair (~296 MB)

The files land in backend/tools/whisper (git-ignored). If this step is skipped,
NyayaSathi still works: voice input falls back to the browser recognizer and
script detection, and the server reports engine "none".
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TOOL_DIR = PROJECT_ROOT / "backend" / "tools" / "whisper"

BINARY_URL = (
    "https://github.com/ggerganov/whisper.cpp/releases/download/"
    "b5454/whisper-bin-x64.zip"
)
MODELS = {
    "turbo": (
        "ggml-large-v3-turbo-q5_0.bin",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/"
        "ggml-large-v3-turbo-q5_0.bin",
    ),
    "small": (
        "ggml-small.bin",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    ),
    "base": (
        "ggml-base.bin",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
    ),
}


def _progress(label: str, done: int, total: int) -> None:
    if total <= 0:
        return
    percent = int(done * 100 / total)
    filled = int(percent / 4)
    bar = "#" * filled + "." * (25 - filled)
    sys.stdout.write(f"\r{label}: [{bar}] {percent:3d}%  {done / 1048576:6.0f} MB")
    sys.stdout.flush()


def download(url: str, destination: Path, label: str) -> None:
    if destination.exists() and destination.stat().st_size > 0:
        print(f"{label}: already present ({destination.stat().st_size / 1048576:.0f} MB)")
        return
    print(f"{label}: downloading from {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "nyayasathi-setup"})
    with urllib.request.urlopen(request, timeout=120) as response, open(destination, "wb") as out:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        while True:
            chunk = response.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
            done += len(chunk)
            _progress(label, done, total)
    print(f"\n{label}: saved {destination.stat().st_size / 1048576:.0f} MB")


def find_cli() -> Path | None:
    for name in ("whisper-cli.exe", "main.exe", "whisper-cli", "main"):
        for candidate in (TOOL_DIR / name, TOOL_DIR / "Release" / name):
            if candidate.is_file():
                return candidate
    return None


def install_binary() -> None:
    if find_cli():
        print(f"whisper.cpp: already installed ({find_cli()})")
        return
    archive = TOOL_DIR / "whisper-bin.zip"
    TOOL_DIR.mkdir(parents=True, exist_ok=True)
    download(BINARY_URL, archive, "whisper.cpp")
    print("whisper.cpp: extracting...")
    with zipfile.ZipFile(archive) as bundle:
        bundle.extractall(TOOL_DIR)
    archive.unlink(missing_ok=True)
    cli = find_cli()
    if not cli:
        raise SystemExit("whisper.cpp extracted but no cli executable was found.")
    print(f"whisper.cpp: ready at {cli}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=sorted(MODELS), default="small")
    parser.add_argument("--skip-binary", action="store_true")
    args = parser.parse_args()

    TOOL_DIR.mkdir(parents=True, exist_ok=True)
    if not args.skip_binary:
        install_binary()

    # The base model is always installed: it runs the fast acoustic
    # language-ID pass that makes auto-detect work.
    base_filename, base_url = MODELS["base"]
    download(base_url, TOOL_DIR / base_filename, "model:base")

    filename, url = MODELS[args.model]
    if filename != base_filename:
        download(url, TOOL_DIR / filename, f"model:{args.model}")

    print("\nSpeech engine ready. Restart the backend, then speak in any of the 11 languages.")


if __name__ == "__main__":
    main()
