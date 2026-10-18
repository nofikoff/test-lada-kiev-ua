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
 * Строка frontmatter попадает в JSON-LD как есть; сырой `<` закрыл бы блок на `</script>`, а U+2028 и
 * U+2029 ломают его как скрипт. Проверяется вывод сборки, а не исходник `SeoHead.astro`: блок, выведенный
 * в обход `jsonLd()` из любого компонента, краснит проверку так же.
 */
const UNSAFE_IN_JSON_LD = ['<', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];

test.describe('машиночитаемое описание', () => {
  test(`в блоках ld+json нет сырых < и разделителей строк ${BUILD_TAG}`, () => {
    const found: { file: string; comment: string }[] = [];
    let blocks = 0;

    for (const page of filesOf(DIST, ['.html'])) {
      const html = readFileSync(page, 'utf8');
      for (const [, body] of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)) {
        blocks += 1;
        const unsafe = UNSAFE_IN_JSON_LD.filter((character) => body.includes(character));
        if (unsafe.length > 0) found.push({ file: relative(DIST, page), comment: unsafe.map((c) => `U+${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join(' ') });
      }
    }

    // Контроль: без него «ни в одном блоке» было бы верно и для сборки, в которой блоков нет.
    expect(blocks, 'блоков ld+json в dist/ нет — сначала нужна сборка').toBeGreaterThan(0);
    expect(found, `блоков с небезопасными символами: ${found.length}\n${report(found)}`).toEqual([]);
  });
});

/**
 * Каталог без `index.html` Apache отдаёт кодом 403, а не 404 (docs/specs/routes.md
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
