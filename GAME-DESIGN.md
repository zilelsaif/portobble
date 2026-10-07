# PORTOBBLE — Implemented v0.1 Rules

PORTOBBLE's core loop is **load → balance → plan exit → sail**. A good load must satisfy all three pillars: **space + weight + exit order**.

## Space

The ferry has two independent lanes with five cells each and an exit at the right. A vehicle occupies consecutive cells equal to its configured length. It cannot overlap, cross lanes, or extend beyond a lane. The v0.1 fleet is motorcycle (1 cell), car (2), van (2), ambulance (2), and truck (3).

## Weight

Each vehicle has a central, data-defined weight. A level also defines the ferry's maximum total weight. SAIL rejects a load above that limit.

## Balance

Lane A contributes negative vehicle weight and Lane B contributes positive vehicle weight. Balance is `Lane B weight − Lane A weight`. A load is safe when the absolute value is within the level's configured tolerance. This deterministic value drives labels and the on-screen needle; the small ferry tilt is visual feedback only.

## Exit order

Both lane exits are on the right. A priority vehicle is blocked when another vehicle occupies cells between its front and its lane's exit. From Level 6 onward the ambulance must be able to exit first. SAIL names both the blocked vehicle and blocker, while successful priority levels animate unloading in order.

## Stars

- 1 star: complete inside `balanceTolerance` but outside `goodBalanceThreshold`.
- 2 stars: complete at or inside the level's `goodBalanceThreshold`.
- 3 stars: complete at or inside the level's `perfectBalanceThreshold` (which need not be zero).

Each level configures all three values separately, and the thresholds are inclusive. Speed is never scored.

## Level progression

There are exactly ten handcrafted levels. Level 1 begins unlocked; completing a level unlocks the next and stores the best star result locally. The progression introduces snapping and length, both lanes, balance, heavy trucks, exit priority, then combined mastery. Every level is checked by the automated exhaustive solver.

## Future Ideas — Not Implemented

- Tide
- Weather
- Multiple destinations
- Multi-stop routes
- Cosmetics
- Different ferries
