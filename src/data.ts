export type Participant = {
  id: string
  code: string
  group: string
  status: 'Active' | 'Complete' | 'Withdrawn'
  consent: boolean
  enrolled: string
  trials: number
}

export type Trial = {
  id: string
  participantId: string
  frameId: string
  frameName: string
  protocol: string
  date: string
  maneuvers: ManeuverRecord[]
  measurements: ObjectiveMeasurement[]
  observations: SubjectiveObservation[]
  failures: FitFailure[]
  comfort: number | null
}

export type ManeuverId = 'neutral' | 'smile' | 'look-down' | 'head-movement' | 'return-neutral'
export type ManeuverStatus = 'performed' | 'skipped' | 'not-recorded'
export type ManeuverRecord = { id: ManeuverId; label: string; status: ManeuverStatus; note: string }
export type ObjectiveMeasurement = {
  id: string
  metric: 'vertical-slip'
  value: number
  unit: 'mm'
  method: 'manual-reference' | 'manual-visual' | 'other'
  quality: 'provisional' | 'unknown'
  uncertaintyMm: number | null
}

export type SubjectiveObservation = {
  id: string
  originalText: string
  speaker: 'participant' | 'researcher'
  fidelity: 'verbatim' | 'paraphrase' | 'researcher-note' | 'unspecified'
  enteredBy: 'researcher'
  recordedAt: string
}

export type FitFailureLocation = 'bridge' | 'cheek' | 'temple' | 'optical' | 'dynamic'
export type FitFailureOption = { id: string; label: string; location: FitFailureLocation }
export type FitFailure = {
  id: string
  taxonomyVersion: 'fit-failure.v1'
  typeId: string
  location: FitFailureLocation
  side: 'left' | 'right' | 'bilateral' | 'unknown'
  severity: 1 | 2 | 3 | 4
  onset: ManeuverId | 'unspecified'
  evidenceMeasurementIds: string[]
  evidenceObservationIds: string[]
  status: 'researcher-entered'
}

export const FIT_FAILURE_OPTIONS: FitFailureOption[] = [
  { id: 'bridge.downward-slip', label: 'Downward slip', location: 'bridge' },
  { id: 'bridge.pinching', label: 'Pinching', location: 'bridge' },
  { id: 'bridge.pressure-concentration', label: 'Concentrated pressure', location: 'bridge' },
  { id: 'bridge.asymmetric-contact', label: 'Asymmetric contact', location: 'bridge' },
  { id: 'bridge.insufficient-support', label: 'Insufficient support/contact', location: 'bridge' },
  { id: 'cheek.static-contact', label: 'Static cheek contact', location: 'cheek' },
  { id: 'cheek.smile-interference', label: 'Smile interference', location: 'cheek' },
  { id: 'cheek.frame-lift', label: 'Frame/lens lift', location: 'cheek' },
  { id: 'temple.excess-pressure', label: 'Side pressure', location: 'temple' },
  { id: 'temple.poor-retention', label: 'Insufficient retention', location: 'temple' },
  { id: 'temple.splay-mismatch', label: 'Splay mismatch', location: 'temple' },
  { id: 'temple.ear-position', label: 'Ear-position mismatch', location: 'temple' },
  { id: 'optical.too-high', label: 'Optical position too high', location: 'optical' },
  { id: 'optical.too-low', label: 'Optical position too low', location: 'optical' },
  { id: 'optical.vertex-distance', label: 'Vertex-distance issue', location: 'optical' },
  { id: 'optical.tilt-centering', label: 'Tilt/centering issue', location: 'optical' },
  { id: 'dynamic.head-motion-instability', label: 'Head-movement instability', location: 'dynamic' },
  { id: 'dynamic.progressive-drift', label: 'Progressive drift', location: 'dynamic' },
]

export const PROTOCOL_ID = 'standard-fit-v1.3'
export const PROTOCOL_STEPS: { id: ManeuverId; label: string; prompt: string }[] = [
  { id: 'neutral', label: 'Neutral baseline', prompt: 'Settle the frame and record the starting position.' },
  { id: 'smile', label: 'Smile', prompt: 'Ask for a natural smile; observe cheek/frame interaction.' },
  { id: 'look-down', label: 'Look down', prompt: 'Look down comfortably; observe bridge support and slip.' },
  { id: 'head-movement', label: 'Head movement', prompt: 'Perform the same gentle head movement each trial.' },
  { id: 'return-neutral', label: 'Return to neutral', prompt: 'Return to baseline; note remaining displacement or drift.' },
]

export type Workspace = {
  participants: Participant[]
  trials: Trial[]
}

const STORAGE_KEY = 'fitlab.workspace.v3'
const LEGACY_STORAGE_KEYS = ['fitlab.workspace.v2', 'fitlab.workspace.v1']
const frameNames: Record<string, string> = {
  'frame-bridge-01': 'BR-01 · Baseline bridge',
  'proto-014': 'BR-14 · Wider contact',
  'proto-016': 'BR-16 · Reduced projection',
}

const sample: Workspace = {
  participants: [
    { id: 'p-101', code: 'P-001', group: 'Community', status: 'Active', consent: true, enrolled: '2026-09-08', trials: 2 },
    { id: 'p-102', code: 'P-002', group: 'Referral', status: 'Active', consent: true, enrolled: '2026-09-10', trials: 1 },
    { id: 'p-103', code: 'P-003', group: 'Community', status: 'Active', consent: true, enrolled: '2026-09-12', trials: 1 },
    { id: 'p-104', code: 'P-004', group: 'Research network', status: 'Active', consent: true, enrolled: '2026-09-15', trials: 1 },
  ],
  trials: [
    sampleTrial('TR-052', 'p-103', 'proto-014', 'Oct 06, 2026', 1.8, 4, 'Feels more stable when I look down.', 4),
    sampleTrial('TR-051', 'p-102', 'frame-bridge-01', 'Oct 05, 2026', 3.4, 3, 'A little pressure on the left side of my nose.', 5),
    sampleTrial('TR-050', 'p-101', 'proto-014', 'Oct 04, 2026', 2.1, 4, 'The bridge feels more supported.', 4),
    sampleTrial('TR-049', 'p-104', 'frame-bridge-01', 'Oct 03, 2026', 3.8, 2, 'Slides down after the smile test.', 3),
    sampleTrial('TR-048', 'p-101', 'frame-bridge-01', 'Oct 02, 2026', 3.2, 3, 'Pressure builds after a few minutes.', 5),
  ],
}

function sampleTrial(id: string, participantId: string, frameId: string, date: string, slipMm: number, comfort: number, comment: string, performedCount: number): Trial {
  return {
    id, participantId, frameId, frameName: frameNames[frameId], protocol: 'Standard fit · v1.3 (sample)', date, comfort,
    maneuvers: PROTOCOL_STEPS.map((step, index) => ({ id: step.id, label: step.label, status: index < performedCount ? 'performed' : 'not-recorded', note: '' })),
    measurements: [{ id: crypto.randomUUID(), metric: 'vertical-slip', value: slipMm, unit: 'mm', method: 'manual-reference', quality: 'provisional', uncertaintyMm: null }],
    observations: [{ id: crypto.randomUUID(), originalText: comment, speaker: 'participant', fidelity: 'verbatim', enteredBy: 'researcher', recordedAt: new Date().toISOString() }],
    failures: [],
  }
}

function migrateLegacyTrial(raw: Record<string, unknown>): Trial {
  const oldSteps = Array.isArray(raw.maneuvers) ? raw.maneuvers as Record<string, unknown>[] : []
  const oldMeasurements = Array.isArray(raw.measurements) ? raw.measurements as Record<string, unknown>[] : []
  const measurements: ObjectiveMeasurement[] = oldMeasurements.flatMap((item) => {
    if (item.metric !== 'vertical-slip' || typeof item.value !== 'number' || !Number.isFinite(item.value)) return []
    return [{ id: crypto.randomUUID(), metric: 'vertical-slip', value: item.value, unit: 'mm', method: item.method === 'manual-reference' || item.method === 'manual-visual' || item.method === 'other' ? item.method : 'manual-visual', quality: item.quality === 'unknown' ? 'unknown' : 'provisional', uncertaintyMm: typeof item.uncertaintyMm === 'number' && Number.isFinite(item.uncertaintyMm) ? item.uncertaintyMm : null }]
  })
  if (!measurements.length && typeof raw.slipMm === 'number' && Number.isFinite(raw.slipMm)) measurements.push({ id: crypto.randomUUID(), metric: 'vertical-slip', value: raw.slipMm, unit: 'mm', method: 'manual-visual', quality: 'provisional', uncertaintyMm: null })
  const maneuvers: ManeuverRecord[] = PROTOCOL_STEPS.map((step) => {
    const old = oldSteps.find((candidate) => candidate.id === step.id)
    const status = old?.status === 'performed' || old?.status === 'skipped' || old?.status === 'not-recorded' ? old.status : 'not-recorded'
    return { id: step.id, label: step.label, status, note: typeof old?.note === 'string' ? old.note : '' }
  })
  const originalText = String(raw.comment ?? '').trim()
  return {
    id: String(raw.id ?? `TR-${crypto.randomUUID().slice(0, 5).toUpperCase()}`),
    participantId: String(raw.participantId ?? ''),
    frameId: String(raw.frameId ?? ''),
    frameName: String(raw.frameName ?? raw.frameId ?? 'Unknown frame'),
    protocol: `${String(raw.protocol ?? 'Standard fit')} · migrated`,
    date: String(raw.date ?? ''),
    maneuvers,
    measurements,
    observations: originalText === '' ? [] : [{ id: crypto.randomUUID(), originalText: String(raw.comment), speaker: 'participant', fidelity: 'unspecified', enteredBy: 'researcher', recordedAt: new Date().toISOString() }],
    failures: [],
    comfort: typeof raw.comfort === 'number' ? raw.comfort : null,
  }
}

export function loadWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored)
        if (isWorkspace(parsed)) return parsed
      } catch {
        // A corrupt current entry must not hide recoverable legacy data.
      }
    }
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(legacyKey)
      if (!legacy) continue
      const parsed: unknown = JSON.parse(legacy)
      if (typeof parsed === 'object' && parsed !== null && 'participants' in parsed && 'trials' in parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.trials)) {
        const migrated: Workspace = { participants: parsed.participants as Participant[], trials: parsed.trials.map((trial) => migrateLegacyTrial(trial as Record<string, unknown>)) }
        saveWorkspace(migrated)
        for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key)
        return migrated
      }
    }
  } catch {
    // Corrupt local demo data falls back to the built-in sample instead of blocking the app.
  }
  return sample
}

function isWorkspace(value: unknown): value is Workspace {
  return typeof value === 'object' && value !== null && 'participants' in value && Array.isArray(value.participants) && 'trials' in value && Array.isArray(value.trials)
}

export function saveWorkspace(workspace: Workspace) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

export function createTrial(input: Pick<Trial, 'participantId' | 'frameId' | 'protocol' | 'maneuvers' | 'measurements' | 'observations' | 'failures' | 'comfort'>): Trial {
  const measurementIds = new Set(input.measurements.map((measurement) => measurement.id))
  const observationIds = new Set(input.observations.map((observation) => observation.id))
  for (const failure of input.failures) {
    const hasEvidence = failure.evidenceMeasurementIds.length + failure.evidenceObservationIds.length > 0
    const citesMissingMeasurement = failure.evidenceMeasurementIds.some((id) => !measurementIds.has(id))
    const citesMissingObservation = failure.evidenceObservationIds.some((id) => !observationIds.has(id))
    const onsetNotPerformed = failure.onset !== 'unspecified' && input.maneuvers.find((maneuver) => maneuver.id === failure.onset)?.status !== 'performed'
    if (!hasEvidence || citesMissingMeasurement || citesMissingObservation || onsetNotPerformed) throw new Error('Fit failure must cite trial evidence and a performed onset maneuver.')
  }
  const trialCode = crypto.randomUUID().slice(0, 5).toUpperCase()
  const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date())
  return {
    ...input,
    id: `TR-${trialCode}`,
    frameName: frameNames[input.frameId] ?? input.frameId,
    date,
  }
}
