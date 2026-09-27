import { expect, test, type APIRequestContext } from '@playwright/test';
import { allPages, htmlToText, normalize, PHONE, SITE_ORIGIN } from './support/site';

/**
 * Файл описания для языковых моделей (docs/specs/routes.md §Согласованность контактов).
 * Проверяется ровно то, что расходится молча: перечень страниц и контактные данные. Файл лежит
 * в статике, никем не собирается из словаря, и после смены часов работы на страницах останется
 * единственным местом со старым значением.
 */

async function llms(request: APIRequestContext): Promise<string> {
  return normalize(await (await request.get('/llms.txt')).text());
}

test.describe('описание для языковых моделей', () => {
  test('перечисляет все пятнадцать адресов сайта', async ({ request }) => {
    const body = await llms(request);

    for (const page of allPages) {
      expect(body, `в llms.txt нет адреса ${page.path}`).toContain(`${SITE_ORIGIN}${page.path}`);
    }
  });

  test('контактные данные совпадают с разметкой страниц', async ({ request }) => {
    const body = await llms(request);
    const footer = normalize(
      htmlToText(/<footer[\s\S]*?<\/footer>/.exec(await (await request.get('/en/')).text())?.[0] ?? ''),
    );

    expect(footer.length, 'подвал английской версии не разобран').toBeGreaterThan(0);

    // Три источника одного факта: разметка страницы, машиночитаемое описание и этот файл.
    expect(body).toContain(PHONE);
    for (const fact of ['Kyiv, 10 Mala Zhytomyrska St.', 'Daily 10:00 AM - 9:00 PM']) {
      expect(footer, `подвал не содержит «${fact}»`).toContain(fact);
      expect(body, `llms.txt не содержит «${fact}»`).toContain(fact);
    }
  });
});
