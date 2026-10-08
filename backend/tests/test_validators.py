import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import validators as V  # noqa: E402

VEC = json.load(open(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "tests", "validator-vectors.json"), encoding="utf-8"))


class ValidatorVectors(unittest.TestCase):
    def test_vectors(self):
        for name in ("mobile", "pin", "ifsc", "aadhaar"):
            fn = getattr(V, name)
            for v in VEC[name]["valid"]:
                self.assertTrue(fn(v), f"{name} should accept {v}")
            for v in VEC[name]["invalid"]:
                self.assertFalse(fn(v), f"{name} should reject {v!r}")

    def test_mask(self):
        for src, out in VEC["maskAadhaar"]:
            self.assertEqual(V.mask_aadhaar(src), out)


if __name__ == "__main__":
    unittest.main()
