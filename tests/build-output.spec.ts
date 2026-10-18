import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Quality Gates конституции: в выдачу на прод не попадает ни одного комментария кода. Проверяется
 * собранный `dist/`, а не исходники: комментарий в шаблоне законен, пока сборка его не выводит,
 * а Astro выводит `<!-- -->` из разметки как есть — поэтому в `.astro` комментарий пишется
 * выражением в фигурных скобках, которое сборка отбрасывает.
 */
const BUILD_TAG = '@build';
const DIST = 'dist';

function filesOf(directory: string, extensions: readonly string[]): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesOf(path, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
  });
}

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
/** Строчный комментарий; `://` адреса им не считается. */
const LINE_COMMENT = /(?:^|[^:\\'"`\w])\/\/[^\n]*/gm;

function report(found: { file: string; comment: string }[]): string {
  return found.map(({ file, comment }) => `${file}: ${comment.trim().slice(0, 70)}`).join('\n');
}

test.describe('выдача без комментариев кода', () => {
  test(`в HTML нет HTML-комментариев ${BUILD_TAG}`, () => {
    const pages = filesOf(DIST, ['.html']);
    expect(pages.length, 'в dist/ нет страниц — сначала нужна сборка').toBeGreaterThan(0);

    const found = pages.flatMap((page) =>
      [...readFileSync(page, 'utf8').matchAll(/<!--([\s\S]*?)-->/g)].map((match) => ({
        file: relative(DIST, page),
        comment: match[1],
      })),
    );
    expect(found, `HTML-комментариев: ${found.length}\n${report(found)}`).toEqual([]);
  });

  test(`во встроенных и внешних скриптах и стилях нет комментариев ${BUILD_TAG}`, () => {
    const found: { file: string; comment: string }[] = [];

    for (const page of filesOf(DIST, ['.html'])) {
      const html = readFileSync(page, 'utf8');
      const file = relative(DIST, page);
      for (const [, attributes, body] of html.matchAll(/<(?:script|style)\b([^>]*)>([\s\S]*?)<\/(?:script|style)>/g)) {
        // Машиночитаемое описание — данные JSON, комментариев в нём не бывает по формату.
        if (/type=["']application\/ld\+json["']/.test(attributes)) continue;
        for (const match of body.matchAll(BLOCK_COMMENT)) found.push({ file, comment: match[0] });
        for (const match of body.matchAll(LINE_COMMENT)) found.push({ file, comment: match[0] });
      }
    }

    for (const asset of filesOf(DIST, ['.css', '.js'])) {
      const file = relative(DIST, asset);
      for (const match of readFileSync(asset, 'utf8').matchAll(BLOCK_COMMENT)) {
        found.push({ file, comment: match[0] });
      }
    }

    expect(found, `комментариев в коде выдачи: ${found.length}\n${report(found)}`).toEqual([]);
  });
});

/**
 * Каталог без `index.html` Apache отдаёт кодом 403, а не 404 (specs/007-knowledge-base-pilot/contracts/routes.md
 * §Directories without index). Таких каталогов в выдаче ровно три, и у корня раздела базы знаний есть
 * правило 404 в `.htaccess` своего языка. Новый каталог без индекса — например, маршрут `x/y.astro`
 * без `x/` — краснит проверку раньше, чем прод ответит на него 403.
 */
const WITHOUT_INDEX: Record<string, string | null> = {
  // Файлы сборки: адрес не публичный, 403 допустим.
  _astro: null,
  guide: '.htaccess',
  'ru/guide': 'ru/.htaccess',
};

function directoriesOf(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return [path, ...directoriesOf(path)];
    });
}

test.describe('каталоги выдачи без index.html', () => {
  test(`только _astro/ и корни раздела базы знаний ${BUILD_TAG}`, () => {
    const bare = directoriesOf(DIST)
      .filter((directory) => !existsSync(join(directory, 'index.html')))
      .map((directory) => relative(DIST, directory).split(sep).join('/'))
      // Подкаталоги сборки — часть `_astro/`.
      .filter((directory) => !directory.startsWith('_astro/'));
    expect(bare.sort()).toEqual(Object.keys(WITHOUT_INDEX).sort());
  });

  for (const [directory, config] of Object.entries(WITHOUT_INDEX)) {
    if (!config) continue;
    test(`/${directory}/ закрыт правилом 404 в ${config} ${BUILD_TAG}`, () => {
      const rules = readFileSync(join(DIST, config), 'utf8');
      const escaped = directory.replace(/\//g, '\\/');
      expect(rules).toMatch(new RegExp(`^\\s*RedirectMatch\\s+404\\s+\\^\\/${escaped}\\/\\?\\$\\s*$`, 'm'));
    });
  }
});
