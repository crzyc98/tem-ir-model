"""ir-model CLI — dev tooling for the RetireModel project."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import signal

import click

ROOT = Path(__file__).parent
API_DIR = ROOT
APP_DIR = ROOT / "app"


def _port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def _free_port(port: int) -> None:
    """Kill any process listening on *port* and wait until it's released."""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f"tcp:{port}"],
            capture_output=True, text=True,
        )
        pids = result.stdout.split()
        for pid in pids:
            try:
                os.kill(int(pid), signal.SIGKILL)
            except (ProcessLookupError, ValueError):
                pass
        if pids:
            click.echo(f"  Freed port {port} (killed pid(s): {', '.join(pids)})")
            # Wait up to 3 s for the OS to release the port
            deadline = time.monotonic() + 3.0
            while _port_in_use(port) and time.monotonic() < deadline:
                time.sleep(0.05)
    except FileNotFoundError:
        pass  # lsof not available — skip


@click.group()
def main() -> None:
    """RetireModel development CLI."""


@main.command()
@click.option("--api-only", is_flag=True, help="Start only the FastAPI backend.")
@click.option("--ui-only", is_flag=True, help="Start only the Vite frontend.")
@click.option("--port", default=8000, show_default=True, help="API port.")
@click.option("--ui-port", default=5173, show_default=True, help="Frontend port.")
def start(api_only: bool, ui_only: bool, port: int, ui_port: int) -> None:
    """Start the API and/or frontend dev servers."""
    if api_only and ui_only:
        raise click.UsageError("--api-only and --ui-only are mutually exclusive.")

    procs: list[subprocess.Popen[bytes]] = []

    try:
        if not ui_only:
            _free_port(port)
            click.echo(f"  Starting API on http://localhost:{port}")
            api_proc = subprocess.Popen(
                [
                    sys.executable, "-m", "uvicorn",
                    "api.main:app",
                    "--reload",
                    "--port", str(port),
                ],
                cwd=API_DIR,
            )
            procs.append(api_proc)

        if not api_only:
            _free_port(ui_port)
            click.echo(f"  Starting UI  on http://localhost:{ui_port}")
            npm = "npm.cmd" if sys.platform == "win32" else "npm"
            ui_proc = subprocess.Popen(
                [npm, "run", "dev", "--", "--port", str(ui_port)],
                cwd=APP_DIR,
            )
            procs.append(ui_proc)

        click.echo("  Press Ctrl-C to stop.\n")
        for p in procs:
            p.wait()

    except KeyboardInterrupt:
        click.echo("\n  Shutting down...")
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()


@main.command()
def api() -> None:
    """Alias: start only the FastAPI backend (uvicorn --reload)."""
    ctx = click.get_current_context()
    ctx.invoke(start, api_only=True, ui_only=False, port=8000, ui_port=5173)


@main.command()
def ui() -> None:
    """Alias: start only the Vite frontend."""
    ctx = click.get_current_context()
    ctx.invoke(start, api_only=False, ui_only=True, port=8000, ui_port=5173)


if __name__ == "__main__":
    main()
