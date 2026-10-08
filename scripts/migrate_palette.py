#!/usr/bin/env python3
"""One-off Phase 1 migration: map the legacy indigo palette onto the DBIM 3.0
palette (Green group + functional palette). DBIM 2.1 / 2.2. Kept in repo so the
mapping is auditable. Usage: migrate_palette.py file [file ...]"""
import re, sys, colorsys
KEY, MID, LIGHT, TINT = "#0F5757", "#2D8686", "#A6D9D9", "#D9F2F2"
LINEN, WHITE, BROWN, BLACK = "#EBEAEA", "#FFFFFF", "#150202", "#000000"
G1, G2, G3 = "#C6C6C6", "#8E8E8E", "#606060"
SUCCESS, WARN, ERR, INFO = "#198754", "#FFC107", "#DC3545", "#0D6EFD"
EXACT = {"#2f6fed": INFO, "#4d6bff": INFO, "#1a3f9c": KEY, "#001a8f": KEY, "#0b3bd6": KEY,
         "#000000": BLACK, "#ffffff": WHITE, "#ffff00": WARN, "#ffe57f": WARN, "#ffd54f": WARN}

def classify(hx):
    h = hx.lower()
    if h in EXACT: return EXACT[h]
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (1, 3, 5))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    hd = hh * 360
    if s < 0.12:
        for lim, out in ((0.97, WHITE), (0.88, LINEN), (0.75, G1), (0.55, G2), (0.3, G3), (0.08, BROWN)):
            if l > lim: return out
        return BLACK
    if hd < 15 or hd > 340:           # red / pink
        return LINEN if l > 0.85 else (ERR if l > 0.4 else BROWN)
    if 15 <= hd < 70:                 # orange / yellow
        return LINEN if l > 0.85 else (WARN if l > 0.5 else BROWN)
    if 70 <= hd < 170:                # green
        return LINEN if l > 0.85 else (SUCCESS if l > 0.35 else KEY)
    # cyan / blue / indigo / purple -> selected colour group
    if l > 0.93: return WHITE
    if l > 0.80: return TINT
    if l > 0.65: return LIGHT
    if l > 0.45: return MID
    return KEY

RGBA = {(45,55,140): (21,2,2), (18,22,45): (21,2,2), (12,16,40): (21,2,2),
        (61,77,184): (15,87,87), (226,72,63): (220,53,69)}

def sub_rgba(m):
    r, g, b, a = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
    nr, ng, nb = RGBA.get((r, g, b), (r, g, b))
    return f"rgba({nr},{ng},{nb},{a})"

def fs_token(n):
    return ("sm" if n < 12 else "p2" if n < 14 else "p1" if n < 18 else
            "h3" if n < 22 else "h2" if n < 30 else "h1")

def run(path):
    s = open(path, encoding="utf-8").read()
    s = re.sub(r"#[0-9a-fA-F]{6}\b", lambda m: classify(m.group(0)), s)
    s = re.sub(r"rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)", sub_rgba, s)
    if path.endswith(".css"):
        def _fs_repl(m):
            return "calc(var(--dbim-fs-%s) * var(--pm-text-scale, 1))" % fs_token(float(m.group(1)))
        s = re.sub(r"calc\(([\d.]+)px \* var\(--pm-text-scale, ?1\)\)", _fs_repl, s)
        for hx, v in ((KEY, "--dbim-key"), (MID, "--dbim-mid"), (LIGHT, "--dbim-light"), (TINT, "--dbim-tint")):
            s = re.sub(re.escape(hx), f"var({v})", s, flags=re.I)
    open(path, "w", encoding="utf-8").write(s)

for p in sys.argv[1:]: run(p)
