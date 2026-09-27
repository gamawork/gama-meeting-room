# Film B v2 — 「月到半小時」 on the real My Calendar tab

Concept unchanged from v1: one take from a whole month down to one free half hour, the half hour opens into the
booking form, Confirm folds it shut, and the take returns to the month. No hard cut anywhere (the end title rises
beside the app, it is not a cut).

What changed: every level is now the product's own screen (shots-v2/02, 03, 04, 04c, 05b, 06). World units are
the screenshot's pixel frame, so at zoom 1 the film is the screenshot. The product's views are not nested inside
each other, so the take carries each one into the next with one level parameter L(t) ∈ [0, 2]:
- month → week: the 9/21–27 row unfolds vertically into the time grid; its entries fly to their times; other weeks slide out;
- week → day: the Thu column widens into the six room columns, the time axis stays put, the other days squeeze out;
- day → 30 min: the camera pushes 3× into 302 · 14:00; the product's dashed hover box becomes the New Booking dialog.
The way back is the same L run backwards (day → week → month), fast, on expoInOut.

Carriers across the whole film: the product's scale capsule (MONTH / WEEK / DAY, yellow label, ▾ on week and day;
pinned top-left once the camera goes deep), the cursor (it causes every change: Week, Thu header, the slot, Subject,
Confirm, Month), the meetings themselves (the same element moves from month entry → week block → day block).

| t | beat | what moves | what is still | what carries into the next beat |
|---|---|---|---|---|
| 0.00–1.40 | My Calendar, month | slow settle 0.955 → 1; this week's entries and 9/29, 9/30 pop in | app shell, tabs, Iris chip, bell | the month grid |
| 1.40–1.80 | choose Week | cursor to the Month/Week/Day switch, clicks Week (1.72) | camera dead still | the 9/21–27 row |
| 1.80–2.90 | the week unfolds | row grows into the 09:00–18:00 grid; entries fly to their slots (Wed 10:00 splits into two lanes); navy head + time column resolve; capsule → WEEK 9/21 – 9/27 ▾, count Mine 7 · All 11 | — | the Thu column |
| 2.90–3.75 | the week | cursor to the Thu header, clicks (3.70); red now-line on Sun 10:00 | camera still | the Thu column |
| 3.75–4.75 | the day widens | Thu column widens into 302 / 301 / Pantry / Studio / Lounge / Reception Area; Morning Check-in slides into 302; others' meetings fade in grey; capsule → DAY Thu, 9/24 ▾; toolbar re-lays out as the product's day view | time rows | the day grid |
| 4.75–5.75 | the gap | cursor glides to 302 · 14:00; the product's hover box "14:00 – 14:30 Free" (5.30); click (5.70) | camera still | the hover box |
| 5.75–6.45 | into the half hour | camera 1.06 → 3 onto the slot | — | the hover box |
| 6.30–6.85 | the half hour opens | hover box unrolls into the New Booking dialog; page dims; Date / Start / End / Room / Organizer = Iris arrive pre-filled; green "302 is free · 30 min" | camera | the dialog |
| 6.85–7.95 | book it | click Subject (6.90), "New Feature Kickoff" types (7.00–7.59), click Confirm (7.95) | camera held | the dialog |
| 8.05–8.75 | it folds shut | dialog collapses into the slot, lands yellow (8.50, squash); camera 3 → 1.06; others fade to 30 %; count Mine 2 · All 5 | — | the yellow block |
| 8.70–9.55 | booked | toast "Added: New Feature Kickoff (302, 14:00–14:30)" rises, then nothing moves | **dead still ≈0.8 s** | the yellow block |
| 9.55–9.95 | back to the month | cursor to Month, clicks (9.95) | — | the yellow block |
| 10.00–11.30 | the whole way out | L 2 → 0 on expoInOut + camera 1.06 → 0.6: the day narrows to Thu, the week folds to its row, the yellow block rides into 9/24's cell as "14:00 New Feature Kickoff"; capsule → MONTH 9/2026; count Mine 10 · All 14 | — | the month |
| 11.30–12.30 | the name | "GAMA MEETING ROOM" / "My Calendar" rise left of the app, tagline 11.90 | app | end |
| 12.30–15.00 | lockup | nothing moves | **dead still 2.7 s** | — |

Shot lengths (s): 1.40 · 0.40 · 1.10 · 0.85 · 1.00 · 1.00 · 0.70 · 0.55 · 1.10 · 0.70 · 0.85 · 0.40 · 1.30 · 1.00 · 2.70 —
shortest 0.40, longest 2.70 (6.8×).

Data: the product's mock (fictional) — me = Iris; Leo, Sam, Priya, Noah; rooms 302, 301, Pantry, Reception Area, and
the two rooms named after people shown as Studio and Lounge. The "Who are you?" picker (real colleague list) never
appears.

Sound (score.py from `__events()`): air driven by the take's speed — |d log zoom / dt| plus |dL/dt| — brighter with
depth; wood clicks on the six clicks (soft on Subject); keys one in three; a pop as the dialog opens; falling air
as it folds and a felt sub + bubble as it lands yellow; the toast a thin glass; one sub + glass when the block lands in
the month; one low glass under the title; silence in both rests.
