#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
NATIVE_APP_DIR = ROOT / "mobile" / "native_app"
ANDROID_DIR = NATIVE_APP_DIR / "android"
APK_SOURCE = ANDROID_DIR / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk"
OUTPUT_DIR = Path(r"C:\Users\aurel\OneDrive\Workspace\CuePath\builds")
APK_PATTERN = re.compile(r"^cue-path-v(\d+)\.(\d+)\.(\d+)\.apk$", re.IGNORECASE)


def run_command(cmd: list[str], cwd: Path) -> None:
    resolved_cmd = list(cmd)
    if sys.platform.startswith("win"):
        # If executable exists in cwd (e.g. gradlew.bat), run it directly.
        local_exe = cwd / resolved_cmd[0]
        if local_exe.exists():
            resolved_cmd[0] = str(local_exe)
        else:
            # Windows commonly exposes CLIs via .cmd shims.
            exe = shutil.which(resolved_cmd[0]) or shutil.which(f"{resolved_cmd[0]}.cmd")
            if exe:
                resolved_cmd[0] = exe
    print(f"\n>>> Running: {' '.join(cmd)}")
    try:
        proc = subprocess.run(resolved_cmd, cwd=str(cwd))
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Executable not found for '{cmd[0]}' in '{cwd}'."
        ) from exc
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {proc.returncode}: {' '.join(cmd)}")


def next_version(output_dir: Path, bump: str) -> str:
    best = None
    if output_dir.exists():
        for file in output_dir.iterdir():
            if not file.is_file():
                continue
            match = APK_PATTERN.match(file.name)
            if not match:
                continue
            version = tuple(int(part) for part in match.groups())
            if best is None or version > best:
                best = version

    if best is None:
        return "0.1.0"

    major, minor, patch = best
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build Cue Path Android APK and copy with incremented version."
    )
    parser.add_argument(
        "--bump",
        choices=("patch", "minor", "major"),
        default="patch",
        help="Version segment to increment (default: patch).",
    )
    parser.add_argument(
        "--install-usb",
        action="store_true",
        help="Also run `gradlew.bat installDebug` to install on a USB-connected device.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not NATIVE_APP_DIR.exists():
        print(f"Native app folder not found: {NATIVE_APP_DIR}", file=sys.stderr)
        return 1

    try:
        run_command(["npx", "expo", "prebuild", "-p", "android"], cwd=NATIVE_APP_DIR)
        gradlew = ANDROID_DIR / "gradlew.bat"
        if not gradlew.exists():
            raise RuntimeError(
                f"Gradle wrapper not found at '{gradlew}'. Prebuild may have failed."
            )
        if args.install_usb:
            run_command(["gradlew.bat", "installDebug"], cwd=ANDROID_DIR)
        else:
            run_command(["gradlew.bat", "assembleRelease"], cwd=ANDROID_DIR)
    except RuntimeError as exc:
        print(f"\nBuild failed: {exc}", file=sys.stderr)
        return 1

    if args.install_usb:
        print("\nBuild complete.")
        print("USB install:   installDebug completed.")
        return 0

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    version = next_version(OUTPUT_DIR, bump=args.bump)
    output_apk = OUTPUT_DIR / f"cue-path-v{version}.apk"
    latest_apk = OUTPUT_DIR / "cue-path-latest.apk"

    if not APK_SOURCE.exists():
        print(f"\nExpected APK not found at: {APK_SOURCE}", file=sys.stderr)
        return 1

    shutil.copy2(APK_SOURCE, output_apk)
    shutil.copy2(APK_SOURCE, latest_apk)

    print("\nBuild complete.")
    print(f"Versioned APK: {output_apk}")
    print(f"Latest APK:    {latest_apk}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
