# JSON to Relational CSV Converter

Client-side tool to flatten JSON into analysis-friendly CSVs (with child tables) and back. No uploads; everything runs in the browser.

## Features
- JSON → CSV with nested object flattening and array-of-objects normalization into child tables (`_parent_row_id`, `_index`).
- Optional explode for primitive arrays; keep as strings otherwise.
- CSV → JSON with optional unflattening of dot-path headers; warns on mixed array/object paths.
- Per-table downloads, ZIP (all tables + schema README + SQL), schema README + SQL PK/FK hints.
- Delimiters: comma, semicolon, tab; BOM stripped on CSV import. Tab downloads as `.tsv`.
- Drag & drop or file upload; clipboard copy; example datasets.
- Advanced options are hidden by default (toggleable).
- Privacy-first: processing stays in-browser; no analytics.

## Quick usage
1) Pick mode: JSON → CSV or CSV → JSON.  
2) Paste or upload/drag a file.  
3) (Optional) Set delimiter, explode primitives, naming options (Advanced).  
4) Convert → download main CSV/TSV or child tables; or copy the output.  
5) For JSON → CSV, use schema README/SQL to understand PK/FK: main PK `_row_id`; child PK `(_parent_row_id, _index)` with FK to `main._row_id`.

## Notes & limits
- Best for datasets under ~20MB in-browser (ZIP guardrails).  
- Arrays of mixed types or nested arrays are stringified with a note.  
- Unflattening dot paths is best-effort; mixed array/object paths emit a warning and coerce to object style.  
- Types: arrays/objects map to TEXT in SQL exports; dates emit ISO strings.
