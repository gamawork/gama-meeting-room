#!/usr/bin/env python3
"""score.py — film B v2's sound, placed from the comp itself.

  python3 score.py      → events.json (the comp's __events(), log zoom and level L at 240 Hz) → sfx.wav

Synthesised only (sfx_palette.py materials, one room); nothing downloaded, no music.
The take is the instrument: air whose level follows how fast the take is moving — |d log zoom / dt| + |dL / dt|
(the unfold, the widening and the collapse move the layout, not only the camera) — and whose brightness follows depth.
One sound per gesture; both rests silent.
"""
import asyncio, json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.expanduser("~"), ".claude", "skills", "onetake", "scripts"))
from sfx_palette import Score, air, glass, wood, sub, bubble, lp, hp, bp, SR
from playwright.async_api import async_playwright

HZ = 240

async def dump():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file:///" + os.path.join(HERE, "comp.html").replace("\\", "/")); await pg.evaluate("window.__ready")
        ev = await pg.evaluate("window.__events()")
        lz = await pg.evaluate(f"Array.from({{length: {15 * HZ + 1}}}, (_, i) => window.__logZoom(i / {HZ}))")
        lv = await pg.evaluate(f"Array.from({{length: {15 * HZ + 1}}}, (_, i) => window.__level(i / {HZ}))")
        await b.close()
    json.dump({"events": ev, "logzoom": lz, "level": lv, "hz": HZ}, open(os.path.join(HERE, "events.json"), "w"))
    return ev, np.array(lz), np.array(lv)

ev, LZ, LV = asyncio.run(dump())
E = ev["events"]; T = ev["T"]
at = lambda kind: [e for e in E if e["kind"] == kind]
s = Score(dur=15.0, T60=1.1); place = s.place
rng = np.random.default_rng(24)

# ── the take's air: level from its speed, brightness from depth ────────────────────────────────────
speed = np.abs(np.gradient(LZ) * HZ) + 0.9 * np.abs(np.gradient(LV) * HZ)
depth = np.clip((LZ - np.log(0.6)) / (np.log(3) - np.log(0.6)) * 0.6 + LV / 2 * 0.4, 0, 1)
n = int(SR * 15); tt = np.arange(n) / SR
v = np.interp(tt, np.arange(len(speed)) / HZ, speed); d = np.interp(tt, np.arange(len(depth)) / HZ, depth)
env = (v / (v.max() + 1e-9)) ** 1.3
noise = np.random.default_rng(3).standard_normal(n)
lo, mid, hi = bp(noise, 380, 0.7), bp(noise, 1300, 0.8), hp(lp(noise, 9000), 2400)
bands = lo * np.clip(1.2 - d * 1.2, 0.15, 1) + mid * (0.5 + 0.5 * d) + 0.35 * hi * d ** 1.5
take_air = bands * env; take_air /= np.abs(take_air).max() + 1e-9
place(take_air, 0.0, 0.34, 0.0, 0.55)

# ── the month fills: three glass notes as the entries land ─────────────────────────────────────────
for e, f in zip(at("fill"), (880, 988, 1175)): place(glass(f, 0.7, 0.5), e["t"], 0.09, e["pan"], 0.5)
# ── clicks: mouse down / up; the Subject click stays soft ──────────────────────────────────────────
for e in at("click"):
    g0 = 0.16 if abs(e["t"] - T["CLICK_SUBJ"]) < 1e-6 else 0.32
    place(wood(240, 0.08), e["t"], g0, e["pan"] * 0.6, 0.2); place(wood(190, 0.07), e["t"] + 0.06, g0 * 0.7, e["pan"] * 0.6, 0.2)
# ── the hover box appears: one thin glass ─────────────────────────────────────────────────────────
for e in at("hover"): place(glass(1568, 0.5, 0.3), e["t"], 0.07, e["pan"] * 0.6, 0.6)
# ── the half hour opens: a breath of air, a rounded pop as the dialog settles ──────────────────────
o = at("open")[0]["t"]; place(air(0.5, 260, 2600, 1.3, 0.35), o - 0.05, 0.28, 0.0, 0.5); place(bubble(380, 0.26), o + 0.3, 0.2, 0.0, 0.3)
# ── typing: muted keys, about one in three ─────────────────────────────────────────────────────────
for e in at("key"):
    if rng.uniform() < 0.62: continue
    place(wood(170 + rng.uniform(-20, 20), 0.09), e["t"] + rng.uniform(0, 0.004), 0.09 * rng.uniform(0.7, 1.3), e["pan"] * 0.5, 0.15)
# ── Confirm: the dialog folds (falling air), lands yellow (felt sub + pop); the toast one glass ─────
f0 = at("fold")[0]["t"]; place(air(0.42, 2400, 380, 1.4, 0.55), f0, 0.22, 0.0, 0.5)
L = at("land")[0]; place(sub(64, 0.8), L["t"], 0.5, L["pan"] * 0.5, 0.35); place(bubble(520, 0.24), L["t"], 0.24, L["pan"] * 0.5, 0.3)
tt0 = at("toast")[0]["t"]; place(glass(1319, 0.8, 0.5), tt0 + 0.05, 0.08, 0.0, 0.5)
# ── rest: nothing. The collapse is the air alone; the block lands in the month ─────────────────────
D = at("dot")[0]; place(sub(55, 0.9), D["t"], 0.32, D["pan"] * 0.6, 0.4); place(glass(784, 1.3, 0.45), D["t"] + 0.01, 0.15, D["pan"] * 0.6, 0.6)
# ── the name: one low glass, then silence to the end ──────────────────────────────────────────────
w0 = at("word")[0]["t"]; place(glass(523, 1.8, 0.3), w0, 0.12, -0.3, 0.7)

s.write(os.path.join(HERE, "sfx.wav"))
