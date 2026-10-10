"""Read the supplied workbook as data; never modify it. Requires openpyxl."""
import argparse
import hashlib
import json
from pathlib import Path
import openpyxl

parser = argparse.ArgumentParser()
parser.add_argument("workbook", type=Path)
args = parser.parse_args()
workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
try:
    rows = iter(workbook["GLOBAL_PORTS"].values)
    if tuple(next(rows)) != ("Country", "Port", "Mode"):
        raise ValueError("Expected Country, Port, Mode headers in GLOBAL_PORTS")
    entries = []
    for row in rows:
        if len(row) != 3 or not all(isinstance(value, str) and value.strip() for value in row) or row[2] not in ("AIR", "SEA"):
            raise ValueError("Invalid facility row; inspect source before importing")
        entries.append(dict(zip(("country", "port", "mode"), row)))
finally:
    workbook.close()
target = Path(__file__).resolve().parents[1] / "frontend/lib/data/workbook-ports.json"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({"source": args.workbook.name, "sha256": hashlib.sha256(args.workbook.read_bytes()).hexdigest(), "rows": entries}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Extracted {len(entries)} rows. Run node scripts/build-port-catalog.mjs next.")
