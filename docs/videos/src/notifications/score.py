#!/usr/bin/env python3
"""score.py — film C's sound, placed from the comp's own __events().

  python3 score.py   → events.json → sfx.wav

Synthesised only (sfx_palette.py materials in one room); no downloaded sources, no music.
The bell is the instrument: every notification is the same two-note glass chime, pitched by what it says
(new/changed rise, reminder soft and repeated, cancelled falls). Clicks are wood, the flight is air,
the bell's hit is sub + glass. The wait before the reminder is three dry clock ticks and nothing else;
the holds are silent.
"""
import asyncio, json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.expanduser("~"), ".claude", "skills", "onetake", "scripts"))
from sfx_palette import Score, air, glass, wood, sub, bubble
from playwright.async_api import async_playwright

DUR = 20.0

async def dump():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1920, "height": 1080})
        await pg.goto("file:///" + os.path.join(HERE, "comp.html").replace("\\", "/")); await pg.evaluate("window.__ready")
        ev = await pg.evaluate("window.__events()")
        await b.close()
    json.dump(ev, open(os.path.join(HERE, "events.json"), "w"), indent=1)
    return ev

ev = asyncio.run(dump())
E = ev["events"]
at = lambda kind: [e for e in E if e["kind"] == kind]
s = Score(dur=DUR, T60=1.0); place = s.place
rng = np.random.default_rng(24)

# Iris turns the bell on: a small bright glass
e = at("bellon")[0]; place(glass(1568, 0.6, 0.6), e["t"], 0.10, e["pan"] * 0.7, 0.5)
# clicks: wood down/up, Confirm and Delete a little firmer
for e in at("click"):
    if e["pan"] > 0 or abs(e["t"] - ev["T"]["M_ATT"]) < 1e-6: continue      # Iris's click on the card and Maya's field click stay silent
    g0 = 0.30 if e["v"] >= 1 else 0.18
    place(wood(240, 0.08), e["t"], g0, e["pan"] * 0.6, 0.2); place(wood(190, 0.07), e["t"] + 0.06, g0 * 0.7, e["pan"] * 0.6, 0.2)
# typing "Iris" and the pill: silent (the picture carries them)
# the booking folds and flies over the midline: one rising air, left to right
f = at("fly")[0]; place(air(f["dur"] + 0.25, 320, 2600, 1.3, 0.3), at("fold")[0]["t"] + 0.1, 0.26, -0.5, 0.45, pan_to=0.6)
# the bell is hit / rings again: felt sub + a struck glass
for e, big in zip(at("ring"), (1.0, 0.6)):
    place(sub(70, 0.6), e["t"], 0.34 * big, e["pan"] * 0.6, 0.3); place(glass(1760, 1.2, 0.8), e["t"] + 0.005, 0.15 * big, e["pan"] * 0.6, 0.6)
# the notifications — one chime material, pitch says what it is
CHIME = {"new": (1175, 1568), "chg": (1047, 1397), "rem": (1319, 1319), "del": (1175, 880)}
for e in at("note"):
    a, b = CHIME[e["note"]]
    place(glass(a, 1.0, 0.7), e["t"] + 0.04, 0.13 * e["v"], e["pan"] * 0.6, 0.55)
    place(glass(b, 1.2, 0.7), e["t"] + 0.16, 0.12 * e["v"], e["pan"] * 0.6, 0.6)
# Iris opens it, it folds into the cell and lands
e = at("land")[0]; place(sub(62, 0.6), e["t"], 0.26, e["pan"] * 0.6, 0.3); place(bubble(480, 0.22), e["t"], 0.16, e["pan"] * 0.6, 0.3)
# the block slides to its new time
e = at("slide")[0]; place(air(0.8, 1600, 500, 1.3, 0.4), e["t"], 0.16, e["pan"] * 0.6, 0.4)
# the clock: three dry ticks in the silence
for e in at("tick"): place(wood(1100, 0.03), e["t"], 0.10, e["pan"] * 0.6, 0.12)
# cancelled: the block snaps shut
e = [x for x in at("note") if x["note"] == "del"][0]; place(wood(150, 0.1), e["t"], 0.22, e["pan"] * 0.6, 0.2)
# the bell lands in the lockup: one low glass, then silence
e = at("lock")[0]; place(glass(587, 1.8, 0.35), e["t"], 0.14, e["pan"] * 0.6, 0.7); place(sub(55, 0.8), e["t"], 0.18, 0.0, 0.3)

s.write(os.path.join(HERE, "sfx.wav"))
ts = sorted(s.events); moments = [t for i, t in enumerate(ts) if i == 0 or t - ts[i - 1] > 0.25]   # layers within 0.25 s = one sound
print("comp events:", len(E), "· placements:", len(ts), "· sound moments (clustered 0.25 s):", len(moments), [round(t, 2) for t in moments])
