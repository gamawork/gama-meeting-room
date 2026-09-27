# Film C — "the bell rings" (desktop notifications) · beat sheet · 20 s

Concept (N1 + N2, chosen by the user): someone else changes a meeting, and my side knows right away. The film follows one
meeting, Urgent Alignment. First Maya adds Iris to it. Then the same cell goes through change, reminder and cancel.
**The bell is the carrier.** It is switched on, rung by Maya's booking, gives out each card and takes it back, and at
the end it flies into the end card. One continuous world with no hard cuts.

Look: the product's own colours (look.json `gama-notify`: navy #244474 / page navy measured from shots-v2, gold
#f4c444 = bell on, white app cards, product room colours). Inter throughout. The notification card is generic: white,
rounded, with a navy "g" tile from the favicon family. It copies no OS toast chrome.

Data (fictional, plan.md): I am Iris. Maya is the organizer. Rooms are 301, 302, Pantry, Studio, Lounge and Reception
Area; Johnny/Jackal Office are renamed. No "Who are you?" list appears.
Copy is assembled exactly as `mycalBuildNotification()` assembles it (index.html:8054–8105, en strings 2918–2927):

| event | title | body |
|---|---|---|
| new | `New meeting` | `Urgent Alignment · 9/24 (Thu) 16:00–17:00 · 301` |
| changed | `Urgent Alignment changed` | `9/24 (Thu) 16:00-17:00 301 → 9/24 (Thu) 14:30-15:30 301` (wrapped before →) |
| reminder | `Starting soon` | `Urgent Alignment starts at 14:30 · 301` |
| cancelled | `Meeting cancelled` | `Urgent Alignment · 9/24 (Thu) 14:30–15:30 · 301` |

| t | beat | what moves | what is still | what carries into the next beat |
|---|---|---|---|---|
| 0.00–0.50 | two screens | Maya's New Booking (left) and Iris's week view (right) spring up; a dotted midline appears; name capsules M Maya / I Iris | ground | both cards |
| 0.50–0.80 | Iris turns the bell on | Iris's cursor clicks the bell: slashed and faint → gold (09a → 09b) | Maya's form | the bell |
| 0.95–1.45 | Maya adds Iris | Maya's cursor clicks Attendees, types "Iris", Enter → chip | Iris's side | the form under Maya's hand |
| 1.78–2.22 | Confirm | Confirm presses; the whole form folds into a red 301 capsule "Urgent Alignment" | — | the capsule (morphRect of the form) |
| 2.22–2.80 | over the midline | capsule hops right on an arc, shrinks into the bell and hits it | — | the capsule → the bell |
| 2.80–3.35 | the bell rings | bell swings (ring-out), camera shake; "New meeting" grows out of the bell (morph bell → card) | — | the card |
| 3.60–4.45 | **read it** | nothing | **dead still 0.85 s** | the card |
| 4.45–5.25 | Iris clicks it | cursor clicks; the card opens into the detail modal (08: Time / Room 301 / Organizer Maya / Attendees Iris / You're an attendee); the page dims | — | the card → modal (one rect) |
| 5.35–6.10 | the detail | nothing | **dead still 0.75 s** | the modal |
| 6.10–6.55 | it becomes its cell | modal folds into Thu 16:00 and lands as the red block (squash); Mine 9 → 10, Thu 2 → 3 mtgs | — | the block |
| 6.70–7.65 | the view opens | Iris's app grows from 0.84× to 1.29×; Maya's capsule glides left and her detail modal (Maya's side) grows out of it | — | block + bell (in the growing app), Maya's capsule → pane |
| 8.05–8.45 | Maya changes the time | Maya clicks the pencil; the Time row rolls 16:00 – 17:00 → 14:30 – 15:30 | Iris's side | the block |
| 8.55–9.55 | **the block slides** | the block springs up three half-hours from 16:00 to 14:30, leaving a dashed ghost that fades (the longest move, 1.0 s) | everything else | the block |
| 9.55–10.05 | changed | bell swings; "Urgent Alignment changed" drops out of the bell with the before → after lines | — | the card |
| 10.10–11.30 | **read it** | nothing | **dead still 1.2 s** | the card |
| 11.30–11.56 | back into the bell | the card folds into the bell (bell gulps) | — | the bell |
| 11.56–13.40 | **the wait** | the red now-line ticks 13:50 → 14:00 → 14:10 → 14:20 (three 0.35 s snaps); nothing else moves | **near-still 1.8 s, dead still between ticks** | the now-line reaching the block |
| 13.40–13.90 | 10 minutes before | the block pulses twice; "Starting soon" grows sideways out of the block | — | the card |
| 13.95–14.95 | **read it** | nothing | **dead still 1.0 s** | the card |
| 14.95–15.21 | back into the bell | the card folds into the bell | — | the bell |
| 15.45–15.75 | Maya deletes | Maya clicks the trash; her modal snaps back into her capsule; Iris's block snaps into "Meeting cancelled" (0.24 s, expoOut); counts back to 9 | — | the card (it *is* the block) |
| 15.80–16.80 | **read it** | nothing | **dead still 1.0 s** | the card |
| 16.80–17.60 | the bell leaves | the card folds into the bell; the app and Maya fade; the bell flies on an arc to the end card and swings once | — | the bell → end card |
| 17.55–18.30 | end card | "Gama Meeting Room" rises word by word beside the bell; "Know the moment your meeting changes." | — | — |
| 18.30–20.00 | **end card hold** | nothing | **dead still 1.7 s** | — |

Shot lengths (s): 0.24 (the cancel snap) · 0.26 (fold-backs) · 0.30 (bell on) · 0.44 · 0.5 · 0.58 · 0.75–1.2 (holds) · 1.0 (slide) ·
1.84 (wait) · 1.7 (end hold). Shortest 0.24, longest 1.84: **7.7×**.

Rests: 3.60–4.45, 5.35–6.10, 10.10–11.30, the wait 11.56–13.40 (still between ticks), 13.95–14.95, 15.80–16.80 and
18.30–20.00. The camera's hand float is zero in all of them, and every spring is clamped to exactly 1 once it settles.

Triggers visible: Maya's cursor for new / changed / cancelled, Iris's cursor for bell-on and opening the card, and the
red now-line for the reminder. No cell changes on its own.

Sound (score.py from `__events()`, synthesised, one room): 13 sound moments against 25 beats. One two-note glass
chime for every notification: new and changed rise, the reminder repeats one note, cancelled falls. Sub + struck
glass when the bell is hit. Air for the flight and the slide. Wood for Confirm, pencil and trash. Three dry ticks in
the wait. One low glass under the end card. The holds are silent.
