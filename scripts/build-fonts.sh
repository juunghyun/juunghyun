#!/usr/bin/env bash
# 카드 SVG 에 심을 Wanted Sans 부분집합(woff2)과 글자 폭 표를 만든다. 산출물은 커밋하고, 글자 범위를 바꿀 때만 다시 돌린다.
# 필요: uv, Wanted Sans OTF(OFL 1.1 — 저작권 · 라이선스 표기는 name 테이블에 그대로 남긴다)
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${WANTED_SANS_DIR:-$HOME/Library/Fonts}"
UNICODES="U+0020-007E,U+00B7,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026"

mkdir -p assets/fonts
for pair in 400:Regular 600:SemiBold; do
  uvx --from 'fonttools[woff]' pyftsubset "$SRC/WantedSans-${pair#*:}.otf" --unicodes="$UNICODES" \
    --layout-features='' --name-IDs='*' --desubroutinize --no-hinting \
    --flavor=woff2 --output-file="assets/fonts/wanted-sans-${pair%%:*}.woff2"
done

# 커닝을 뺐으므로(--layout-features='') 글자 폭의 합이 곧 문자열 폭이다.
uv run --no-project --with 'fonttools[woff]' python - <<'PY'
import json
from fontTools.ttLib import TTFont

widths = {}
for weight in ("400", "600"):
    font = TTFont(f"assets/fonts/wanted-sans-{weight}.woff2")
    upm, hmtx = font["head"].unitsPerEm, font["hmtx"]
    widths[weight] = {chr(code): hmtx[glyph][0] / upm for code, glyph in sorted(font.getBestCmap().items())}
with open("assets/fonts/wanted-sans-widths.json", "w") as out:
    json.dump(widths, out, ensure_ascii=False, separators=(",", ":"))
PY
ls -l assets/fonts
