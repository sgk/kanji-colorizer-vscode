import * as fs from 'fs';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';

export const baseGradeKeys = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'] as const;
export type BaseGradeKey = typeof baseGradeKeys[number];

export type GradeKey = BaseGradeKey | 'other';

export const allGradeKeys = [...baseGradeKeys, 'other'] as const;

export interface GradeDefinition {
  key: GradeKey;
  label: string;
  iconText: string;
  color: string;
  characters?: string;
}

export type GradeDefinitions = Record<GradeKey, GradeDefinition>;

const fallbackDefinitions: GradeDefinitions = {
  g1: { key: 'g1', label: '1年生の漢字', iconText: '1', color: '#fffa99', characters: '' },
  g2: { key: 'g2', label: '2年生の漢字', iconText: '2', color: '#ffd199', characters: '' },
  g3: { key: 'g3', label: '3年生の漢字', iconText: '3', color: '#ff9999', characters: '' },
  g4: { key: 'g4', label: '4年生の漢字', iconText: '4', color: '#99ffce', characters: '' },
  g5: { key: 'g5', label: '5年生の漢字', iconText: '5', color: '#a399ff', characters: '' },
  g6: { key: 'g6', label: '6年生の漢字', iconText: '6', color: '#d699ff', characters: '' },
  g7: { key: 'g7', label: '中学生の漢字', iconText: '中', color: '#ff66ff', characters: '' },
  other: { key: 'other', label: '常用漢字外の漢字', iconText: '外', color: '#ef4444', characters: '' }
};

function cloneFallback(): GradeDefinitions {
  return JSON.parse(JSON.stringify(fallbackDefinitions)) as GradeDefinitions;
}

export function loadGradeDefinitions(context: ExtensionContext): GradeDefinitions {
  try {
    const p = path.join(context.extensionPath, 'data', 'kanji.json');
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw) as { grades?: unknown };
    if (!parsed || !Array.isArray(parsed.grades)) {
      throw new Error('grades 配列が見つかりません');
    }
    const definitions = cloneFallback();
    for (const entry of parsed.grades) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const record = entry as Partial<GradeDefinition> & { key?: string };
      if (!record.key) {
        continue;
      }
      if (!allGradeKeys.includes(record.key as GradeKey)) {
        continue;
      }
      const key = record.key as GradeKey;
      definitions[key] = {
        key,
        label: typeof record.label === 'string' ? record.label : definitions[key].label,
        iconText: typeof record.iconText === 'string' ? record.iconText : definitions[key].iconText,
        color: typeof record.color === 'string' ? record.color : definitions[key].color,
        characters: typeof record.characters === 'string' ? record.characters : definitions[key].characters
      };
    }
    return definitions;
  } catch (error) {
    console.error('KanjiColorize: 学年データの読み込みに失敗しました', error);
    return cloneFallback();
  }
}

export function getFallbackGradeDefinitions(): GradeDefinitions {
  return cloneFallback();
}
