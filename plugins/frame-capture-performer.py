#!/usr/bin/env python3
"""
Frame Capture Performer — Stash Plugin Backend
===============================================
The core capture functionality runs entirely in the browser (see frame-capture.js).
This Python script handles plugin *tasks* such as the connection test.

Stash passes all server connection details via stdin as JSON — no hardcoded
paths or credentials here. stashapp-tools reads that same JSON object.
"""

import sys
import json


def main():
    # Stash writes a JSON object to stdin containing server_connection and args
    try:
        raw = sys.stdin.read()
        json_input = json.loads(raw)
    except Exception as exc:
        _output(error=f"Failed to parse Stash input: {exc}")
        return

    mode = json_input.get("args", {}).get("mode", "")

    if mode == "test":
        _run_test(json_input)
    else:
        _output(output=f"Frame Capture Performer is loaded. (mode='{mode}')")


def _run_test(json_input):
    """Verify stashapp-tools is installed and the connection works."""
    try:
        from stashapi.stashapp import StashInterface  # noqa: F401
    except ImportError:
        _output(
            error=(
                "stashapp-tools is not installed in the Python environment "
                "Stash is using.\n\n"
                "Install it with:\n"
                "    pip install stashapp-tools\n\n"
                "If you are using a virtual environment, make sure Stash's "
                "'Python Path' setting points to that environment's Python executable."
            )
        )
        return

    try:
        from stashapi.stashapp import StashInterface

        # server_connection contains the host, port, scheme, and API key —
        # all provided by Stash at runtime, nothing hardcoded.
        stash = StashInterface(json_input.get("server_connection"))

        result = stash.call_GQL("{ version { version } }")
        version = result.get("version", {}).get("version", "unknown")
        _output(output=f"✓ Connected to Stash {version}. Plugin is working correctly.")

    except Exception as exc:
        _output(error=f"Connection test failed: {exc}")


def _output(output=None, error=None):
    payload = {}
    if output is not None:
        payload["output"] = output
    if error is not None:
        payload["error"] = error
    print(json.dumps(payload))


main()
