"""Load shared backend settings from the environment and local env files."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _load_file(path: Path) -> None:
    for name, value in dotenv_values(path).items():
        if value is not None and not (os.getenv(name) or "").strip():
            os.environ[name] = value


def load_backend_environment(backend_dir: Path = BACKEND_DIR) -> None:
    """Load .env first, with test.env as a legacy fallback and OS env taking precedence."""
    _load_file(backend_dir / ".env")
    _load_file(backend_dir / "test.env")


load_backend_environment()