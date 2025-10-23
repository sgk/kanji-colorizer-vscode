import * as fs from 'fs';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';

export const baseGradeKeys = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'] as const;
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

export type GradeDefinitions = Partial<Record<GradeKey, GradeDefinition>>;

export function loadGradeDefinitions(context: ExtensionContext): GradeDefinitions {
  try {
    const p = path.join(context.extensionPath, 'data', 'kanji.json');
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw) as { grades?: unknown };
    if (!parsed || !Array.isArray(parsed.grades)) {
      throw new Error('grades 配列が見つかりません');
    }
    const definitions: GradeDefinitions = {};
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
      if (typeof record.label !== 'string' || typeof record.iconText !== 'string' || typeof record.color !== 'string') {
        continue;
      }
      definitions[key] = {
        key,
        label: record.label,
        iconText: record.iconText,
        color: record.color,
        characters: typeof record.characters === 'string' ? record.characters : undefined
      };
    }
    return definitions;
  } catch (error) {
    console.error('KanjiColorize: 学年データの読み込みに失敗しました', error);
    return {};
  }
}
