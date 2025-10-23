import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { allGradeKeys, GradeDefinitions, GradeKey } from './gradeConfig';

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

function createEmptySvg(): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    '  <rect width="24" height="24" rx="4.8" fill="none"/>',
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
  const tasks = allGradeKeys.map(async (grade: GradeKey) => {
    const def = definitions[grade];
    let svg: string;
    if (!def) {
      svg = createEmptySvg();
    } else {
      const configuredColor = cfg.get(`colors.${grade}`, def.color);
      const fill = typeof configuredColor === 'string' && configuredColor.trim().length > 0
        ? configuredColor
        : def.color;
      svg = createSvg({ fill, textColor, text: def.iconText });
    }
    const target = path.join(context.extensionPath, 'media', `button_${grade}.svg`);
    await fs.writeFile(target, svg, 'utf8');
  });
  await Promise.all(tasks);
}
