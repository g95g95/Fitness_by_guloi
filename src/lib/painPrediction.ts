/**
 * BiomechCoach - Pain Prediction System
 *
 * Predicts probable pain locations based on detected biomechanical
 * patterns, asymmetries, and movement dysfunctions.
 */

import { StaticPatternFlags } from './poseTypes';
import { AsymmetryObservation, InstabilityObservation } from './assessmentTypes';
import { AngleDeviation } from './exerciseStandards';

/**
 * Predicted pain entry
 */
export interface PredictedPain {
  location: string;
  probability: 'high' | 'moderate' | 'low';
  reason: string;
  relatedPatterns: string[];
  preventionTips: string[];
}

/**
 * Pain prediction based on patterns and biomechanics
 */
export function predictProbablePains(
  patternFlags: StaticPatternFlags,
  asymmetries: AsymmetryObservation[],
  instabilities: InstabilityObservation[],
  angleDeviations: AngleDeviation[],
  exerciseCategory: string
): PredictedPain[] {
  const predictions: PredictedPain[] = [];

  // ============================================================================
  // KNEE VALGUS → Knee pain (medial, anterior, patellofemoral)
  // ============================================================================
  if (patternFlags.static_knee_valgus) {
    predictions.push({
      location: 'Ginocchio anteriore / Rotula',
      probability: 'high',
      reason: 'Il valgo del ginocchio aumenta lo stress sulla rotula e sul tendine rotuleo, causando potenziale sindrome femoro-rotulea.',
      relatedPatterns: ['Knee valgus', 'VMO weakness'],
      preventionTips: [
        'Rinforza il vasto mediale obliquo (VMO)',
        'Stretching della bandelletta ileotibiale',
        'Esercizi di controllo del ginocchio (wall sits, step-downs)',
      ],
    });

    predictions.push({
      location: 'Ginocchio mediale (interno)',
      probability: 'moderate',
      reason: 'Il collasso mediale del ginocchio stressa il legamento collaterale mediale (LCM) e il menisco mediale.',
      relatedPatterns: ['Knee valgus', 'Hip weakness'],
      preventionTips: [
        'Rinforza gli abduttori dell\'anca',
        'Clamshells e monster walks',
        'Focus sull\'allineamento knee-over-toe',
      ],
    });
  }

  // ============================================================================
  // HIP DROP → Hip, lower back, IT band pain
  // ============================================================================
  if (patternFlags.static_hip_drop) {
    predictions.push({
      location: 'Anca laterale (borsite trocanterica)',
      probability: 'high',
      reason: 'Il drop pelvico indica debolezza del gluteo medio, che può causare irritazione della borsa trocanterica.',
      relatedPatterns: ['Hip drop', 'Gluteus medius weakness'],
      preventionTips: [
        'Side-lying hip abduction',
        'Single-leg bridges',
        'Clamshells con banda elastica',
      ],
    });

    predictions.push({
      location: 'Zona lombare (lower back)',
      probability: 'moderate',
      reason: 'L\'instabilità pelvica costringe la colonna lombare a compensare, causando sovraccarico muscolare.',
      relatedPatterns: ['Hip drop', 'Pelvic instability'],
      preventionTips: [
        'Core stability exercises',
        'Dead bugs e bird dogs',
        'Plank con variazioni',
      ],
    });

    predictions.push({
      location: 'Bandelletta ileotibiale (IT band)',
      probability: 'moderate',
      reason: 'Il drop del bacino aumenta la tensione sulla bandelletta ileotibiale, specialmente durante attività ripetitive.',
      relatedPatterns: ['Hip drop', 'Lateral hip weakness'],
      preventionTips: [
        'Foam rolling della IT band',
        'Stretching del TFL',
        'Rinforzo gluteo medio',
      ],
    });
  }

  // ============================================================================
  // TRUNK COMPENSATION → Back pain, hip flexor tightness
  // ============================================================================
  if (patternFlags.static_trunk_compensation) {
    predictions.push({
      location: 'Zona lombare',
      probability: 'high',
      reason: 'La compensazione del tronco indica che i muscoli della schiena stanno lavorando eccessivamente per mantenere l\'equilibrio.',
      relatedPatterns: ['Trunk compensation', 'Core weakness'],
      preventionTips: [
        'Rinforza il core profondo (trasverso)',
        'Dead bug progressions',
        'Pallof press anti-rotazione',
      ],
    });

    predictions.push({
      location: 'Flessori dell\'anca',
      probability: 'moderate',
      reason: 'L\'eccessiva inclinazione del tronco spesso indica flessori dell\'anca accorciati che tirano il bacino in antiversione.',
      relatedPatterns: ['Trunk lean', 'Hip flexor tightness'],
      preventionTips: [
        'Stretching dello psoas',
        'Couch stretch',
        'Half-kneeling hip flexor stretch',
      ],
    });
  }

  // ============================================================================
  // INSTABILITY → Ankle, foot pain
  // ============================================================================
  if (patternFlags.static_instability) {
    predictions.push({
      location: 'Caviglia (laterale)',
      probability: 'high',
      reason: 'L\'instabilità posturale indica debolezza degli stabilizzatori della caviglia, aumentando il rischio di distorsioni.',
      relatedPatterns: ['Postural instability', 'Ankle weakness'],
      preventionTips: [
        'Single-leg balance progressions',
        'Heel raises lenti e controllati',
        'Propriocezione su superfici instabili',
      ],
    });

    predictions.push({
      location: 'Arco plantare / Fascite',
      probability: 'moderate',
      reason: 'La scarsa stabilità della caviglia sovraccarica la fascia plantare per compensare.',
      relatedPatterns: ['Instability', 'Foot weakness'],
      preventionTips: [
        'Towel scrunches',
        'Short foot exercise',
        'Calf stretching',
      ],
    });
  }

  // ============================================================================
  // ANKLE PRONATION → Foot, shin, knee pain
  // ============================================================================
  if (patternFlags.static_ankle_pronation) {
    predictions.push({
      location: 'Arco plantare / Piede piatto',
      probability: 'high',
      reason: 'La pronazione eccessiva collassa l\'arco plantare, stressando la fascia e i muscoli intrinseci del piede.',
      relatedPatterns: ['Ankle pronation', 'Arch collapse'],
      preventionTips: [
        'Rinforzo del tibiale posteriore',
        'Short foot exercise',
        'Considera plantari di supporto',
      ],
    });

    predictions.push({
      location: 'Tibia (shin splints)',
      probability: 'moderate',
      reason: 'La pronazione aumenta lo stress torsionale sulla tibia, causando periostite tibiale.',
      relatedPatterns: ['Pronation', 'Tibial stress'],
      preventionTips: [
        'Toe raises per il tibiale anteriore',
        'Calf stretching',
        'Progressione graduale del carico',
      ],
    });

    predictions.push({
      location: 'Ginocchio mediale',
      probability: 'moderate',
      reason: 'La pronazione causa una rotazione interna della tibia che si trasmette al ginocchio.',
      relatedPatterns: ['Pronation', 'Tibial rotation'],
      preventionTips: [
        'Controllo della pronazione',
        'Rinforzo della catena posteriore',
        'Esercizi di allineamento',
      ],
    });
  }

  // ============================================================================
  // ASYMMETRY → Overuse on dominant side
  // ============================================================================
  const significantAsymmetry = asymmetries.some(a => a.significance === 'significant');
  const moderateAsymmetry = asymmetries.some(a => a.significance === 'moderate');

  if (significantAsymmetry) {
    predictions.push({
      location: 'Lato dominante (sovraccarico)',
      probability: 'high',
      reason: 'Asimmetrie significative indicano che un lato lavora più dell\'altro, aumentando il rischio di infortuni da sovraccarico.',
      relatedPatterns: ['Bilateral asymmetry', 'Compensation'],
      preventionTips: [
        'Esercizi unilaterali sul lato debole',
        'Bilanciare il volume di lavoro',
        'Focus sulla simmetria durante gli esercizi',
      ],
    });
  } else if (moderateAsymmetry) {
    predictions.push({
      location: 'Lato dominante',
      probability: 'low',
      reason: 'Asimmetrie moderate possono portare a squilibri nel tempo se non corrette.',
      relatedPatterns: ['Mild asymmetry'],
      preventionTips: [
        'Monitorare le differenze L/R',
        'Includere esercizi unilaterali',
      ],
    });
  }

  // ============================================================================
  // CATEGORY-SPECIFIC PREDICTIONS
  // ============================================================================
  switch (exerciseCategory) {
    case 'squat':
      // Check for knee angle deviations
      const kneeDeviation = angleDeviations.find(
        d => d.angleName.includes('Knee') && d.status === 'out_of_range'
      );
      if (kneeDeviation) {
        predictions.push({
          location: 'Ginocchio (anteriore)',
          probability: 'moderate',
          reason: `Angolo del ginocchio fuori range (${kneeDeviation.measured.toFixed(0)}° vs ${kneeDeviation.ideal}° ideale) aumenta lo stress articolare.`,
          relatedPatterns: ['Squat depth issue'],
          preventionTips: [
            'Lavora sulla mobilità della caviglia',
            'Box squats per controllare la profondità',
            'Stretching dei quadricipiti',
          ],
        });
      }
      break;

    case 'hinge':
      const hipDeviation = angleDeviations.find(
        d => d.angleName.includes('Hip') && d.status !== 'optimal'
      );
      if (hipDeviation || patternFlags.static_trunk_compensation) {
        predictions.push({
          location: 'Zona lombare',
          probability: 'high',
          reason: 'Pattern di hip hinge scorretto carica eccessivamente la colonna lombare invece dei glutei e hamstrings.',
          relatedPatterns: ['Hinge pattern dysfunction'],
          preventionTips: [
            'Romanian deadlift con focus sulla tecnica',
            'Hip hinge contro il muro',
            'Attivazione dei glutei prima del movimento',
          ],
        });
      }
      break;

    case 'balance':
      if (instabilities.some(i => i.severity === 'severe')) {
        predictions.push({
          location: 'Caviglia (distorsione)',
          probability: 'high',
          reason: 'Instabilità severa durante esercizi di equilibrio indica alto rischio di distorsione della caviglia.',
          relatedPatterns: ['Severe instability', 'Poor proprioception'],
          preventionTips: [
            'Progressione graduale degli esercizi di equilibrio',
            'Inizia con supporto e rimuovi gradualmente',
            'Rinforzo degli stabilizzatori della caviglia',
          ],
        });
      }
      break;

    case 'lunge':
      if (patternFlags.static_knee_valgus || patternFlags.static_hip_drop) {
        predictions.push({
          location: 'Ginocchio anteriore (gamba avanti)',
          probability: 'high',
          reason: 'Durante il lunge, il valgo del ginocchio o il drop del bacino aumentano lo stress sulla rotula.',
          relatedPatterns: ['Lunge mechanics'],
          preventionTips: [
            'Focus sull\'allineamento del ginocchio',
            'Inizia con split squat statici',
            'Rinforza i glutei prima di progredire',
          ],
        });
      }
      break;
  }

  // Sort by probability
  const probabilityOrder = { high: 0, moderate: 1, low: 2 };
  predictions.sort((a, b) => probabilityOrder[a.probability] - probabilityOrder[b.probability]);

  // Remove duplicates (keep highest probability)
  const seen = new Set<string>();
  const uniquePredictions = predictions.filter(p => {
    if (seen.has(p.location)) return false;
    seen.add(p.location);
    return true;
  });

  return uniquePredictions;
}

export default predictProbablePains;
