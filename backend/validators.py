"""Server-side twin of frontend/validators.js (GuDApps: same rules client and server).
Tested against frontend/tests/validator-vectors.json. Never log, echo or put an
Aadhaar number in a URL; collect it only with explicit consent and purpose.
"""
import re

_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
      [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]]
_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
      [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]]


def _digits(v):
    return re.sub(r"[\s-]", "", "" if v is None else str(v))


def verhoeff(num):
    c = 0
    for i, ch in enumerate(reversed(str(num))):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def required(v):
    return ("" if v is None else str(v)).strip() != ""


def mobile(v):
    d = re.sub(r"^(\+91|91|0)(?=\d{10}$)", "", _digits(v))
    return re.fullmatch(r"[6-9]\d{9}", d) is not None


def pin(v):
    return re.fullmatch(r"[1-9]\d{5}", _digits(v)) is not None


def ifsc(v):
    return re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", ("" if v is None else str(v)).strip().upper()) is not None


def aadhaar(v):
    d = _digits(v)
    return re.fullmatch(r"[2-9]\d{11}", d) is not None and verhoeff(d)


def mask_aadhaar(v):
    d = _digits(v)
    return "XXXX XXXX " + d[8:] if len(d) == 12 else ""


def mask_mobile(v):
    d = re.sub(r"^(\+91|91|0)(?=\d{10}$)", "", _digits(v))
    return "XXXXXX" + d[6:] if len(d) == 10 else ""
