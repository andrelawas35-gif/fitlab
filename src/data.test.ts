import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTrial, loadWorkspace, PROTOCOL_ID, PROTOCOL_STEPS, saveWorkspace, type Workspace } from './data'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => { values.delete(key) },
    clear: () => values.clear(),
  }
}

describe('FitLab workspace data', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
  })

  it('migrates older trials without inventing maneuver observations', () => {
    localStorage.setItem('fitlab.workspace.v1', JSON.stringify({
      participants: [{ id: 'p-1', code: 'P-001', group: 'Community', status: 'Active', consent: true, enrolled: '2026-10-01', trials: 1 }],
      trials: [
        { id: 'TR-OLD', participantId: 'p-1', frameId: 'frame-bridge-01', frameName: 'BR-01', protocol: 'Standard v1', date: 'Oct 01, 2026', slipMm: 2.4, comfort: 4, comment: 'Slid while looking down.' },
        { id: 'TR-MISSING', participantId: 'p-1', frameId: 'frame-bridge-01', frameName: 'BR-01', protocol: 'Standard v1', date: 'Oct 01, 2026', comment: 'No value was taken.' },
      ],
    }))

    const migrated = loadWorkspace()

    expect(migrated.trials[0].measurements[0]).toMatchObject({ metric: 'vertical-slip', value: 2.4, unit: 'mm', quality: 'provisional' })
    expect(migrated.trials[0].maneuvers).toHaveLength(PROTOCOL_STEPS.length)
    expect(migrated.trials[0].maneuvers.every((maneuver) => maneuver.status === 'not-recorded')).toBe(true)
    expect(migrated.trials[0].observations[0]).toMatchObject({ originalText: 'Slid while looking down.', fidelity: 'unspecified' })
    expect(migrated.trials[1].measurements).toEqual([])
    expect(migrated.trials[1].comfort).toBeNull()
    expect(localStorage.getItem('fitlab.workspace.v1')).toBeNull()
    expect(localStorage.getItem('fitlab.workspace.v3')).not.toBeNull()
  })

  it('migrates the previous session-protocol version while preserving known steps and uncertainty', () => {
    localStorage.setItem('fitlab.workspace.v2', JSON.stringify({
      participants: [],
      trials: [{
        id: 'TR-V2', participantId: 'p-1', frameId: 'proto-014', frameName: 'BR-14', protocol: PROTOCOL_ID, date: 'Oct 06, 2026',
        maneuvers: [{ id: 'neutral', label: 'Neutral baseline', status: 'performed', note: 'Frame settled.' }],
        measurements: [{ metric: 'vertical-slip', value: 1.8, unit: 'mm', method: 'manual-reference', quality: 'provisional', uncertaintyMm: 0.3 }],
        comfort: 4, comment: 'Sits more securely when I look down.',
      }],
    }))

    const migrated = loadWorkspace().trials[0]
    expect(migrated.maneuvers[0]).toMatchObject({ status: 'performed', note: 'Frame settled.' })
    expect(migrated.maneuvers.slice(1).every((maneuver) => maneuver.status === 'not-recorded')).toBe(true)
    expect(migrated.measurements[0]).toMatchObject({ value: 1.8, uncertaintyMm: 0.3, quality: 'provisional' })
    expect(migrated.observations[0]).toMatchObject({ originalText: 'Sits more securely when I look down.', fidelity: 'unspecified' })
    expect(localStorage.getItem('fitlab.workspace.v2')).toBeNull()
    expect(localStorage.getItem('fitlab.workspace.v3')).not.toBeNull()
  })

  it('recovers valid legacy data when the current storage entry is corrupt', () => {
    localStorage.setItem('fitlab.workspace.v3', '{invalid-json')
    localStorage.setItem('fitlab.workspace.v2', JSON.stringify({
      participants: [],
      trials: [{
        id: 'TR-RECOVERED', participantId: 'p-1', frameId: 'proto-014',
        protocol: PROTOCOL_ID, date: 'Oct 06, 2026',
        comment: 'Preserve this older observation.',
      }],
    }))

    const recovered = loadWorkspace()

    expect(recovered.trials.map((trial) => trial.id)).toEqual(['TR-RECOVERED'])
    expect(recovered.trials[0].observations[0].originalText).toBe('Preserve this older observation.')
    expect(JSON.parse(localStorage.getItem('fitlab.workspace.v3')!)).toEqual(recovered)
    expect(localStorage.getItem('fitlab.workspace.v2')).toBeNull()
  })

  it('does not create a zero measurement when slip is unknown', () => {
    const trial = createTrial({
      participantId: 'p-1', frameId: 'frame-bridge-01', protocol: PROTOCOL_ID,
      maneuvers: PROTOCOL_STEPS.map((step) => ({ id: step.id, label: step.label, status: 'not-recorded', note: '' })),
      measurements: [], observations: [], failures: [], comfort: null,
    })

    expect(trial.measurements).toEqual([])
    expect(trial.comfort).toBeNull()
    expect(trial.maneuvers).toHaveLength(5)
  })

  it('requires failure tags to cite trial evidence and a performed onset maneuver', () => {
    const observation = { id: 'obs-1', originalText: 'Slipped when I looked down.', speaker: 'participant' as const, fidelity: 'verbatim' as const, enteredBy: 'researcher' as const, recordedAt: '2026-10-06T20:00:00.000Z' }
    const measurement = { id: 'measure-1', metric: 'vertical-slip' as const, value: 2, unit: 'mm' as const, method: 'manual-reference' as const, quality: 'provisional' as const, uncertaintyMm: null }
    const failure = { id: 'failure-1', taxonomyVersion: 'fit-failure.v1' as const, typeId: 'bridge.downward-slip', location: 'bridge' as const, side: 'unknown' as const, severity: 2 as const, onset: 'look-down' as const, evidenceMeasurementIds: ['measure-1'], evidenceObservationIds: ['obs-1'], status: 'researcher-entered' as const }
    const base = { participantId: 'p-1', frameId: 'proto-014', protocol: PROTOCOL_ID, measurements: [measurement], observations: [observation], failures: [failure], comfort: null }
    const notPerformed = PROTOCOL_STEPS.map((step) => ({ id: step.id, label: step.label, status: 'not-recorded' as const, note: '' }))
    expect(() => createTrial({ ...base, maneuvers: notPerformed })).toThrow(/performed onset maneuver/)
    const performed = notPerformed.map((step) => step.id === 'look-down' ? { ...step, status: 'performed' as const } : step)
    expect(createTrial({ ...base, maneuvers: performed }).failures[0].evidenceMeasurementIds).toEqual(['measure-1'])
  })

  it('persists the protocol record and provenance as entered', () => {
    const observation = { id: 'obs-1', originalText: 'Only after looking down.', speaker: 'participant' as const, fidelity: 'verbatim' as const, enteredBy: 'researcher' as const, recordedAt: '2026-10-06T20:00:00.000Z' }
    const measurement = { id: 'measure-1', metric: 'vertical-slip' as const, value: 1.7, unit: 'mm' as const, method: 'manual-reference' as const, quality: 'provisional' as const, uncertaintyMm: 0.5 }
    const failure = { id: 'failure-1', taxonomyVersion: 'fit-failure.v1' as const, typeId: 'bridge.downward-slip', location: 'bridge' as const, side: 'unknown' as const, severity: 2 as const, onset: 'look-down' as const, evidenceMeasurementIds: ['measure-1'], evidenceObservationIds: ['obs-1'], status: 'researcher-entered' as const }
    const workspace: Workspace = {
      participants: [],
      trials: [createTrial({
        participantId: 'p-1', frameId: 'proto-014', protocol: PROTOCOL_ID,
        maneuvers: PROTOCOL_STEPS.map((step, index) => ({ id: step.id, label: step.label, status: index === 2 ? 'performed' : 'skipped', note: '' })),
        measurements: [measurement], observations: [observation], failures: [failure],
        comfort: null,
      })],
    }
    saveWorkspace(workspace)

    const restored = loadWorkspace()
    expect(restored.trials[0].measurements[0].uncertaintyMm).toBe(0.5)
    expect(restored.trials[0].maneuvers[2].status).toBe('performed')
    expect(restored.trials[0].observations[0]).toMatchObject({ originalText: 'Only after looking down.', fidelity: 'verbatim' })
    expect(restored.trials[0].failures[0].evidenceMeasurementIds).toEqual(['measure-1'])
    expect(restored.trials[0].failures[0].evidenceObservationIds).toEqual(['obs-1'])
  })
})
