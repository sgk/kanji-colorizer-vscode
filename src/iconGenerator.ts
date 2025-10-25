import * as fs from 'fs/promises';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';

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
  context: ExtensionContext,
  definitions: GradeDefinitions
): Promise<void> {
  // vscode モジュールは実行環境（拡張ホスト）でのみ存在するため
  // CLI 用ビルド時に top-level で require されないよう動的 import にする
  const vscode = await import('vscode');
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const textColor = resolveTextColor(cfg.get('textColor'));
  const outDir = path.join(context.extensionPath, 'media', 'generated');
  await fs.mkdir(outDir, { recursive: true });
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
    const target = path.join(outDir, `button_${grade}.svg`);
    await fs.writeFile(target, svg, 'utf8');
  });
  await Promise.all(tasks);
}

// CLI用：ビルド時にアイコンを生成
export async function generateGradeIconsCLI(): Promise<void> {
  const { loadGradeDefinitions } = await import('./gradeConfig');
  const extensionPath = path.resolve(__dirname, '..');
  const mockContext = { extensionPath } as ExtensionContext;

  // デフォルト設定で生成
  const definitions = loadGradeDefinitions(mockContext);
  const textColor = '#000000';
  const outDir = path.join(extensionPath, 'media', 'generated');
  await fs.mkdir(outDir, { recursive: true });

  const tasks = allGradeKeys.map(async (grade: GradeKey) => {
    const def = definitions[grade];
    let svg: string;
    if (!def) {
      svg = createEmptySvg();
    } else {
      svg = createSvg({ fill: def.color, textColor, text: def.iconText });
    }
    const target = path.join(outDir, `button_${grade}.svg`);
    await fs.writeFile(target, svg, 'utf8');
  });
  await Promise.all(tasks);
  console.log('Generated grade icons successfully.');
}
