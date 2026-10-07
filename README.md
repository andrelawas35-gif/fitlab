# FitLab research workspace

An early founder-facing prototype for conducting structured eyewear-fit research. The current slice prioritizes research workflow and evidence records over face scanning, prediction, or automated geometry generation.

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Implemented in this slice

- Study control-room overview with provisional sample metrics and research signal cards.
- Participant list with pseudonymous codes and search.
- Add participant flow with a consent-confirmation checkbox.
- Record a fit trial: participant, prototype, protocol, manually entered vertical slip, 1–5 comfort rating, and the participant's original comment.
- Versioned five-step protocol (neutral, smile, look down, head movement, return to neutral), each explicitly marked performed/skipped/not recorded with a separate note.
- Measurements now carry units, method, provisional/unknown quality, and optional uncertainty; a blank slip stays missing rather than becoming `0 mm`.
- Trial log, prototype cards, experiment review, and evidence-linked research memory pages.
- Local browser persistence (`localStorage`) and restore-sample action.
- Browser data v1/v2 → v3 migration, preserving older comments/values while marking protocol steps as not recorded when the earlier form did not capture them.
- Subjective observation provenance: original text is immutable within a trial record and attributed as participant-verbatim, researcher paraphrase, or researcher observation; legacy notes retain “unspecified” fidelity rather than being assumed verbatim.
- Versioned fit-failure taxonomy v1 with location, side, anchored severity, onset maneuver, researcher-entered status, and references to exact measurement/observation IDs. This MVP captures one primary failure per trial.
- Sticky save actions in the long fit-session dialog for mobile.
- No raw face images/video collection, cloud upload, AI analysis, or fabrication approval.

## Important prototype limits

- The preloaded records and research signals are fictional demonstration data. They are marked as sample data in the UI.
- Data is stored only in the current browser profile. It is not backed up, synchronized, encrypted by FitLab, or appropriate for real participant research.
- The UI is not a validated study protocol or measurement instrument. Entered dimensions are labeled provisional.
- The consent checkbox only confirms that the researcher obtained consent elsewhere; it is not a consent-management system.
- `src/data.ts` is a temporary local-store seam. Replace it with a typed service against a reviewed PostgreSQL schema and private object storage before collecting real participant data.

## Next implementation steps

1. Expand from one primary failure tag to multiple independently rated failure records per trial.
2. Review protocol wording/severity anchors with a real optician or eyewear-fit researcher before study use.
3. Implement PostgreSQL/auth/role policies and private storage only after consent/retention requirements are established.
4. Add rendered mobile/desktop interaction tests and research protocol version management.

## Checks

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```
