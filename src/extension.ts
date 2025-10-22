import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type GradeKey = 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'other';

let decorations: Record<GradeKey, vscode.TextEditorDecorationType> | null = null;
let gradeRegex: Partial<Record<GradeKey, RegExp>> = {};
let knownKanjiSet: Set<string> = new Set();
let debounceTimer: NodeJS.Timeout | null = null;

// デフォルト OFF。オンにしたファイル URI を保持。
const enabledFiles = new Set<string>();

function loadKanjiSets(context: vscode.ExtensionContext): Record<Exclude<GradeKey, 'other'>, string> {
  const p = path.join(context.extensionPath, 'data', 'kyouiku_kanji.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function makeDecorations() {
  const cfg = vscode.workspace.getConfiguration('kanjiColorize');
  const opacity = Math.min(Math.max(Number(cfg.get('opacity', 0.25)), 0), 1);
  const make = (colorSettingKey: string, fallback: string) => {
    const color = String(cfg.get(colorSettingKey) ?? fallback);
    return vscode.window.createTextEditorDecorationType({
      backgroundColor: hexToRgba(color, opacity),
      borderRadius: '3px'
    });
  };
  decorations = {
    g1: make('colors.g1', '#3b82f6'),
    g2: make('colors.g2', '#10b981'),
    g3: make('colors.g3', '#f59e0b'),
    g4: make('colors.g4', '#8b5cf6'),
    g5: make('colors.g5', '#14b8a6'),
    g6: make('colors.g6', '#22c55e'),
    other: make('colors.other', '#ef4444') // 範囲外：赤
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) { return hex; }
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildRegexFromSet(chars: string): RegExp {
  const cls = [...new Set([...chars])].join('');
  return new RegExp(`[${cls}]`, 'g');
}

function rebuildRegex(context: vscode.ExtensionContext) {
  const sets = loadKanjiSets(context);
  const rx: Partial<Record<GradeKey, RegExp>> = {};
  knownKanjiSet = new Set<string>();
  (['g1','g2','g3','g4','g5','g6'] as GradeKey[]).forEach(k => {
    const s = (sets as any)[k];
    if (typeof s === 'string' && s.length) {
      rx[k] = buildRegexFromSet(s);
      for (const ch of s) knownKanjiSet.add(ch);
    }
  });
  gradeRegex = rx;
}

function isFileOn(editor = vscode.window.activeTextEditor): boolean {
  if (!editor) return false;
  const key = editor.document.uri.toString();
  return enabledFiles.has(key);
}

function clearAllDecorations(editor?: vscode.TextEditor) {
  if (!decorations || !editor) return;
  Object.values(decorations).forEach(d => editor.setDecorations(d, []));
}

function isHan(ch: string): boolean {
  // CJK統合漢字
  return /\p{Script=Han}/u.test(ch);
}

function updateActiveEditor(editor: vscode.TextEditor | undefined) {
  if (!editor || !decorations) return;
  if (!isFileOn(editor)) {
    clearAllDecorations(editor);
    return;
  }

  const perGradeRanges: Record<GradeKey, vscode.Range[]> = {
    g1: [], g2: [], g3: [], g4: [], g5: [], g6: [], other: []
  };

  for (let i = 0; i < editor.document.lineCount; i++) {
    const line = editor.document.lineAt(i).text;

    // まず各学年を正規表現で拾う
    (Object.keys(gradeRegex) as GradeKey[]).forEach((k) => {
      const rx = gradeRegex[k];
      if (!rx) return;
      rx.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(line))) {
        const col = m.index;
        perGradeRanges[k].push(new vscode.Range(
          new vscode.Position(i, col),
          new vscode.Position(i, col + 1)
        ));
      }
    });

    // 範囲外（教育漢字以外）= CJK漢字で、knownKanjiSet に含まれないもの
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (isHan(ch) && !knownKanjiSet.has(ch)) {
        perGradeRanges.other.push(new vscode.Range(
          new vscode.Position(i, col),
          new vscode.Position(i, col + 1)
        ));
      }
    }
  }

  (Object.keys(perGradeRanges) as GradeKey[]).forEach((k) => {
    const deco = decorations![k];
    if (deco) editor.setDecorations(deco, perGradeRanges[k]);
  });
}

function scheduleUpdate(editor = vscode.window.activeTextEditor) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => updateActiveEditor(editor), 80);
}

export function activate(context: vscode.ExtensionContext) {
  makeDecorations();
  rebuildRegex(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('kanjiColorize.toggleFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const key = editor.document.uri.toString();
      if (enabledFiles.has(key)) {
        enabledFiles.delete(key);
        clearAllDecorations(editor);
        vscode.window.setStatusBarMessage('Kanji Colorize: OFF (this file)', 1200);
      } else {
        enabledFiles.add(key);
        scheduleUpdate(editor);
        vscode.window.setStatusBarMessage('Kanji Colorize: ON (this file)', 1200);
      }
    }),

    vscode.window.onDidChangeActiveTextEditor(() => scheduleUpdate()),
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      if (e.document.uri.toString() !== editor.document.uri.toString()) return;
      if (!isFileOn(editor)) return;
      scheduleUpdate(editor);
    }),
    vscode.workspace.onDidCloseTextDocument(doc => {
      enabledFiles.delete(doc.uri.toString());
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('kanjiColorize')) {
        if (decorations) Object.values(decorations).forEach(d => d.dispose());
        makeDecorations();
        scheduleUpdate();
      }
    })
  );
}

export function deactivate() {
  if (decorations) Object.values(decorations).forEach(d => d.dispose());
  enabledFiles.clear();
}
