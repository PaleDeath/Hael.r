import { Question } from './types';

const createScaleOptions = () => [
  { text: "Not at all", value: 0 },
  { text: "Several days", value: 1 },
  { text: "More than half the days", value: 2 },
  { text: "Nearly every day", value: 3 }
];

const createFrequencyOptions = () => [
  { text: "Never", value: 0 },
  { text: "Rarely", value: 1 },
  { text: "Sometimes", value: 2 },
  { text: "Often", value: 3 },
  { text: "Very often", value: 4 }
];

const createIntensityOptions = () => [
  { text: "Not at all", value: 0 },
  { text: "Slightly", value: 1 },
  { text: "Moderately", value: 2 },
  { text: "Severely", value: 3 },
  { text: "Extremely", value: 4 }
];

export const anxietyQuestions: Question[] = [
  // Anxiety Questions (based on GAD-7)
  {
    id: 'anx-1',
    text: "How often have you been feeling nervous, anxious, or on edge?",
    category: 'anxiety',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'GAD-7'
  },
  {
    id: 'anx-2',
    text: "How often have you found yourself worrying too much about different things?",
    category: 'anxiety',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'GAD-7'
  },
  {
    id: 'anx-3',
    text: "How often have you had trouble relaxing?",
    category: 'anxiety',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'GAD-7'
  },
  {
    id: 'anx-4',
    text: "How often have you been so restless that it's hard to sit still?",
    category: 'anxiety',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'GAD-7'
  },
  {
    id: 'anx-5',
    text: "How often have you felt afraid, as if something awful might happen?",
    category: 'anxiety',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1.5,
    source: 'GAD-7'
  },
  
  // Depression Questions (based on PHQ-9)
  {
    id: 'dep-1',
    text: "How often have you had little interest or pleasure in doing things you usually enjoy?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'PHQ-9'
  },
  {
    id: 'dep-2',
    text: "How often have you been feeling down, depressed, or hopeless?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1.5,
    source: 'PHQ-9'
  },
  {
    id: 'dep-3',
    text: "How often have you been having trouble falling or staying asleep, or sleeping too much?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'PHQ-9'
  },
  {
    id: 'dep-4',
    text: "How often have you been feeling tired or having little energy?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1,
    source: 'PHQ-9'
  },
  {
    id: 'dep-5',
    text: "How often have you been having negative thoughts about yourself, or that you are a failure, or have let yourself or your family down?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 1.5,
    source: 'PHQ-9'
  },
  {
    id: 'dep-6',
    text: "How often have you had thoughts that you would be better off dead, or of hurting yourself in some way?",
    category: 'depression',
    type: 'scale',
    options: createScaleOptions(),
    weight: 2,
    source: 'PHQ-9',
    followUp: true
  },

  // Stress Questions (based on Perceived Stress Scale)
  {
    id: 'str-1',
    text: "In the last month, how often have you felt that you were unable to control the important things in your life?",
    category: 'stress',
    type: 'scale',
    options: createFrequencyOptions(),
    weight: 1,
    source: 'PSS'
  },
  {
    id: 'str-2',
    text: "In the last month, how often have you felt confident about your ability to handle your personal problems?",
    category: 'stress',
    type: 'scale',
    options: createFrequencyOptions().map(option => ({ ...option, value: 4 - option.value })), // Reverse scored
    weight: 1,
    source: 'PSS'
  },
  {
    id: 'str-3',
    text: "In the last month, how often have you felt that things were going your way?",
    category: 'stress',
    type: 'scale',
    options: createFrequencyOptions().map(option => ({ ...option, value: 4 - option.value })), // Reverse scored
    weight: 1,
    source: 'PSS'
  },
  {
    id: 'str-4',
    text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",
    category: 'stress',
    type: 'scale',
    options: createFrequencyOptions(),
    weight: 1.5,
    source: 'PSS'
  },

  // Sleep Questions (based on Insomnia Severity Index)
  {
    id: 'slp-1',
    text: "How would you rate your current sleep problem: difficulty falling asleep?",
    category: 'sleep',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1,
    source: 'ISI'
  },
  {
    id: 'slp-2',
    text: "How would you rate your current sleep problem: difficulty staying asleep?",
    category: 'sleep',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1,
    source: 'ISI'
  },
  {
    id: 'slp-3',
    text: "How satisfied/dissatisfied are you with your current sleep pattern?",
    category: 'sleep',
    type: 'scale',
    options: [
      { text: "Very satisfied", value: 0 },
      { text: "Satisfied", value: 1 },
      { text: "Neutral", value: 2 },
      { text: "Dissatisfied", value: 3 },
      { text: "Very dissatisfied", value: 4 }
    ],
    weight: 1,
    source: 'ISI'
  },
  {
    id: 'slp-4',
    text: "How NOTICEABLE to others do you think your sleep problem is in terms of impairing the quality of your life?",
    category: 'sleep',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1,
    source: 'ISI'
  },
  {
    id: 'slp-5',
    text: "How WORRIED/distressed are you about your current sleep problem?",
    category: 'sleep',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1.5,
    source: 'ISI'
  },

  // Social Questions (based on LSAS - Liebowitz Social Anxiety Scale)
  {
    id: 'soc-1',
    text: "How anxious or fearful do you feel when meeting strangers?",
    category: 'social',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1,
    source: 'LSAS'
  },
  {
    id: 'soc-2',
    text: "How likely are you to avoid situations where you have to meet strangers?",
    category: 'social',
    type: 'scale',
    options: [
      { text: "Never avoid", value: 0 },
      { text: "Sometimes avoid", value: 1 },
      { text: "Often avoid", value: 2 },
      { text: "Usually avoid", value: 3 },
      { text: "Always avoid", value: 4 }
    ],
    weight: 1,
    source: 'LSAS'
  },
  {
    id: 'soc-3',
    text: "How anxious or fearful do you feel when speaking up at a meeting or in a group?",
    category: 'social',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1,
    source: 'LSAS'
  },
  {
    id: 'soc-4',
    text: "How anxious or fearful do you feel when you are criticized or rejected?",
    category: 'social',
    type: 'scale',
    options: createIntensityOptions(),
    weight: 1.5,
    source: 'LSAS'
  },
];

// Add other specific question arrays here if they exist, e.g.:
// export const depressionQuestions: Question[] = [...];
// export const stressQuestions: Question[] = [...];

// Combine all question arrays into one
export const allQuestions: Question[] = [
  ...anxietyQuestions,
  // ...depressionQuestions, // Uncomment if depressionQuestions exists
  // ...stressQuestions,   // Uncomment if stressQuestions exists
]; 