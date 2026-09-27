import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * FR-027 пакета 003: в выдачу на прод не попадает ни одного комментария кода. Проверяется
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
