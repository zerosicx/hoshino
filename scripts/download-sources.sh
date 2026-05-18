#!/usr/bin/env bash
# download-sources.sh
# Downloads all raw data sources required by the Hoshino build pipeline.
# Safe to re-run — files that already exist are skipped.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCES_DIR="$SCRIPT_DIR/sources"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
skip()  { echo -e "${YELLOW}[SKIP]${NC}  $*"; }

download_and_decompress_gz() {
  local url="$1"
  local outfile="$2"
  local tmpfile="${outfile}.gz"

  if [[ -f "$outfile" ]]; then
    skip "$outfile already exists."
    return
  fi

  info "Downloading $(basename "$tmpfile") from $url …"
  curl -L --progress-bar -o "$tmpfile" "$url"
  info "Decompressing to $(basename "$outfile") …"
  gunzip -f "$tmpfile"
  ok "$(basename "$outfile") ready."
}

download_and_decompress_bz2() {
  local url="$1"
  local outfile="$2"
  local tmpfile="${outfile}.bz2"

  if [[ -f "$outfile" ]]; then
    skip "$outfile already exists."
    return
  fi

  info "Downloading $(basename "$tmpfile") from $url …"
  curl -L --progress-bar -o "$tmpfile" "$url"
  info "Decompressing to $(basename "$outfile") …"
  bunzip2 -f "$tmpfile"
  ok "$(basename "$outfile") ready."
}

download_and_decompress_tar_bz2() {
  local url="$1"
  local expected_file="$2"   # the file we expect after extraction
  local archive_name="$3"    # local name for the .tar.bz2

  if [[ -f "$expected_file" ]]; then
    skip "$(basename "$expected_file") already exists."
    return
  fi

  local tmpfile="$SOURCES_DIR/$archive_name"
  info "Downloading $archive_name from $url …"
  curl -L --progress-bar -o "$tmpfile" "$url"
  info "Extracting $archive_name …"
  tar -xjf "$tmpfile" -C "$SOURCES_DIR"
  rm -f "$tmpfile"
  ok "$(basename "$expected_file") ready."
}

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

echo ""
echo "Hoshino — Source Data Downloader"
echo "================================="
echo "Destination: $SOURCES_DIR"
echo ""

mkdir -p "$SOURCES_DIR"

# ---------------------------------------------------------------------------
# JMdict (EDICT Japanese dictionary)
# License: Creative Commons Attribution-ShareAlike 4.0
# Source:  https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project
# ---------------------------------------------------------------------------

echo ""
echo "--- JMdict ---"
download_and_decompress_gz \
  "https://www.edrdg.org/pub/Nihongo/JMdict_e.gz" \
  "$SOURCES_DIR/JMdict_e.xml"

# ---------------------------------------------------------------------------
# KANJIDIC2
# License: Creative Commons Attribution-ShareAlike 4.0
# Source:  https://www.edrdg.org/wiki/index.php/KANJIDIC_Project
# ---------------------------------------------------------------------------

echo ""
echo "--- KANJIDIC2 ---"
download_and_decompress_gz \
  "https://www.edrdg.org/kanjidic/kanjidic2.xml.gz" \
  "$SOURCES_DIR/kanjidic2.xml"

# ---------------------------------------------------------------------------
# Tatoeba sentence corpus
# License: Creative Commons Attribution 2.0
# Source:  https://tatoeba.org/en/downloads
# ---------------------------------------------------------------------------

echo ""
echo "--- Tatoeba: Japanese sentences ---"
download_and_decompress_bz2 \
  "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2" \
  "$SOURCES_DIR/jpn_sentences.tsv"

echo ""
echo "--- Tatoeba: English sentences ---"
download_and_decompress_bz2 \
  "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2" \
  "$SOURCES_DIR/eng_sentences.tsv"

echo ""
echo "--- Tatoeba: Sentence links ---"
download_and_decompress_tar_bz2 \
  "https://downloads.tatoeba.org/exports/links.tar.bz2" \
  "$SOURCES_DIR/links.csv" \
  "links.tar.bz2"

echo ""
echo "--- Tatoeba: Japanese indices (JMdict links) ---"
download_and_decompress_tar_bz2 \
  "https://downloads.tatoeba.org/exports/jpn_indices.tar.bz2" \
  "$SOURCES_DIR/jpn_indices.csv" \
  "jpn_indices.tar.bz2"

# ---------------------------------------------------------------------------
# Kanji JLPT N1-N5 data (davidluzgouveia/kanji-data)
# License: MIT
# Source:  https://github.com/davidluzgouveia/kanji-data
# Provides jlpt_new (1=N1 … 5=N5) for all 13,108 KANJIDIC2 kanji.
# KANJIDIC2 only carries the old 4-level JLPT system; this overlays the
# correct N1-N5 classification maintained by the community.
# ---------------------------------------------------------------------------

echo ""
echo "--- Kanji JLPT N1-N5 overlay ---"
KANJI_DATA_PATH="$SOURCES_DIR/kanji-jlpt.json"
if [[ -f "$KANJI_DATA_PATH" ]]; then
  skip "$KANJI_DATA_PATH already exists."
else
  info "Downloading kanji-jlpt.json from davidluzgouveia/kanji-data …"
  curl -L --progress-bar \
    -o "$KANJI_DATA_PATH" \
    "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json"
  ok "kanji-jlpt.json ready."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "================================="
echo "Download complete. Source sizes:"
echo ""
du -sh "$SOURCES_DIR"/* 2>/dev/null | sort -h || true
echo ""
TOTAL=$(du -sh "$SOURCES_DIR" 2>/dev/null | cut -f1)
echo "Total: $TOTAL"
echo ""
echo "Next step: npm run build:db"
echo ""
