# Hoshino — Dictionary Build Pipeline

This directory contains the Node.js/TypeScript data pipeline that generates
`assets/hoshino.db` — the pre-built SQLite database shipped with the app.

## Quick Start

### 1. Download raw data sources (~500 MB)

```bash
./scripts/download-sources.sh
```

This fetches and decompresses:

| File | Source | Size (approx.) |
|---|---|---|
| `JMdict_e.xml` | EDRDG (Japanese dictionary) | ~60 MB |
| `kanjidic2.xml` | EDRDG (Kanji dictionary) | ~20 MB |
| `jpn_sentences.tsv` | Tatoeba | ~50 MB |
| `eng_sentences.tsv` | Tatoeba | ~200 MB |
| `links.csv` | Tatoeba | ~150 MB |
| `jpn_indices.csv` | Tatoeba | ~15 MB |

The script is **idempotent** — files that already exist are skipped.

### 2. (Optional) Add supplementary JLPT data

For more accurate JLPT level tagging, place a `jlpt-vocab.json` file in
`scripts/sources/` before running the build:

```json
{
  "n5": [1234567, 1234568],
  "n4": [1234569],
  "n3": [],
  "n2": [],
  "n1": []
}
```

The keys are JLPT levels (`n1`–`n5`) and the values are arrays of JMdict entry
IDs. If this file is absent the pipeline falls back to JLPT tags already
embedded in JMdict itself (less complete).

### 3. Build the database

```bash
npm run build:db
```

This runs `tsx scripts/build-dictionary.ts` and writes `assets/hoshino.db`.

## Estimated Build Time & Output

| Phase | Description | Typical time |
|---|---|---|
| 1 | Parse JMdict (~200k entries) | ~30–60 s |
| 2 | Parse KANJIDIC2 (~13k kanji) | ~5 s |
| 3 | Parse Tatoeba examples | ~3–8 min |
| 4 | Apply JLPT levels | <5 s |
| 5 | Seed JLPT lists | <5 s |
| 6 | Build FTS5 index | ~10–30 s |
| 7 | VACUUM + ANALYZE | ~30–60 s |

Total: **~5–10 minutes** on a modern laptop.

Output file size: **~50–80 MB** (varies with Tatoeba coverage).

## Notes

- `scripts/sources/` is listed in `.gitignore`. **Each developer must run
  `download-sources.sh` locally** — raw source files are not committed to the
  repo.
- The build completely replaces `assets/hoshino.db` on each run.
- Source data licences:
  - JMdict / KANJIDIC2: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) — EDRDG
  - Tatoeba sentences: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) — Tatoeba Project

## TypeScript Config

`scripts/tsconfig.json` targets Node.js (ESNext modules, CommonJS-compatible
via `tsx`). It is separate from the root `tsconfig.json` which targets React
Native.
