#!/usr/bin/env bash
# DBIM 4.1: self-host Noto Sans, subsetted per script, weights 400/500/600/700.
# Needs network + fonttools (pip install fonttools brotli). Run once, commit the
# woff2 files. Source: github.com/notofonts (OFL-1.1 licence).
set -euo pipefail
OUT="$(dirname "$0")/../frontend/fonts"; mkdir -p "$OUT"; cd "$OUT"
BASE="https://github.com/notofonts"
declare -A SRC=( [latin]="latin-greek-cyrillic/main/fonts/NotoSans/googlefonts/ttf/NotoSans"
                 [devanagari]="devanagari/main/fonts/NotoSansDevanagari/googlefonts/ttf/NotoSansDevanagari"
                 [telugu]="telugu/main/fonts/NotoSansTelugu/googlefonts/ttf/NotoSansTelugu" )
declare -A UNI=( [latin]="U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212"
                 [devanagari]="U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20B9,U+25CC,U+A8E0-A8FF"
                 [telugu]="U+0C00-0C7F,U+200C-200D,U+25CC" )
declare -A W=( [400]=Regular [500]=Medium [600]=SemiBold [700]=Bold )
for s in "${!SRC[@]}"; do for w in "${!W[@]}"; do
  # verify the URL layout against the repo before first use; paths change upstream
  curl -fsSL "$BASE/${SRC[$s]%%/*}/raw/${SRC[$s]#*/}-${W[$w]}.ttf" -o "tmp-$s-$w.ttf"
  pyftsubset "tmp-$s-$w.ttf" --unicodes="${UNI[$s]}" --flavor=woff2 --layout-features='*' \
             --output-file="NotoSans-$s-$w.woff2"; rm "tmp-$s-$w.ttf"
done; done
du -ch *.woff2 | tail -1
echo "Add further scripts (Tamil, Kannada, ...) as languages are enabled (DBIM 7.5)."
