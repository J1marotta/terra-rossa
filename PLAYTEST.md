# Terra Rossa MVP playtest

This sheet tests whether the continuous four-player PvPvE loop is fun. It is
not a bug checklist and it must not be filled from automated harness results.
Run at least three complete friend matches in current desktop Chrome before
making the scope decision.

## Session facts

- Date, build SHA, and hosted URL:
- Players and machines:
- Match count:
- Approximate network conditions:
- Did everyone understand the controls without coaching?

## Hardware rows

Run the production URL in current desktop Google Chrome at 1280×720 or larger.

| Machine                            | Chrome version | Input/audio/resize/visibility/rematch | Frame p95 / minimum observed FPS | Result and workaround |
| ---------------------------------- | -------------- | ------------------------------------- | -------------------------------- | --------------------- |
| Apple Silicon MacBook Air          |                |                                       |                                  |                       |
| Integrated-graphics Windows laptop |                |                                       |                                  |                       |

Record the actual model and operating system. A resized browser on the
development desktop is not evidence for either row.

## Record once per match

| Question                                        | Match 1 | Match 2 | Match 3 |
| ----------------------------------------------- | ------- | ------- | ------- |
| Winner and duration                             |         |         |         |
| Opening route chosen and why                    |         |         |         |
| Earliest opponent contact                       |         |         |         |
| Did anyone deliberately spawn rush?             |         |         |         |
| Did creatures change a PvP decision?            |         |         |         |
| Did ammo scarcity create an interesting choice? |         |         |         |
| Good/perfect/fumbled reload moments             |         |         |         |
| Was melee useful, desperate, or ignored?        |         |         |         |
| Who contested the centre shotgun and why?       |         |         |         |
| Any memorable third-party fight?                |         |         |         |
| Did darkness create movement or only damage?    |         |         |         |
| Confusing, unfair, or unreadable moment         |         |         |         |
| Did players immediately request a rematch?      |         |         |         |

After each match, ask every player separately:

- What decision mattered most?
- What caused your death?
- What would you do differently next round?
- Was fighting creatures worth the ammunition?
- Did you want to play again before being asked?

Record exact behaviour and short paraphrases. Do not replace observations with
“felt good,” and do not add a feature during the session to rescue the loop.

## Evidence already established by automation

On build `b92f398b0f7fc48e6b56e41e3c49d4092c418f0f`, three complete hosted
four-client matches passed at 45±20 ms, 70±30 ms, and 95±40 ms command delay.
They produced a synchronized winner and clean rematch at 338, 385, and 400
simulation ticks. These runs prove the room survives the flow; bots cannot
answer whether it is fun.

The scripted players fired only 5–10 rounds and took 246–354 creature damage.
They dealt 0–60 damage to creatures. That is a warning worth watching in human
play: early PvE may overwhelm exploration and suppress the weapon/reload loop.
It is not yet evidence for a balance change because the harness does not aim or
route like people.

## Decision journal

Separate evidence from interpretation.

### Observed evidence

-

### Team interpretation

-

### Smallest current-MVP fixes, in priority order

1.

### Recommendation

Choose exactly one and explain it from observed play:

- Continue with the continuous four-player PvPvE loop.
- Revise the current loop, naming one falsifiable change.
- Return to the solo prototype.
- Stop development.

Do not recommend expansion features, progression, more content, or additional
players as a substitute for a proven core loop.

## Boundary explanation check

The developer should be able to explain these in plain language:

- The browser sends intent; the server decides movement, hits, damage, pickups,
  visibility, darkness, death, and victory.
- Colyseus schema is the synchronized state; filtered fields prevent hidden
  coordinates from reaching the wrong client.
- Three.js renders that state and may interpolate presentation, but it never
  changes the outcome.
- React owns lobby, results, settings, and minimal interface state.
- The Git SHA ties the client bundle to the server health response.
