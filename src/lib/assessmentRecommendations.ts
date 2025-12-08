/**
 * BiomechCoach - Assessment Recommendations Generator
 *
 * Generates exercise, muscle, and neuromotor pattern recommendations
 * based on assessment results and detected issues.
 */

import { StaticPatternFlags } from './poseTypes';
import {
  AngleDeviation,
  ExerciseRecommendation,
  MuscleRecommendation,
  PatternRecommendation,
} from './exerciseStandards';
import { AsymmetryObservation, InstabilityObservation } from './assessmentTypes';

/**
 * Generate exercise recommendations based on detected issues
 */
export function generateExerciseRecommendations(
  _exerciseId: string,
  patternFlags: StaticPatternFlags,
  asymmetries: AsymmetryObservation[],
  _instabilities: InstabilityObservation[],
  angleDeviations: AngleDeviation[]
): ExerciseRecommendation[] {
  const recommendations: ExerciseRecommendation[] = [];

  // Pattern-based recommendations
  if (patternFlags.static_knee_valgus) {
    recommendations.push({
      exercise: 'Clamshells',
      reason: 'Ginocchio valgo rilevato - rinforza gli abduttori dell\'anca',
      targetArea: 'Hip abductors',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Monster Walks con banda elastica',
      reason: 'Migliora il controllo del ginocchio durante il movimento',
      targetArea: 'Glutes and hip stabilizers',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Wall Sits con palla tra le ginocchia',
      reason: 'Attiva gli adduttori mantenendo l\'allineamento',
      targetArea: 'Quadriceps and adductors',
      priority: 'medium',
    });
  }

  if (patternFlags.static_hip_drop) {
    recommendations.push({
      exercise: 'Side-lying Hip Abduction',
      reason: 'Drop pelvico rilevato - rinforza il gluteo medio',
      targetArea: 'Gluteus medius',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Single-leg Bridge',
      reason: 'Migliora la stabilità del bacino su una gamba',
      targetArea: 'Glutes and core',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Copenhagen Plank',
      reason: 'Rinforza adduttori per stabilità pelvica',
      targetArea: 'Adductors and core',
      priority: 'medium',
    });
  }

  if (patternFlags.static_trunk_compensation) {
    recommendations.push({
      exercise: 'Dead Bug',
      reason: 'Compensazione del tronco - migliora il controllo del core',
      targetArea: 'Core stability',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Pallof Press',
      reason: 'Anti-rotazione per stabilità del tronco',
      targetArea: 'Core anti-rotation',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Bird Dog',
      reason: 'Dissociazione anca-tronco con controllo',
      targetArea: 'Core and hip stability',
      priority: 'medium',
    });
  }

  if (patternFlags.static_instability) {
    recommendations.push({
      exercise: 'Single-leg Stance con occhi chiusi',
      reason: 'Instabilità rilevata - migliora la propriocezione',
      targetArea: 'Balance and proprioception',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'BOSU Ball Balance',
      reason: 'Sfida progressiva per l\'equilibrio',
      targetArea: 'Ankle stability',
      priority: 'medium',
    });
    recommendations.push({
      exercise: 'Heel-to-toe Walking',
      reason: 'Migliora l\'equilibrio dinamico',
      targetArea: 'Dynamic balance',
      priority: 'medium',
    });
  }

  if (patternFlags.static_ankle_pronation) {
    recommendations.push({
      exercise: 'Towel Scrunches',
      reason: 'Pronazione della caviglia - rinforza i muscoli del piede',
      targetArea: 'Intrinsic foot muscles',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Heel Raises lenti e controllati',
      reason: 'Migliora il controllo della caviglia',
      targetArea: 'Ankle stabilizers',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Single-leg Balance su superficie instabile',
      reason: 'Sfida la stabilità della caviglia',
      targetArea: 'Ankle proprioception',
      priority: 'medium',
    });
  }

  // Asymmetry-based recommendations
  const hasSignificantAsymmetry = asymmetries.some(a => a.significance === 'significant');
  if (hasSignificantAsymmetry) {
    recommendations.push({
      exercise: 'Esercizi unilaterali sul lato debole',
      reason: 'Asimmetria significativa rilevata - bilanciare i due lati',
      targetArea: 'Bilateral symmetry',
      priority: 'high',
    });
    recommendations.push({
      exercise: 'Bulgarian Split Squat',
      reason: 'Esercizio unilaterale per forza e controllo',
      targetArea: 'Single-leg strength',
      priority: 'medium',
    });
  }

  // Angle deviation recommendations
  for (const deviation of angleDeviations) {
    if (deviation.status === 'out_of_range' || deviation.status === 'needs_improvement') {
      if (deviation.angleName.includes('Knee') && deviation.measured > deviation.ideal) {
        recommendations.push({
          exercise: 'Stretching quadricipiti e flessori dell\'anca',
          reason: `Angolo del ginocchio limitato (${deviation.measured.toFixed(1)}° vs ${deviation.ideal}° ideale)`,
          targetArea: 'Knee mobility',
          priority: deviation.status === 'out_of_range' ? 'high' : 'medium',
        });
      }
      if (deviation.angleName.includes('Hip') && deviation.measured < deviation.ideal) {
        recommendations.push({
          exercise: 'Mobilità dell\'anca (90/90 stretch)',
          reason: `Flessibilità dell'anca limitata`,
          targetArea: 'Hip mobility',
          priority: deviation.status === 'out_of_range' ? 'high' : 'medium',
        });
      }
    }
  }

  // Remove duplicates and limit
  const uniqueRecommendations = recommendations.filter(
    (rec, index, self) => index === self.findIndex(r => r.exercise === rec.exercise)
  );

  // Sort by priority and limit to top 5
  return uniqueRecommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);
}

/**
 * Generate muscle strengthening recommendations
 */
export function generateMuscleRecommendations(
  patternFlags: StaticPatternFlags,
  _asymmetries: AsymmetryObservation[],
  exerciseCategory: string
): MuscleRecommendation[] {
  const recommendations: MuscleRecommendation[] = [];

  // Pattern-based muscle recommendations
  if (patternFlags.static_knee_valgus) {
    recommendations.push({
      muscle: 'Gluteo Medio',
      reason: 'Debolezza che contribuisce al valgo del ginocchio',
      exercises: ['Clamshells', 'Side-lying Hip Abduction', 'Monster Walks'],
      priority: 'high',
    });
    recommendations.push({
      muscle: 'Vasto Mediale Obliquo (VMO)',
      reason: 'Stabilizzatore mediale del ginocchio',
      exercises: ['Terminal Knee Extension', 'Wall Sits', 'Step-ups'],
      priority: 'high',
    });
  }

  if (patternFlags.static_hip_drop) {
    recommendations.push({
      muscle: 'Gluteo Medio',
      reason: 'Stabilizzatore principale del bacino su una gamba',
      exercises: ['Side Plank con hip dip', 'Single-leg Bridge', 'Clamshells'],
      priority: 'high',
    });
    recommendations.push({
      muscle: 'Quadrato dei Lombi',
      reason: 'Contribuisce alla stabilità del bacino',
      exercises: ['Side Plank', 'Farmer\'s Walk unilaterale'],
      priority: 'medium',
    });
  }

  if (patternFlags.static_trunk_compensation) {
    recommendations.push({
      muscle: 'Core (Trasverso dell\'addome)',
      reason: 'Stabilizzatore profondo del tronco',
      exercises: ['Dead Bug', 'Hollow Hold', 'Plank'],
      priority: 'high',
    });
    recommendations.push({
      muscle: 'Obliqui',
      reason: 'Controllo anti-rotazione del tronco',
      exercises: ['Pallof Press', 'Russian Twist', 'Side Plank'],
      priority: 'high',
    });
  }

  if (patternFlags.static_instability) {
    recommendations.push({
      muscle: 'Stabilizzatori della caviglia',
      reason: 'Peronei e tibiale per controllo laterale',
      exercises: ['Heel Raises', 'Single-leg Balance', 'Ankle Alphabet'],
      priority: 'high',
    });
    recommendations.push({
      muscle: 'Muscoli intrinseci del piede',
      reason: 'Base di appoggio e propriocezione',
      exercises: ['Towel Scrunches', 'Short Foot Exercise', 'Marble Pickup'],
      priority: 'medium',
    });
  }

  if (patternFlags.static_ankle_pronation) {
    recommendations.push({
      muscle: 'Tibiale Posteriore',
      reason: 'Principale supporto dell\'arco plantare',
      exercises: ['Heel Raises con inversione', 'Towel Scrunches'],
      priority: 'high',
    });
    recommendations.push({
      muscle: 'Peronei',
      reason: 'Stabilizzatori laterali della caviglia',
      exercises: ['Eversion resistance', 'Single-leg balance'],
      priority: 'medium',
    });
  }

  // Category-specific recommendations
  switch (exerciseCategory) {
    case 'squat':
      if (!recommendations.some(r => r.muscle.includes('Gluteo'))) {
        recommendations.push({
          muscle: 'Grande Gluteo',
          reason: 'Estensore principale dell\'anca per squat',
          exercises: ['Hip Thrust', 'Romanian Deadlift', 'Sumo Squat'],
          priority: 'medium',
        });
      }
      break;
    case 'balance':
      if (!recommendations.some(r => r.muscle.includes('caviglia'))) {
        recommendations.push({
          muscle: 'Complesso della caviglia',
          reason: 'Fondamentale per l\'equilibrio monopodalico',
          exercises: ['Heel Raises', 'Toe Raises', 'BOSU Balance'],
          priority: 'medium',
        });
      }
      break;
    case 'hinge':
      recommendations.push({
        muscle: 'Hamstrings (Ischio-crurali)',
        reason: 'Protagonisti del movimento di hip hinge',
        exercises: ['Romanian Deadlift', 'Good Morning', 'Nordic Curl'],
        priority: 'high',
      });
      break;
  }

  // Remove duplicates
  const uniqueRecommendations = recommendations.filter(
    (rec, index, self) => index === self.findIndex(r => r.muscle === rec.muscle)
  );

  return uniqueRecommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 4);
}

/**
 * Generate neuromotor pattern recommendations
 */
export function generatePatternRecommendations(
  patternFlags: StaticPatternFlags,
  instabilities: InstabilityObservation[],
  exerciseCategory: string
): PatternRecommendation[] {
  const recommendations: PatternRecommendation[] = [];

  // Instability-based pattern recommendations
  const hasSevereInstability = instabilities.some(i => i.severity === 'severe');
  const hasModerateInstability = instabilities.some(i => i.severity === 'moderate');

  if (hasSevereInstability || patternFlags.static_instability) {
    recommendations.push({
      pattern: 'Controllo posturale reattivo',
      description: 'Capacità di correggere rapidamente le perturbazioni dell\'equilibrio',
      drills: [
        'Perturbation training su superficie stabile',
        'Single-leg stance con spinte esterne leggere',
        'Tandem stance con variazioni visive',
      ],
      priority: 'high',
    });
  }

  if (hasModerateInstability) {
    recommendations.push({
      pattern: 'Integrazione propriocettiva',
      description: 'Migliorare il feedback sensoriale dai piedi e caviglie',
      drills: [
        'Balance board training',
        'Esercizi a piedi nudi su superfici variate',
        'Closed-eye balance progressions',
      ],
      priority: 'high',
    });
  }

  // Pattern flag-based recommendations
  if (patternFlags.static_knee_valgus) {
    recommendations.push({
      pattern: 'Controllo del ginocchio in catena cinetica',
      description: 'Mantenere l\'allineamento knee-over-toe durante il movimento',
      drills: [
        'Slow eccentric squats con focus sull\'allineamento',
        'Single-leg squat contro il muro',
        'Step-down con mirror feedback',
      ],
      priority: 'high',
    });
  }

  if (patternFlags.static_hip_drop) {
    recommendations.push({
      pattern: 'Stabilizzazione pelvica monopodalica',
      description: 'Mantenere il bacino livellato durante l\'appoggio su una gamba',
      drills: [
        'Single-leg stance con pelvis level check',
        'Marching in place con controllo pelvico',
        'Single-leg deadlift con focus sul bacino',
      ],
      priority: 'high',
    });
  }

  if (patternFlags.static_trunk_compensation) {
    recommendations.push({
      pattern: 'Dissociazione anca-tronco',
      description: 'Muovere le anche indipendentemente dal tronco',
      drills: [
        'Hip circles con tronco stabile',
        'Dead Bug progressions',
        'Bird Dog con anti-rotazione',
      ],
      priority: 'high',
    });
  }

  // Category-specific patterns
  switch (exerciseCategory) {
    case 'squat':
      if (!recommendations.some(r => r.pattern.includes('ginocchio'))) {
        recommendations.push({
          pattern: 'Sequenza di attivazione nello squat',
          description: 'Core → Glutei → Quadricipiti nella sequenza corretta',
          drills: [
            'Tempo squats (3 secondi in discesa)',
            'Box squats con pausa',
            'Goblet squats con focus breathing',
          ],
          priority: 'medium',
        });
      }
      break;
    case 'hinge':
      recommendations.push({
        pattern: 'Hip hinge pattern',
        description: 'Flettere dall\'anca mantenendo la colonna neutra',
        drills: [
          'Wall hip hinge (sedere tocca il muro)',
          'Romanian Deadlift con bastone sulla schiena',
          'Cable pull-through',
        ],
        priority: 'high',
      });
      break;
    case 'lunge':
      recommendations.push({
        pattern: 'Stabilità in posizione split',
        description: 'Controllo del baricentro in base d\'appoggio stretta',
        drills: [
          'Split squat isometric holds',
          'Walking lunges lenti',
          'Reverse lunge con anti-rotation',
        ],
        priority: 'medium',
      });
      break;
  }

  // Remove duplicates
  const uniqueRecommendations = recommendations.filter(
    (rec, index, self) => index === self.findIndex(r => r.pattern === rec.pattern)
  );

  return uniqueRecommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);
}

/**
 * Generate summary text for assessment
 */
export function generateAssessmentSummary(
  exerciseName: string,
  score: number,
  patternFlags: StaticPatternFlags,
  asymmetries: AsymmetryObservation[],
  instabilities: InstabilityObservation[]
): string {
  const issues: string[] = [];

  if (patternFlags.static_instability) issues.push('instabilità posturale');
  if (patternFlags.static_hip_drop) issues.push('drop del bacino');
  if (patternFlags.static_knee_valgus) issues.push('valgo del ginocchio');
  if (patternFlags.static_trunk_compensation) issues.push('compensazione del tronco');
  if (patternFlags.static_ankle_pronation) issues.push('pronazione della caviglia');

  const significantAsymmetries = asymmetries.filter(a => a.significance !== 'minor');
  if (significantAsymmetries.length > 0) {
    issues.push('asimmetrie rilevanti');
  }

  const severeInstabilities = instabilities.filter(i => i.severity === 'severe');
  if (severeInstabilities.length > 0) {
    issues.push('difficoltà di controllo significative');
  }

  let summary = `Assessment "${exerciseName}" completato con punteggio ${score}/100. `;

  if (score >= 85) {
    summary += 'Ottimo controllo dimostrato! ';
    if (issues.length > 0) {
      summary += `Piccoli aspetti da monitorare: ${issues.join(', ')}.`;
    } else {
      summary += 'Nessun pattern compensatorio significativo rilevato.';
    }
  } else if (score >= 70) {
    summary += 'Buon controllo con alcuni aspetti migliorabili. ';
    summary += issues.length > 0
      ? `Pattern rilevati: ${issues.join(', ')}.`
      : 'Continua a lavorare sulla stabilità generale.';
  } else if (score >= 50) {
    summary += 'Controllo discreto, con margini di miglioramento. ';
    summary += `Aree di focus: ${issues.join(', ')}.`;
  } else {
    summary += 'Si raccomanda di lavorare sui seguenti aspetti: ';
    summary += issues.join(', ') + '. ';
    summary += 'Considera di consultare un professionista per una valutazione approfondita.';
  }

  return summary;
}

/**
 * Aggregate recommendations from multiple exercises
 */
export function aggregateRecommendations(
  allExerciseRecs: ExerciseRecommendation[][],
  allMuscleRecs: MuscleRecommendation[][],
  allPatternRecs: PatternRecommendation[][]
): {
  priorityExercises: ExerciseRecommendation[];
  musclesFocus: MuscleRecommendation[];
  patternsFocus: PatternRecommendation[];
} {
  // Flatten and count occurrences
  const exerciseCounts = new Map<string, { rec: ExerciseRecommendation; count: number }>();
  for (const recs of allExerciseRecs) {
    for (const rec of recs) {
      const existing = exerciseCounts.get(rec.exercise);
      if (existing) {
        existing.count++;
        // Upgrade priority if appears multiple times
        if (rec.priority === 'high' || existing.rec.priority !== 'high') {
          existing.rec = rec;
        }
      } else {
        exerciseCounts.set(rec.exercise, { rec, count: 1 });
      }
    }
  }

  const muscleCounts = new Map<string, { rec: MuscleRecommendation; count: number }>();
  for (const recs of allMuscleRecs) {
    for (const rec of recs) {
      const existing = muscleCounts.get(rec.muscle);
      if (existing) {
        existing.count++;
        if (rec.priority === 'high') existing.rec.priority = 'high';
      } else {
        muscleCounts.set(rec.muscle, { rec, count: 1 });
      }
    }
  }

  const patternCounts = new Map<string, { rec: PatternRecommendation; count: number }>();
  for (const recs of allPatternRecs) {
    for (const rec of recs) {
      const existing = patternCounts.get(rec.pattern);
      if (existing) {
        existing.count++;
        if (rec.priority === 'high') existing.rec.priority = 'high';
      } else {
        patternCounts.set(rec.pattern, { rec, count: 1 });
      }
    }
  }

  // Sort by count and priority
  const sortByCountAndPriority = <T extends { priority: 'high' | 'medium' | 'low' }>(
    items: Array<{ rec: T; count: number }>
  ): T[] => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return items
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return priorityOrder[a.rec.priority] - priorityOrder[b.rec.priority];
      })
      .map(i => i.rec);
  };

  return {
    priorityExercises: sortByCountAndPriority(Array.from(exerciseCounts.values())).slice(0, 6),
    musclesFocus: sortByCountAndPriority(Array.from(muscleCounts.values())).slice(0, 5),
    patternsFocus: sortByCountAndPriority(Array.from(patternCounts.values())).slice(0, 4),
  };
}

export default generateExerciseRecommendations;
