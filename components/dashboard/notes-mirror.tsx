import { blockEvidenceLabel } from "@/lib/note-insights"
import type { TimeBlock, TimeBlockInsight } from "@/lib/types"

interface MirrorObservation {
  title: string
  body: string
  evidence: string
}

function excerpt(value: string | null) {
  if (!value) return "no excerpt"
  return value.length > 120 ? `${value.slice(0, 117)}...` : value
}

function buildObservations(blocks: TimeBlock[], insights: TimeBlockInsight[]) {
  const byBlock = new Map(blocks.map((block) => [block.id, block]))
  const observations: MirrorObservation[] = []
  const friction = insights.filter(
    (insight) => insight.friction_points.length > 0 || insight.avoidance_signals.length > 0,
  )
  const hyperfocus = insights.filter((insight) => insight.hyperfocus_signals.length > 0)
  const satisfaction = insights.filter((insight) => insight.satisfaction_signals.length > 0)
  const flatTone = insights.filter((insight) =>
    ["flat", "anxious", "self-critical", "frustrated"].includes(insight.emotional_tone ?? ""),
  )

  const firstFriction = friction.find((insight) => byBlock.has(insight.time_block_id))
  if (firstFriction) {
    const block = byBlock.get(firstFriction.time_block_id)
    observations.push({
      title: "recurring friction",
      body: `${friction.length} note${friction.length === 1 ? "" : "s"} mention friction, avoidance, or getting stuck.`,
      evidence: `${block ? blockEvidenceLabel(block) : "saved block"}: ${excerpt(firstFriction.evidence_excerpt)}`,
    })
  }

  const firstHyperfocus = hyperfocus.find((insight) => byBlock.has(insight.time_block_id))
  if (firstHyperfocus) {
    const block = byBlock.get(firstHyperfocus.time_block_id)
    observations.push({
      title: "deep focus signals",
      body: `${hyperfocus.length} note${hyperfocus.length === 1 ? "" : "s"} mention hyperfocus, flow, or losing track of time.`,
      evidence: `${block ? blockEvidenceLabel(block) : "saved block"}: ${excerpt(firstHyperfocus.evidence_excerpt)}`,
    })
  }

  const firstSatisfaction = satisfaction.find((insight) => byBlock.has(insight.time_block_id))
  if (firstSatisfaction) {
    const block = byBlock.get(firstSatisfaction.time_block_id)
    observations.push({
      title: "satisfying threads",
      body: `${satisfaction.length} note${satisfaction.length === 1 ? "" : "s"} carry relief, pride, or reward language.`,
      evidence: `${block ? blockEvidenceLabel(block) : "saved block"}: ${excerpt(firstSatisfaction.evidence_excerpt)}`,
    })
  }

  const firstFlat = flatTone.find((insight) => byBlock.has(insight.time_block_id))
  if (firstFlat) {
    const block = byBlock.get(firstFlat.time_block_id)
    observations.push({
      title: "emotional weather",
      body: `${flatTone.length} note${flatTone.length === 1 ? "" : "s"} skew ${firstFlat.emotional_tone}.`,
      evidence: `${block ? blockEvidenceLabel(block) : "saved block"}: ${excerpt(firstFlat.evidence_excerpt)}`,
    })
  }

  if (observations.length === 0) {
    const notedBlocks = blocks.filter((block) => block.notes?.trim())
    const block = notedBlocks[0]
    if (block) {
      observations.push({
        title: "notes are coming through",
        body: `${notedBlocks.length} block${notedBlocks.length === 1 ? "" : "s"} have reflection notes ready for pattern-finding.`,
        evidence: `${blockEvidenceLabel(block)}: ${excerpt(block.notes)}`,
      })
    }
  }

  return observations.slice(0, 3)
}

export function NotesMirror({
  blocks,
  insights,
}: {
  blocks: TimeBlock[]
  insights: TimeBlockInsight[]
}) {
  const observations = buildObservations(blocks, insights)

  return (
    <section className="alibi-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-black text-alibi-blue">notes mirror</h2>
        <span className="font-mono text-xs font-black uppercase tracking-[0.12em] text-alibi-teal">
          note-grounded
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold leading-6 text-alibi-teal">
        observations from what you wrote happened, with the trail left visible.
      </p>

      {observations.length === 0 ? (
        <div className="alibi-banner-info mt-4 border-dashed">
          add notes to a few blocks and this panel will start showing themes without scoring them.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {observations.map((observation) => (
            <article
              key={observation.title}
              className="alibi-block-item"
            >
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-alibi-blue">
                {observation.title}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-alibi-ink">
                {observation.body}
              </p>
              <p className="mt-3 wrap-break-words border-t border-alibi-lavender/25 pt-3 text-xs font-semibold leading-5 text-alibi-teal">
                {observation.evidence}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
