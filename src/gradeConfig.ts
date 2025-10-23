export const baseGradeKeys = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'] as const;
export type BaseGradeKey = typeof baseGradeKeys[number];

export type GradeKey = BaseGradeKey | 'other';

export const allGradeKeys = [...baseGradeKeys, 'other'] as const;

export const defaultGradeColors: Record<GradeKey, string> = {
  g1: '#fffa99',
  g2: '#ffd199',
  g3: '#ff9999',
  g4: '#99ffce',
  g5: '#a399ff',
  g6: '#d699ff',
  g7: '#ff66ff',
  other: '#ef4444'
};

export const gradeLabels: Record<GradeKey, string> = {
  g1: '1年生の漢字',
  g2: '2年生の漢字',
  g3: '3年生の漢字',
  g4: '4年生の漢字',
  g5: '5年生の漢字',
  g6: '6年生の漢字',
  g7: '中学生の漢字',
  other: '常用漢字外の漢字'
};

export const gradeIconTexts: Record<GradeKey, string> = {
  g1: '1',
  g2: '2',
  g3: '3',
  g4: '4',
  g5: '5',
  g6: '6',
  g7: '中',
  other: '外'
};
