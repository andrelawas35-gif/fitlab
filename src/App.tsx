import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, Beaker, BookOpenText, Check,
  ChevronDown, ChevronRight, CircleHelp, ClipboardList, FlaskConical,
  Glasses, LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react'
import { createTrial, FIT_FAILURE_OPTIONS, loadWorkspace, PROTOCOL_ID, PROTOCOL_STEPS, saveWorkspace, type FitFailure, type ManeuverRecord, type ObjectiveMeasurement, type Participant, type SubjectiveObservation, type Trial } from './data'
import './App.css'

type Page = 'Overview' | 'Participants' | 'Fit sessions' | 'Prototypes' | 'Experiments' | 'Research memory'
const navigation: { label: Page; icon: typeof LayoutDashboard }[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Participants', icon: Users },
  { label: 'Fit sessions', icon: ClipboardList }, { label: 'Prototypes', icon: Glasses },
  { label: 'Experiments', icon: FlaskConical }, { label: 'Research memory', icon: BookOpenText },
]
const describe: Record<Page, string> = {
  Overview: 'A clear view of what you know, what you don’t, and what to test next.',
  Participants: 'Pseudonymous study records and participation history.',
  'Fit sessions': 'Structured trials with their observations and evidence.',
  Prototypes: 'Geometry versions, rationale, and physical outcomes.',
  Experiments: 'What changed, what stayed fixed, and what the test taught you.',
  'Research memory': 'Signals, contradictions, and open questions linked to evidence.',
}
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

function App() {
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const [page, setPage] = useState<Page>('Overview')
  const [sessionOpen, setSessionOpen] = useState(false)
  const [participantOpen, setParticipantOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const persist = (next: typeof workspace) => { setWorkspace(next); saveWorkspace(next) }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const filteredParticipants = useMemo(() => workspace.participants.filter((person) => `${person.code} ${person.group} ${person.status}`.toLowerCase().includes(query.toLowerCase())), [workspace.participants, query])

  const handleTrial = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const originalText = String(form.get('observationText')).trim()
    const observationSource = String(form.get('observationSource'))
    if (originalText && !observationSource) { notify('Choose how this observation was recorded'); return }
    const maneuvers: ManeuverRecord[] = PROTOCOL_STEPS.map((step) => ({ id: step.id, label: step.label, status: String(form.get(`maneuver-${step.id}`)) as ManeuverRecord['status'], note: String(form.get(`note-${step.id}`)).trim() }))
    const slipValue = String(form.get('slipMm')).trim()
    const measurements: ObjectiveMeasurement[] = slipValue === '' ? [] : [{ id: crypto.randomUUID(), metric: 'vertical-slip', value: Number(slipValue), unit: 'mm', method: String(form.get('slipMethod')) as ObjectiveMeasurement['method'], quality: String(form.get('slipQuality')) as ObjectiveMeasurement['quality'], uncertaintyMm: String(form.get('slipUncertainty')).trim() === '' ? null : Number(form.get('slipUncertainty')) }]
    const observation: SubjectiveObservation | null = originalText ? {
      id: crypto.randomUUID(), originalText, speaker: observationSource === 'participant-verbatim' ? 'participant' : 'researcher',
      fidelity: observationSource === 'participant-verbatim' ? 'verbatim' : observationSource === 'researcher-paraphrase' ? 'paraphrase' : 'researcher-note',
      enteredBy: 'researcher', recordedAt: new Date().toISOString(),
    } : null
    const observations = observation ? [observation] : []
    const failureType = String(form.get('failureType'))
    const failureOption = FIT_FAILURE_OPTIONS.find((option) => option.id === failureType)
    const severityValue = String(form.get('failureSeverity'))
    if (failureOption && !severityValue) { notify('Choose a severity for the selected failure'); return }
    if (failureOption && !measurements.length && !observations.length) { notify('Add a measurement or observation to support this failure tag'); return }
    const failureOnset = String(form.get('failureOnset')) as FitFailure['onset']
    if (failureOption && failureOnset !== 'unspecified' && maneuvers.find((maneuver) => maneuver.id === failureOnset)?.status !== 'performed') { notify('Mark the onset maneuver as performed before linking the failure to it'); return }
    const failures: FitFailure[] = failureOption ? [{
      id: crypto.randomUUID(), taxonomyVersion: 'fit-failure.v1', typeId: failureOption.id, location: failureOption.location,
      side: String(form.get('failureSide')) as FitFailure['side'], severity: Number(severityValue) as FitFailure['severity'],
      onset: failureOnset,
      evidenceMeasurementIds: measurements.map((item) => item.id), evidenceObservationIds: observations.map((item) => item.id), status: 'researcher-entered',
    }] : []
    const comfortValue = String(form.get('comfort'))
    const trial = createTrial({ participantId: String(form.get('participantId')), frameId: String(form.get('frameId')), protocol: PROTOCOL_ID, maneuvers, measurements, observations, failures, comfort: comfortValue === '' ? null : Number(comfortValue) })
    const participants = workspace.participants.map((person) => person.id === trial.participantId ? { ...person, trials: person.trials + 1 } : person)
    persist({ ...workspace, participants, trials: [trial, ...workspace.trials] })
    setSessionOpen(false); setPage('Fit sessions'); notify('Trial saved to this workspace')
  }
  const handleParticipant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const participant: Participant = { id: crypto.randomUUID(), code: String(form.get('code')).trim().toUpperCase(), group: String(form.get('group')), status: 'Active', consent: true, enrolled: new Date().toISOString().slice(0, 10), trials: 0 }
    persist({ ...workspace, participants: [participant, ...workspace.participants] })
    setParticipantOpen(false); setPage('Participants'); notify(`${participant.code} added to the study`)
  }
  const openNewSession = () => {
    if (!workspace.participants.length) { setParticipantOpen(true); notify('Add a participant before recording a trial'); return }
    setSessionOpen(true)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-row"><div className="brand-mark"><Activity size={19} strokeWidth={2.5} /></div><div className="brand-name">fitlab<span>research</span></div><button className="icon-button sidebar-menu" aria-label="Navigation menu"><Menu size={18} /></button></div>
      <button className="study-switcher"><span className="study-avatar">S</span><span className="study-copy"><strong>Bridge fit study</strong><small>Active study</small></span><ChevronDown size={15} /></button>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="main-nav" aria-label="Main navigation">{navigation.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => setPage(label)}><Icon size={17} strokeWidth={1.9} /><span>{label}</span>{label === 'Fit sessions' && <span className="nav-count">{workspace.trials.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={15} /><span>Research data stays<br />on this device</span></div><button className="nav-item" onClick={() => { if (window.confirm('Restore the fictional sample workspace? This will delete locally saved demo entries.')) { localStorage.removeItem('fitlab.workspace.v1'); setWorkspace(loadWorkspace()); notify('Sample workspace restored') } }}><Settings2 size={17} /><span>Restore sample data</span></button><div className="profile-row"><div className="profile-avatar">AL</div><div><strong>Andre Lawas</strong><small>Researcher</small></div><MoreHorizontal size={17} /></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Studies</span><ChevronRight size={14} /><strong>Bridge fit study</strong></div><div className="top-actions"><span className="local-badge"><span className="green-dot" /> Local workspace</span><button className="icon-button" aria-label="Find participants" onClick={() => setPage('Participants')}><Search size={17} /></button><div className="tiny-avatar">AL</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">STUDY CONTROL ROOM <span className="sample-label">SAMPLE DATA</span></div><h1>{page === 'Overview' ? 'Good evening, Andre' : page}</h1><p className="page-subtitle">{describe[page]}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => setParticipantOpen(true)}><Plus size={16} /> Add participant</button><button className="button button-primary" onClick={openNewSession}><Plus size={17} /> New fit session</button></div></div>
        {page === 'Overview' && <Overview workspace={workspace} onNewSession={openNewSession} onNavigate={setPage} />}
        {page === 'Participants' && <Participants people={filteredParticipants} query={query} onQuery={setQuery} />}
        {page === 'Fit sessions' && <Sessions trials={workspace.trials} participants={workspace.participants} />}
        {page === 'Prototypes' && <Prototypes />}
        {page === 'Experiments' && <Experiments />}
        {page === 'Research memory' && <ResearchMemory />}
        <footer className="page-footer"><span>FitLab research prototype</span><span>Measurements are provisional until validated <CircleHelp size={13} /></span></footer>
      </div>
    </main>

    {sessionOpen && <Modal title="Record a fit trial" subtitle="Record each maneuver as performed, skipped, or not recorded. Don’t turn missing observations into zeros." onClose={() => setSessionOpen(false)}><form className="modal-form" onSubmit={handleTrial}>
      <div className="form-grid"><label>Participant<select name="participantId" required defaultValue=""><option value="" disabled>Select participant</option>{workspace.participants.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.group}</option>)}</select></label><label>Frame / prototype<select name="frameId" required defaultValue=""><option value="" disabled>Select tested frame</option><option value="frame-bridge-01">BR-01 · Baseline bridge</option><option value="proto-014">BR-14 · Wider contact</option><option value="proto-016">BR-16 · Reduced projection</option></select></label></div>
      <div className="form-section-title">Standard sequence <span>Protocol v1.3 · status is never inferred</span></div>
      <div className="maneuver-list">{PROTOCOL_STEPS.map((step, index) => <div className="maneuver-row" key={step.id}><span className="maneuver-index">{String(index + 1).padStart(2, '0')}</span><div className="maneuver-copy"><strong>{step.label}</strong><small>{step.prompt}</small></div><select name={`maneuver-${step.id}`} defaultValue="not-recorded" aria-label={`${step.label} status`}><option value="not-recorded">Not recorded</option><option value="performed">Performed</option><option value="skipped">Skipped</option></select><input className="maneuver-note" name={`note-${step.id}`} placeholder="Optional note" aria-label={`${step.label} note`} /></div>)}</div>
      <div className="form-section-title">Objective observations <span>Manual entry · provisional by default</span></div>
      <div className="form-grid"><label>Vertical slip <span className="input-suffix"><input name="slipMm" type="number" min="0" max="30" step="0.1" placeholder="Not measured" /><em>mm</em></span></label><label>Measurement method<select name="slipMethod" defaultValue="manual-reference"><option value="manual-reference">Manual reference / scale</option><option value="manual-visual">Manual visual estimate</option><option value="other">Other manual method</option></select></label></div>
      <div className="form-grid"><label>Measurement quality<select name="slipQuality" defaultValue="provisional"><option value="provisional">Provisional</option><option value="unknown">Unknown</option></select></label><label>Uncertainty estimate <span className="input-suffix"><input name="slipUncertainty" type="number" min="0" max="20" step="0.1" placeholder="Optional" /><em>± mm</em></span></label></div>
      <label>Overall comfort<select name="comfort" defaultValue=""><option value="">Not recorded</option><option value="1">1 · Very uncomfortable</option><option value="2">2 · Uncomfortable</option><option value="3">3 · Neutral</option><option value="4">4 · Comfortable</option><option value="5">5 · Very comfortable</option></select></label>
      <div className="form-section-title">Subjective observation <span>Original text is preserved</span></div>
      <label>Observation text <textarea name="observationText" rows={3} placeholder="Enter exact participant words or a researcher observation." /></label>
      <label>Recorded as<select name="observationSource" defaultValue=""><option value="">Choose source and fidelity if text is entered</option><option value="participant-verbatim">Participant · verbatim quote</option><option value="researcher-paraphrase">Researcher · paraphrase</option><option value="researcher-observation">Researcher · direct observation</option></select></label>
      <div className="form-section-title">Primary observed fit failure <span>Optional · researcher-entered taxonomy v1</span></div>
      <div className="form-grid"><label>Failure type<select name="failureType" defaultValue=""><option value="">No failure tag recorded</option>{(['bridge','cheek','temple','optical','dynamic'] as const).map((location) => <optgroup key={location} label={location[0].toUpperCase() + location.slice(1)}>{FIT_FAILURE_OPTIONS.filter((option) => option.location === location).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup>)}</select></label><label>Severity<select name="failureSeverity" defaultValue=""><option value="">Not assessed</option><option value="1">1 · Mild / noticed</option><option value="2">2 · Moderate / bothersome</option><option value="3">3 · Major / affects wear</option><option value="4">4 · Intolerable / stop test</option></select></label></div>
      <div className="form-grid"><label>Side<select name="failureSide" defaultValue="unknown"><option value="unknown">Unknown / not recorded</option><option value="left">Left</option><option value="right">Right</option><option value="bilateral">Bilateral</option></select></label><label>Onset / maneuver<select name="failureOnset" defaultValue="unspecified"><option value="unspecified">Not specified</option>{PROTOCOL_STEPS.map((step) => <option key={step.id} value={step.id}>{step.label}</option>)}</select></label></div>
      <p className="failure-taxonomy-note">Severity anchors: 1 mild notice · 2 moderate/bothersome · 3 major effect on wear · 4 intolerable or test stopped. Onset must be marked performed. Record one primary failure here; keep other observations in the note.</p>
      <div className="evidence-note"><ShieldCheck size={15} /><span>Text stays unchanged. A failure tag links to this trial’s saved measurements and observations. No AI classification is applied.</span></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setSessionOpen(false)}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> Save trial</button></div>
    </form></Modal>}

    {participantOpen && <Modal title="Add participant" subtitle="Use a study code, not a name. Contact details stay outside this prototype." onClose={() => setParticipantOpen(false)}><form className="modal-form" onSubmit={handleParticipant}>
      <label>Participant code<input name="code" placeholder="e.g. P-021" required pattern="[A-Za-z0-9-]+" /></label><label>Recruitment group<select name="group" defaultValue="Community"><option>Community</option><option>Referral</option><option>Research network</option><option>Other</option></select></label>
      <label className="consent-check"><input type="checkbox" required /> <span>Consent has been obtained outside this prototype.</span></label>
      <div className="evidence-note"><ShieldCheck size={15} /><span>This local demo stores a pseudonymous code in browser storage only. Do not enter identifying or sensitive information.</span></div>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setParticipantOpen(false)}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Add participant</button></div>
    </form></Modal>}
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>
}

function Overview({ workspace, onNewSession, onNavigate }: { workspace: ReturnType<typeof loadWorkspace>; onNewSession: () => void; onNavigate: (page: Page) => void }) {
  const activeParticipants = workspace.participants.filter((p) => p.status === 'Active').length
  return <>
    <section className="metric-grid"><MetricCard label="Participants" value={String(activeParticipants).padStart(2, '0')} meta="of 20 target" icon={<Users size={17} />} tone="lavender" trend="+3 this week" /><MetricCard label="Fit trials" value={String(workspace.trials.length).padStart(2, '0')} meta="across 3 prototypes" icon={<ClipboardList size={17} />} tone="mint" trend="+8 this week" /><MetricCard label="Active prototypes" value="04" meta="2 awaiting a test" icon={<Glasses size={17} />} tone="peach" trend="2 in fabrication" /><MetricCard label="Open questions" value="06" meta="3 ready to investigate" icon={<CircleHelp size={17} />} tone="blue" trend="2 need more evidence" /></section>
    <section className="signal-banner"><div className="signal-icon"><Sparkles size={18} /></div><div className="signal-copy"><div className="signal-title">A promising signal is emerging <span className="signal-tag">EARLY · NOT CAUSAL</span></div><p>Trials on BR-14 show less downward movement in 4 of 5 recorded sessions. Most tests also changed temple fit—so the cause is still unclear.</p></div><button className="text-button" onClick={() => onNavigate('Experiments')}>Review evidence <ArrowRight size={15} /></button></section>
    <div className="content-grid">
      <section className="panel movement-panel"><div className="panel-header"><div><h2>Observed vertical movement</h2><p>Recorded slip by prototype · mm</p></div><button className="select-pill">Last 30 days <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="legend-dot violet" />BR-01 baseline</span><span><i className="legend-dot green" />BR-14 wider contact</span></div><div className="chart-wrap"><div className="y-labels"><span>5 mm</span><span>4 mm</span><span>3 mm</span><span>2 mm</span><span>1 mm</span><span>0</span></div><svg className="movement-chart" viewBox="0 0 620 205" role="img" aria-label="Provisional slip observations trend chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8678cf" stopOpacity=".18"/><stop offset="1" stopColor="#8678cf" stopOpacity="0"/></linearGradient></defs>{[12,48,84,120,156,192].map((y) => <line key={y} x1="2" x2="615" y1={y} y2={y} stroke="#eeedf1" strokeDasharray="3 5" />)}<path d="M8 63 C55 70 77 46 125 53 S194 69 238 91 S301 66 350 78 S419 105 463 93 S535 101 610 127 L610 192 L8 192Z" fill="url(#chartFill)"/><path d="M8 63 C55 70 77 46 125 53 S194 69 238 91 S301 66 350 78 S419 105 463 93 S535 101 610 127" fill="none" stroke="#8273c5" strokeWidth="3" strokeLinecap="round"/><path d="M8 112 C59 108 82 125 125 119 S195 123 238 133 S302 119 350 139 S418 137 463 150 S531 138 610 160" fill="none" stroke="#54a88c" strokeWidth="3" strokeLinecap="round"/>{[[8,63],[125,53],[238,91],[350,78],[463,93],[610,127]].map(([x,y]) => <circle key={`a${x}`} cx={x} cy={y} r="4" fill="#fff" stroke="#8273c5" strokeWidth="2.5" />)}{[[8,112],[125,119],[238,133],[350,139],[463,150],[610,160]].map(([x,y]) => <circle key={`b${x}`} cx={x} cy={y} r="4" fill="#fff" stroke="#54a88c" strokeWidth="2.5" />)}</svg><div className="x-labels"><span>Sep 08</span><span>Sep 15</span><span>Sep 22</span><span>Sep 29</span><span>Oct 06</span></div></div><div className="chart-footnote"><span><CircleHelp size={14} /> Manual observations · not yet measurement-validated</span><button className="subtle-button" onClick={() => onNavigate('Fit sessions')}>View trials <ArrowRight size={14} /></button></div></section>
      <section className="panel experiment-panel"><div className="panel-header"><div><span className="section-kicker">NEXT EXPERIMENT</span><h2>Isolate bridge contact</h2></div><span className="priority-dot">●</span></div><div className="experiment-status"><span className="status-pill status-ready"><span /> READY TO PLAN</span><span className="quiet-meta">~ 3 sessions</span></div><div className="hypothesis-card"><div className="hypothesis-label">HYPOTHESIS</div><p>Wider nasal contact may reduce downward slip during look-down.</p></div><div className="variable-block"><div><span className="variable-icon changed">↗</span><span>Change</span></div><strong>Contact width <em>+2 mm</em></strong></div><div className="variable-block"><div><span className="variable-icon fixed">＝</span><span>Hold constant</span></div><strong>Projection · temple geometry</strong></div><button className="button button-dark full-button" onClick={() => onNavigate('Experiments')}>Review experiment plan <ArrowRight size={15} /></button><p className="ai-disclaimer"><ShieldCheck size={13} /> Human approval required · AI has not made this recommendation</p></section>
    </div>
    <div className="lower-grid"><section className="panel recent-panel"><div className="panel-header"><div><h2>Recent fit trials</h2><p>Latest observations across the study</p></div><button className="text-button" onClick={() => onNavigate('Fit sessions')}>All trials <ArrowRight size={15} /></button></div><TrialTable trials={workspace.trials.slice(0, 4)} participants={workspace.participants} compact /></section><section className="panel question-panel"><div className="panel-header"><div><h2>Open questions</h2><p>What the study hasn’t answered yet</p></div><span className="count-bubble">3</span></div><Question title="Does the wider bridge cause the change?" meta="Confounded · 5 trials" /><Question title="Does smile lift correlate with cheek height?" meta="Needs more coverage · 2 trials" /><Question title="Are left/right contact differences consistent?" meta="Unknown · no paired measurements" /></section></div>
    <section className="protocol-strip"><div className="protocol-icon"><Beaker size={16} /></div><div><strong>Standard protocol · v1.3</strong><span>Neutral → smile → look down → movement → return to neutral</span></div><button onClick={onNewSession}>Start a session <ArrowRight size={14} /></button></section>
  </>
}

function MetricCard({ label, value, meta, icon, tone, trend }: { label: string; value: string; meta: string; icon: ReactNode; tone: string; trend: string }) { return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-value-row"><strong>{value}</strong><span>{meta}</span></div><div className="metric-trend"><span className="trend-dot" />{trend}</div></article> }
function Question({ title, meta }: { title: string; meta: string }) { return <div className="question-item"><span className="question-mark">?</span><div><strong>{title}</strong><small>{meta}</small></div><ChevronRight size={16} /></div> }

function Participants({ people, query, onQuery }: { people: Participant[]; query: string; onQuery: (value: string) => void }) { return <section className="panel table-panel"><div className="table-toolbar"><div><h2>Study participants</h2><p>Identifiers are pseudonymous in this workspace.</p></div><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search participants" /></div></div><div className="data-table participants-table"><div className="table-head"><span>PARTICIPANT</span><span>GROUP</span><span>ENROLLED</span><span>TRIALS</span><span>CONSENT</span><span>STATUS</span></div>{people.map((person) => <div className="table-row" key={person.id}><div className="person-cell"><div className="person-initials">{initials(person.code)}</div><div><strong>{person.code}</strong><small>Study participant</small></div></div><span>{person.group}</span><span>{person.enrolled}</span><span>{person.trials}</span><span><span className="consent-status"><Check size={12} /> Recorded</span></span><span><span className="status-pill status-active"><span />{person.status}</span></span></div>)}{!people.length && <div className="empty-state">No participants match “{query}”.</div>}</div></section> }
function Sessions({ trials, participants }: { trials: Trial[]; participants: Participant[] }) { return <section className="panel table-panel"><div className="table-toolbar"><div><h2>Trial log</h2><p>Observations stay separate from hypotheses.</p></div><span className="status-pill status-ready"><span /> {trials.length} SAVED</span></div><TrialTable trials={trials} participants={participants} /></section> }
function TrialTable({ trials, participants, compact = false }: { trials: Trial[]; participants: Participant[]; compact?: boolean }) { return <div className={`data-table ${compact ? 'compact-table' : ''}`}><div className="table-head trial-head"><span>TRIAL</span><span>PARTICIPANT</span><span>FRAME</span><span>SLIP</span><span>COMFORT</span><span>OBSERVATION</span></div>{trials.map((trial) => { const slip = trial.measurements.find((measurement) => measurement.metric === 'vertical-slip'); const performed = trial.maneuvers.filter((maneuver) => maneuver.status === 'performed').length; const firstObservation = trial.observations[0]; return <div className="table-row trial-row" key={trial.id}><div className="trial-id"><span className="trial-marker" /><div><strong>{trial.id}</strong><small>{trial.date}</small><small>{performed}/{trial.maneuvers.length} maneuvers · {trial.protocol}</small></div></div><span>{participants.find((p) => p.id === trial.participantId)?.code ?? 'Unknown'}</span><span>{trial.frameName}</span><span className="measure-value">{slip ? <>{slip.value.toFixed(1)} <small>{slip.unit}</small></> : <small>Not recorded</small>}</span><span>{trial.comfort === null ? <small>Not recorded</small> : <span className={`rating rating-${trial.comfort}`}>{trial.comfort} / 5</span>}</span><details className="trial-observation"><summary>{firstObservation?.originalText || 'View recorded steps'}</summary><div className="trial-detail-list">{firstObservation && <span><b>Recorded as:</b> {firstObservation.speaker} · {firstObservation.fidelity} · {firstObservation.recordedAt}</span>}{slip && <span><b>Slip method:</b> {slip.method.replaceAll('-', ' ')} · {slip.quality}{slip.uncertaintyMm === null ? '' : ` · ±${slip.uncertaintyMm} mm`}</span>}{trial.maneuvers.map((maneuver) => <span key={maneuver.id}><b>{maneuver.label}:</b> {maneuver.status.replaceAll('-', ' ')}{maneuver.note ? ` — ${maneuver.note}` : ''}</span>)}{trial.failures.map((failure) => <span key={failure.id}><b>Failure tag:</b> {FIT_FAILURE_OPTIONS.find((option) => option.id === failure.typeId)?.label ?? failure.typeId} · severity {failure.severity} · {failure.side} · onset {failure.onset.replaceAll('-', ' ')} · cited {failure.evidenceMeasurementIds.length + failure.evidenceObservationIds.length} record(s)</span>)}</div></details></div>})}{!trials.length && <div className="empty-state">No trials saved yet. Start a fit session to add the first record.</div>}</div> }

function Prototypes() {
  const cards = [{ id: 'BR-01', name: 'Baseline bridge', status: 'Tested', color: 'lilac', width: '18.0 mm', parent: 'Base frame', trials: '12 trials', change: 'Reference geometry' }, { id: 'BR-14', name: 'Wider contact', status: 'Testing', color: 'mint', width: '20.0 mm', parent: 'BR-01', trials: '5 trials', change: 'Contact width +2.0 mm' }, { id: 'BR-16', name: 'Reduced projection', status: 'Fabrication', color: 'peach', width: '13.5 mm', parent: 'BR-14', trials: 'Awaiting test', change: 'Projection −1.5 mm' }]
  return <div className="prototype-grid">{cards.map((card) => <article className="panel prototype-card" key={card.id}><div className={`prototype-art ${card.color}`}><span className="frame-sketch"><i /><b /><em /></span><span className="prototype-status">{card.status}</span></div><div className="prototype-body"><div className="prototype-kicker">{card.id} <span>· Parent {card.parent}</span></div><h2>{card.name}</h2><div className="prototype-change"><span>Geometry change</span><strong>{card.change}</strong></div><div className="prototype-specs"><span>Bridge contact <strong>{card.width}</strong></span><span>{card.trials}</span></div><button className="text-button">View lineage <ArrowRight size={14} /></button></div></article>)}</div>
}

function Experiments() { return <div className="experiment-list"><section className="panel experiment-record"><div className="experiment-record-head"><div><span className="status-pill status-ready"><span /> READY TO PLAN</span><span className="record-id">EXP-008</span><h2>Isolate nasal contact width</h2><p>Does a wider contact region reduce downward movement during look-down?</p></div><span className="record-icon"><FlaskConical size={19} /></span></div><div className="evidence-links"><strong>Motivated by evidence</strong><span>TR-041 · TR-046 · TR-052 <ArrowRight size={13} /></span><small>3 trials · effect is confounded by temple changes</small></div><div className="experiment-variables"><div><span className="variable-icon changed">↗</span><span>Change</span><strong>Contact width <em>+2 mm</em></strong></div><div><span className="variable-icon fixed">＝</span><span>Hold constant</span><strong>Projection · temple angle · front curve</strong></div><div><span className="variable-icon expected">◎</span><span>Measure</span><strong>Vertical slip · comfort · bridge pressure</strong></div></div><div className="approval-bar"><div><ShieldCheck size={16} /><span>Approval required before fabrication</span></div><button className="button button-primary" onClick={() => window.alert('Experiment approval workflow is next. This demo does not authorize fabrication.')}>Review plan <ArrowRight size={14} /></button></div></section><section className="panel experiment-record secondary-record"><div className="experiment-record-head"><div><span className="status-pill status-neutral"><span /> OPEN QUESTION</span><span className="record-id">EXP-006</span><h2>Separate bridge from temple effects</h2><p>Earlier iterations changed two regions at once; current results can’t isolate which geometry mattered.</p></div><span className="record-icon soft"><CircleHelp size={19} /></span></div><div className="evidence-links"><strong>Confound to resolve</strong><span>BR-12 → BR-14 <ArrowRight size={13} /></span><small>Bridge width and temple splay changed together</small></div></section></div> }

function ResearchMemory() { return <div className="memory-grid"><MemoryCard tone="green" icon={<ArrowDownRight size={18} />} type="EARLY SIGNAL" title="Wider contact may reduce downward movement" body="BR-14 trials observed less slip in 4 of 5 sessions. This is a signal to test, not established causality." source="TR-041 · TR-046 · TR-052" foot="5 trials" /><MemoryCard tone="amber" icon={<SlidersHorizontal size={18} />} type="CONFOUNDER" title="Temple geometry changed at the same time" body="Current bridge/contact comparison cannot attribute the observed change to one parameter." source="BR-12 → BR-14" foot="Needs isolation" /><MemoryCard tone="blue" icon={<CircleHelp size={18} />} type="UNKNOWN" title="Left/right contact asymmetry isn’t captured yet" body="No paired measurements are available. Add side-specific contact observations to the next protocol revision." source="Protocol v1.3" foot="Open question" /></div> }
function MemoryCard({ tone, icon, type, title, body, source, foot }: { tone: string; icon: ReactNode; type: string; title: string; body: string; source: string; foot: string }) { return <section className="panel memory-card"><div className="memory-heading"><span className={`memory-icon ${tone}`}>{icon}</span><span className="memory-type">{type}</span></div><h2>{title}</h2><p>{body}</p><div className="memory-source"><BookOpenText size={14} /> {source}<span>{foot}</span></div></section> }

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>{children}</section></div> }

export default App
