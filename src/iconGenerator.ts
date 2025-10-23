import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { allGradeKeys, GradeDefinitions } from './gradeConfig';

function resolveTextColor(textColorSetting: unknown): string {
  if (typeof textColorSetting !== 'string') {
    return '#000000';
  }
  const trimmed = textColorSetting.trim();
  return trimmed.length > 0 ? trimmed : '#000000';
}

function createSvg({ fill, textColor, text }: { fill: string; textColor: string; text: string; }): string {
  const isWide = text.length !== 1 || !/^[0-9]$/.test(text);
  const fontSize = isWide ? 24 : 26.6667;
  const y = isWide ? 20.625 : 21.7;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    `  <rect width="24" height="24" rx="4.8" fill="${fill}"/>`,
    `  <text x="12" y="${y}" font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="${textColor}" text-anchor="middle">${text}</text>`,
    '</svg>',
    ''
  ].join('\n');
}

export async function generateGradeIcons(
  context: vscode.ExtensionContext,
  definitions: GradeDefinitions
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const textColor = resolveTextColor(cfg.get('textColor'));
  const tasks = allGradeKeys.map(async (grade) => {
    const def = definitions[grade];
    const fill = typeof def?.color === 'string' ? def.color : '#cccccc';
    const text = typeof def?.iconText === 'string' ? def.iconText : grade;
    const svg = createSvg({ fill, textColor, text });
    const target = path.join(context.extensionPath, 'media', `button_${grade}.svg`);
    await fs.writeFile(target, svg, 'utf8');
  });
  await Promise.all(tasks);
}
