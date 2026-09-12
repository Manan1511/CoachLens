"""Regenerate docs/openapi.json from the FastAPI app.

Run whenever routes or schemas change: python scripts/export_openapi.py
"""

import json
from pathlib import Path

from src.main import app

OUT_PATH = Path(__file__).resolve().parent.parent / "docs" / "openapi.json"


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(app.openapi(), indent=2))
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
