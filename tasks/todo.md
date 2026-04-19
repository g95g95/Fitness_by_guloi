# Task: Knee Structural Assessment — Rep Segmentation + Phase-Based Valgus + Bilateral Differential

## Objective

Migliorare il test strutturale al ginocchio (basato su `single-leg-squat-left/right`) in modo che, invece di mediare tutte le metriche sull'intera durata del recording, il codebase:

1. Segmenti le ripetizioni e catturi il **picco di valgo al momento della massima flessione** (non una media diluita)
2. Classifichi **in quale fase della discesa** compare il valgo → differenziale causa prossimale (anca) vs distale (caviglia)
3. Confronti automaticamente L vs R quando l'utente esegue entrambe le versioni dell'esercizio → diagnosi strutturale automatica nel report

Questi sono i tre upgrade a **massimo impatto clinico / minimo impatto codice** identificati nella discussione.

---

## Background — Razionale clinico

Il single-leg squat è il gold standard per valutare le cause strutturali del dolore al ginocchio. Oggi il codebase:

- **Media le metriche** su tutto il recording → il valgo che appare solo negli ultimi gradi della discesa viene **diluito dalla posizione eretta iniziale**
- **Non segmenta le ripetizioni** → non si distingue tra "1 rep brutta su 5" e "5 rep brutte"
- **Non analizza la fase temporale** → non si distingue un valgo **precoce** (caviglia/pronazione) da un valgo **profondo** (medio gluteo)
- **Non confronta automaticamente L vs R** → l'utente deve leggere due report e confrontarli a occhio

La letteratura (Powers 2010, Willson & Davis 2008) indica che il **momento di comparsa** del valgo è più diagnostico del valgo medio. Inoltre l'asimmetria L/R > 5° su picco di flessione o valgo è indicatore strutturale forte.

---

## Files Coinvolti (da modificare)

| File | Modifica |
|------|----------|
| `src/lib/poseTypes.ts` | Estendere `StaticMetrics` con `repAnalysis` (array di rep) e `phaseAnalysis` (valgo per fase) |
| `src/lib/patterns/staticPatterns.ts` | Aggiungere `segmentReps()` e `computePhaseValgus()`; calcolare peak-valgus-at-peak-flexion per rep |
| `src/lib/assessmentRecommendations.ts` | Aggiungere `compareBilateralExercises()` → genera `structuralDiagnosis` nel sessionSummary |
| `src/lib/assessmentTypes.ts` | Aggiungere campo `structuralDiagnosis?: string` al `sessionSummary` |
| `src/components/AssessmentSummaryPanel.tsx` | Mostrare rep count, peak-valgus per rep, phase (early/mid/deep), e diagnosi bilaterale |

**Nessun nuovo file.** Nessuna modifica ai hooks di pose estimation o al layer MediaPipe. L'analisi è puramente post-processing sui dati già raccolti in `rawMetrics`.

---

## Todo

### Fase 1 — Rep segmentation (il fondamento di tutto)
- [ ] Leggere `staticPatterns.ts` per capire struttura esatta di `StaticRawMetrics`
- [ ] Aggiungere `RepSegment` interface in `poseTypes.ts`: `{ startIdx, endIdx, peakFlexionIdx, peakFlexionAngle, peakValgusAtFlexion }`
- [ ] Implementare `segmentReps(kneeAngleHistory)` in `staticPatterns.ts`: trova minimi locali (max flessione) su serie smoothed, con soglia di ampiezza minima (delta ≥ 15°) per ignorare il rumore
- [ ] Per ogni rep, estrarre il valgo al frame di peak flexion (non medio)
- [ ] Aggiungere `repAnalysis: RepSegment[]` a `StaticMetrics`

### Fase 2 — Phase analysis (diagnostico chiave)
- [ ] Aggiungere `PhaseValgus` interface: `{ earlyMean, midMean, deepMean, onsetPhase: 'early' | 'mid' | 'deep' | 'none' }`
- [ ] Implementare `computePhaseValgus()` in `staticPatterns.ts`: dividere ogni rep in 3 fasi per range di flessione (0-30°, 30-60°, >60° rispetto alla flessione iniziale), computare valgo medio per fase
- [ ] Determinare `onsetPhase` = prima fase in cui il valgo supera la soglia
- [ ] Aggiungere `phaseAnalysis: PhaseValgus` a `StaticMetrics`

### Fase 3 — Differenziale bilaterale automatico
- [ ] In `assessmentRecommendations.ts`, aggiungere `compareBilateralExercises(results: ExerciseAssessmentResult[]): string | null`
- [ ] Pattern matching sui coppie `single-leg-squat-left` + `single-leg-squat-right`, `step-down-left` + `step-down-right`
- [ ] Generare testo diagnostico esempio: `"Knee valgus 12° right (deep phase) vs 3° left (none) → probable right proximal dysfunction (glute med)"`
- [ ] Esporre come `sessionSummary.structuralDiagnosis`

### Fase 4 — UI display
- [ ] In `AssessmentSummaryPanel.tsx`, aggiungere sezione "Rep analysis" con numero di rep, profondità media, picco valgo
- [ ] Mostrare fase di onset del valgo con colore (early=arancione/caviglia, deep=rosso/anca)
- [ ] Se presente `sessionSummary.structuralDiagnosis`, mostrarlo in un banner in cima al report

### Fase 5 — Verifica
- [ ] `npm run build` — no TS errors
- [ ] `npm run lint` — no warnings introdotti
- [ ] Test manuale: eseguire single-leg-squat L+R dal browser, verificare che rep count sia realistico e che la diagnosi bilaterale compaia

---

## Non-goals (esplicitamente esclusi per mantenere la semplicità)

- ❌ Nuovo esercizio dedicato `knee-structural-assessment` — usiamo gli esistenti
- ❌ Modifica alle soglie `DEFAULT_STATIC_THRESHOLDS` (knee-specific mode) — rimandata
- ❌ Vista laterale combinata (dorsiflessione/hip hinge) — rimandata
- ❌ Confidence gating più stretto — rimandato
- ❌ Modifiche al layer MediaPipe / pose estimation

Tutti questi sono stati discussi ma sono migliorie di secondo livello. L'impatto maggiore arriva dalle Fasi 1-3.

---

## Review

_Da compilare a fine implementazione._

