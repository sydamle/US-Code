#!/usr/bin/env bash
# fetch_all_titles.sh — Download, parse, and assemble all US Code titles.
#
# Usage:
#   cd /path/to/US-Code
#   bash scripts/fetch_all_titles.sh
#
# What it does:
#   1. Downloads each available title ZIP from uscode.house.gov
#   2. Unzips and parses the XML → t{N}.json + title_toc_*.json in public/data/
#   3. Runs build_toc.py to combine all title TOCs → src/data/toc.json
#
# Environment:
#   RELEASE   Release point (default: 119-73not60)
#   TITLES    Space-separated list of title numbers to fetch (default: all)
#   SKIP_EXISTING  Set to 1 to skip titles whose t{N}.json already exists

set -euo pipefail

RELEASE="${RELEASE:-119-73not60}"
# Congress/law derived from release: 119-73not60 → 119/73not60
CONGRESS="${RELEASE%%-*}"
LAW="${RELEASE#*-}"
BASE_URL="https://uscode.house.gov/download/releasepoints/us/pl/${CONGRESS}/${LAW}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATA_DIR="${PROJECT_DIR}/public/data"
TOC_SRC="${PROJECT_DIR}/src/data/toc.json"
TMP_DIR="${PROJECT_DIR}/.title_downloads"

mkdir -p "${DATA_DIR}" "${TMP_DIR}"

# US Code titles that exist as enacted law (Title 53 not yet enacted)
ALL_TITLES="1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 54"

TITLES="${TITLES:-$ALL_TITLES}"

echo "======================================================"
echo "US Code fetch+parse pipeline"
echo "Release point: ${RELEASE}"
echo "Output data:   ${DATA_DIR}"
echo "======================================================"
echo ""

PARSED=0
SKIPPED=0
FAILED=()

for TNUM in $TITLES; do
    TNUM_PADDED=$(printf "%02d" "$TNUM")
    ZIP_URL="${BASE_URL}/xml_usc${TNUM_PADDED}@${RELEASE}.zip"
    JSON_OUT="${DATA_DIR}/t${TNUM}.json"
    TOC_OUT="${DATA_DIR}/title_toc_${TNUM_PADDED}.json"

    if [[ "${SKIP_EXISTING:-0}" == "1" && -f "${JSON_OUT}" && -f "${TOC_OUT}" ]]; then
        echo "[Title ${TNUM}] Already exists, skipping."
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo "──────────────────────────────────────────────────"
    echo "[Title ${TNUM}] Downloading ${ZIP_URL} ..."

    WORK_DIR="${TMP_DIR}/t${TNUM}"
    rm -rf "${WORK_DIR}"
    mkdir -p "${WORK_DIR}"

    ZIP_FILE="${WORK_DIR}/title.zip"

    # Download with retry (up to 3 attempts)
    DOWNLOADED=0
    for ATTEMPT in 1 2 3; do
        if curl -fsSL \
            -H "User-Agent: Mozilla/5.0 (compatible; USCodeBrowser/1.0)" \
            -H "Referer: https://uscode.house.gov/download/download.shtml" \
            --connect-timeout 30 \
            --max-time 300 \
            -o "${ZIP_FILE}" \
            "${ZIP_URL}"; then
            DOWNLOADED=1
            break
        else
            echo "[Title ${TNUM}] Download attempt ${ATTEMPT} failed, retrying..."
            sleep $((ATTEMPT * 2))
        fi
    done

    if [[ $DOWNLOADED -eq 0 ]]; then
        echo "[Title ${TNUM}] FAILED to download after 3 attempts — skipping."
        FAILED+=("$TNUM")
        rm -rf "${WORK_DIR}"
        continue
    fi

    # Unzip
    echo "[Title ${TNUM}] Unzipping..."
    if ! unzip -q -o "${ZIP_FILE}" -d "${WORK_DIR}"; then
        echo "[Title ${TNUM}] FAILED to unzip — skipping."
        FAILED+=("$TNUM")
        rm -rf "${WORK_DIR}"
        continue
    fi

    # Find the XML file
    XML_FILE=$(find "${WORK_DIR}" -name "*.xml" -not -name "*_uslm*dtd*" | head -1)
    if [[ -z "${XML_FILE}" ]]; then
        echo "[Title ${TNUM}] No XML file found in ZIP — skipping."
        FAILED+=("$TNUM")
        rm -rf "${WORK_DIR}"
        continue
    fi

    echo "[Title ${TNUM}] Parsing ${XML_FILE}..."
    if ! python3 "${SCRIPT_DIR}/parse_xml.py" "${XML_FILE}" "${WORK_DIR}/out"; then
        echo "[Title ${TNUM}] FAILED to parse — skipping."
        FAILED+=("$TNUM")
        rm -rf "${WORK_DIR}"
        continue
    fi

    # Copy outputs to public/data/
    cp "${WORK_DIR}/out/t${TNUM}.json" "${JSON_OUT}"
    cp "${WORK_DIR}/out/title_toc.json" "${TOC_OUT}"

    # Clean up work directory to save disk space
    rm -rf "${WORK_DIR}"

    echo "[Title ${TNUM}] Done. $(wc -c < "${JSON_OUT}") bytes"
    PARSED=$((PARSED + 1))
done

echo ""
echo "======================================================"
echo "Parsed: ${PARSED} titles"
echo "Skipped: ${SKIPPED} titles"
if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo "Failed:  ${FAILED[*]}"
fi
echo ""

# Build the master toc.json from all title_toc_*.json files
echo "Building master toc.json..."
python3 "${SCRIPT_DIR}/build_toc.py" "${DATA_DIR}" "${TOC_SRC}"

# Clean up temp directory
rm -rf "${TMP_DIR}"

echo ""
echo "Done! Data is in ${DATA_DIR}/"
echo "TOC is at ${TOC_SRC}"
