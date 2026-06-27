# data_loader.py — Reusable utility to load JSON sample data files
# All JSON files live in: app/data/

import json
import os
from pathlib import Path

# Absolute path to the data directory
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_json(filename: str) -> dict:
    """
    Load a JSON file from the app/data/ directory.

    Args:
        filename: Name of the JSON file (e.g. "dashboard.json")

    Returns:
        Parsed dict from the JSON file.

    Raises:
        FileNotFoundError: If the data file does not exist.
        ValueError: If the file contains invalid JSON.
    """
    filepath = DATA_DIR / filename

    if not filepath.exists():
        raise FileNotFoundError(
            f"Data file not found: {filepath}. "
            f"Make sure '{filename}' exists in app/data/"
        )

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {filename}: {e}")
