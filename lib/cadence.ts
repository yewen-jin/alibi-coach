/**
 * Cadence: how often Alibi proactively reaches out, based on usage.
 * The more entries a user has, the more frequently Alibi offers an unprompted message.
 *
 * Scale (entries since last proactive message):
 *   <  3  → never speak up yet (too thin)
 *   3-9  → speak up after 5 new entries, min 6h gap
 *   10-29 → speak up after 4 new entries, min 4h gap
 *   30-99 → speak up after 3 new entries, min 3h gap
 *  100+   → speak up after 2 new entries, min 2h gap
 */
export interface CadenceDecision {
  shouldSpeak: boolean
  reason: string
}

export function decideCadence(args: {
  totalEntries: number
  entriesSinceLast: number
  hoursSinceLast: number | null // null = never spoken before
}): CadenceDecision {
  const { totalEntries, entriesSinceLast, hoursSinceLast } = args

  if (totalEntries < 3) {
    return { shouldSpeak: false, reason: "not enough data yet" }
  }

  let entryThreshold: number
  let hourThreshold: number

  if (totalEntries < 10) {
    entryThreshold = 5
    hourThreshold = 6
  } else if (totalEntries < 30) {
    entryThreshold = 4
    hourThreshold = 4
  } else if (totalEntries < 100) {
    entryThreshold = 3
    hourThreshold = 3
  } else {
    entryThreshold = 2
    hourThreshold = 2
  }

  if (entriesSinceLast < entryThreshold) {
    return {
      shouldSpeak: false,
      reason: `only ${entriesSinceLast} new entries since last message (need ${entryThreshold})`,
    }
  }

  if (hoursSinceLast !== null && hoursSinceLast < hourThreshold) {
    return {
      shouldSpeak: false,
      reason: `only ${hoursSinceLast.toFixed(1)}h since last message (need ${hourThreshold}h)`,
    }
  }

  return { shouldSpeak: true, reason: "cadence threshold reached" }
}
