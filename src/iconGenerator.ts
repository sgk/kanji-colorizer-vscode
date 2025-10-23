import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { allGradeKeys, defaultGradeColors, gradeIconTexts } from './gradeConfig';

function resolveTextColor(textColorSetting: unknown): string {
  if (typeof textColorSetting !== 'string') {
    return '#000000';
  }
  const trimmed = textColorSetting.trim();
  return trimmed.length > 0 ? trimmed : '#000000';
}

function createSvg({ fill, textColor, text }: { fill: string; textColor: string; text: string; }): string {
  const fontSize = text === '中' || text === '外' ? 24 : 26.6667;
  const y = text === '中' || text === '外' ? 20.625 : 21.7;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    `  <rect width="24" height="24" rx="4.8" fill="${fill}"/>`,
    `  <text x="12" y="${y}" font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="${textColor}" text-anchor="middle">${text}</text>`,
    '</svg>',
    ''
  ].join('\n');
}

export async function generateGradeIcons(context: vscode.ExtensionContext): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const textColor = resolveTextColor(cfg.get('textColor'));
  const tasks = allGradeKeys.map(async (grade) => {
    const fill = String(cfg.get(`colors.${grade}`, defaultGradeColors[grade]));
    const svg = createSvg({ fill, textColor, text: gradeIconTexts[grade] });
    const target = path.join(context.extensionPath, 'media', `button_${grade}.svg`);
    await fs.writeFile(target, svg, 'utf8');
  });
  await Promise.all(tasks);
}
