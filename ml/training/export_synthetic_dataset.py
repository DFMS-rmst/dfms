import argparse
import csv
import sys
from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_ROOT))

from app.model import FEATURES, synthetic_training_data

DEFAULT_OUTPUT = ML_ROOT / "data" / "synthetic_amu_training_dataset.csv"


def export_dataset(output=DEFAULT_OUTPUT, seed=25007, count=800):
    """Export the exact SYNTHETIC DEMONSTRATION DATA matrix used by training."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = synthetic_training_data(seed=seed, count=count)
    with output.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(FEATURES)
        writer.writerows(rows)
    return output, rows.shape


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export SYNTHETIC DEMONSTRATION DATA to CSV")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seed", type=int, default=25007)
    parser.add_argument("--count", type=int, default=800)
    args = parser.parse_args()
    path, shape = export_dataset(args.output, args.seed, args.count)
    print(f"Exported {shape[0]} rows x {shape[1]} columns to {path}")
