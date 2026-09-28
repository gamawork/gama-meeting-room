# Film B v3 — 「My Calendar 整頁切換」 on the real My Calendar tab (20 s)

Concept: one take through the whole My Calendar page — Month → Week, Mine ⇄ All in the week, Week → Day, a short
booking (≈ 4 s), back to the month, All once more, the name. No hard cut anywhere (the end title rises beside the
app, it is not a cut). v2's 「月到半小時」 dive is now one beat of the film, not the film.

Every level is the product's own screen (shots-v2/02, 03, 04, 04c, 05b, 06). World units are the screenshot's pixel
frame, so at zoom 1 the film is the screenshot. The views are not nested inside each other, so the take carries
each one into the next:
- month → week: one level parameter L(t) ∈ [0, 2]; the 9/21–27 row unfolds into the time grid, its entries fly to their slots;
- Mine ⇄ All: one filter value per meeting, allK(t), with a per-meeting delay (by day, then time) so everyone
  else's meetings pop in one by one; lanes re-split exactly as the product's `mycalLanes` (Fri's Web Admin
  Discussion gives up half its width to Web Weekly); others are the product's grey `.mycal-other`;
- week → day: the Thu column widens into the six room columns; the day always shows everyone (as the product);
- the booking: a 3× push into 302 · 14:00, the hover box becomes the dialog, Confirm folds it back yellow;
- day → month: L run backwards on expoInOut; the yellow block rides into 9/24; the product drops the yellow 2.6 s after saving.

Carriers across the whole film: the scale capsule (MONTH / WEEK / DAY), the cursor (it causes every change:
Week, All, Mine, Thu header, the slot, Subject, Confirm, Month, All), the meetings themselves (the same element is a
month entry, a week block and a day block), the Mine / All toggle whose navy thumb slides to what the hand picked.

| t | beat | what moves | what is still | what carries into the next beat |
|---|---|---|---|---|
| 0.00–1.30 | My Calendar, month · Mine | slow settle 0.955 → 1; this week's entries and 9/29, 9/30 pop in; "Mine 9 · All 47" | app shell, tabs, Ryan chip, bell | the month grid |
| 1.30–1.62 | choose Week | cursor to Month/Week/Day, clicks Week (1.55) | camera still | the 9/21–27 row |
| 1.62–2.72 | the week unfolds | row grows into the 09:00–18:00 grid; entries fly to their slots; capsule → WEEK 9/21 – 9/27 ▾, "Mine 7 · All 23" | — | the week grid, the cursor |
| 2.72–3.10 | choose All | cursor to the Mine / All toggle, clicks All (3.10); thumb slides to All; "All 23" flashes | camera still | the cursor, Ryan's blocks |
| 3.16–4.10 | everyone arrives | 16 grey meetings pop in column by column (GCAS, Weekly, Meeting · Online Meeting … Bi-weekly); Fri's block halves; camera leans in 1.06 → 1.11, anchored on the toggle | Ryan's blocks | the full week |
| 4.13–4.93 | the full week | nothing | **dead still 0.8 s** | the cursor on All |
| 4.93–5.50 | back to Mine | cursor slides to Mine, clicks (5.50); "Mine 7" flashes | — | the cursor |
| 5.54–6.20 | everyone leaves | grey meetings shrink away, Fri's block widens back; camera eases back to 1.06 | Ryan's blocks | the Thu column |
| 6.20–6.60 | choose a day | cursor to the Thu header, clicks (6.55) | camera still | the Thu column |
| 6.60–7.60 | the day widens | Thu column widens into 302 / 301 / Pantry / Studio / Lounge / Reception Area; everyone's Thu meetings fade in grey; capsule → DAY Thu, 9/24 ▾; "Mine 1 · All 7"; toolbar re-lays out | time rows | the day grid |
| 7.60–8.40 | the gap | cursor glides to 302 · 14:00; hover box "14:00 – 14:30 Free" (8.05); click (8.35) | camera still | the hover box |
| 8.40–9.05 | into the half hour | camera 1.06 → 3 onto the slot; hover box unrolls into New Booking (8.90), pre-filled, Organizer = Ryan | — | the dialog |
| 9.05–10.30 | book it | click Subject (9.40), "Project Meeting" types (9.48–9.95), click Confirm (10.30) | camera held | the dialog |
| 10.38–11.08 | it folds shut | dialog collapses into the slot, lands yellow (10.82, squash); camera 3 → 1.06; others fade to 30 %; "Mine 2 · All 8"; toast | — | the yellow block |
| 11.10–11.55 | booked | toast "Added: Project Meeting (302, 14:00–14:30)" | near still ≈ 0.45 s | the yellow block |
| 11.55–12.10 | back to the month | cursor to Month, clicks (12.05) | — | the yellow block |
| 12.10–13.25 | the whole way out | L 2 → 0 on expoInOut + camera 1.06 → 0.985 → 1: the day narrows to Thu, the week folds to its row, the yellow block rides into 9/24 as "14:00 Project Meeting"; capsule → MONTH 9/2026; "Mine 10 · All 48" | — | the month |
| 13.60–13.95 | the highlight wears off | yellow → 302 blue, the 30 % dimming lifts (the product clears it 2.6 s after saving) | — | the cursor |
| 13.30–14.05 | All again | cursor to the toggle, clicks All (14.05) | — | the cursor |
| 14.10–14.90 | the month fills | everyone's weekly meetings pop in cell by cell, top-left to bottom-right; cells re-sort by time; "+3 more" (9/23), "+4 more" (9/24, the new booking goes under it — the product shows 4 per cell); cursor leaves | — | the month |
| 14.90–15.30 | the full month | nothing | still ≈ 0.4 s | the app |
| 15.30–16.20 | the name | camera 1 → 0.6, the app slides right; "GAMA MEETING ROOM" / "My Calendar" rise left of it (15.62), tagline (16.20) | — | end |
| 16.50–20.00 | lockup | nothing moves | **dead still 3.5 s** | — |

Shot lengths (s): 1.30 · 0.32 · 1.10 · 0.38 · 0.94 · 0.80 · 0.57 · 0.66 · 0.40 · 1.00 · 0.80 · 0.65 · 1.25 · 0.70 · 0.45 ·
0.55 · 1.15 · 0.35 · 0.75 · 0.80 · 0.40 · 0.90 · 3.50 — shortest 0.32, longest 3.50 (11×).

Data: real titles and people from the bookings table — me = Ryan. Ryan's week and v2's three grey "others" (TSE Weekly,
SDLC Progress, AI Workshop) unchanged. All adds the 13-meeting catalog in plan-film1-v3 (GCAS, Weekly, Meeting,
Meeting, Online Meeting, Process Review, AI Collab Weekly, DBA Weekly, Web Weekly, Admin Demo, Web Weekly,
Web Admin Progress, Bi-weekly; TY, Mei, Jessie, Rex, Victor, Ivory, Joanne); none collides with Ryan's, and 302 ·
Thu 14:00–14:30 stays free. The month's All repeats the weekly ones every week (also in the grey out-of-month cells,
as the product does). Counts are computed from that data (`counts()`), never typed. Rooms named after people are
shown as Studio and Lounge. The "Who are you?" picker never appears.

Sound (score.py from `__events()`): air driven by the take's speed — |d log zoom / dt| plus |dL/dt| — brighter with
depth; wood clicks on the nine clicks (soft on Subject); a breath of air and a short glass run as everyone arrives
(week and month), falling air as they leave; keys one in three; a pop as the dialog opens; falling air as it folds
and a felt sub + bubble as it lands yellow; the toast a thin glass; one sub + glass when the block lands in the
month; one low glass under the title; silence in the rests.
