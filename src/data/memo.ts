/**
 * Результат `build`, один на значение `stamp()`: пока метка та же, вызовы делят один промис.
 * Отклонённый промис в кэше не остаётся — после правки причины следующий вызов строит заново,
 * а не повторяет прежнюю ошибку. Из `src/` импортов нет: модуль загружает и
 * `node --experimental-strip-types` (scripts/memo.test.mjs).
 */
export function memoizeByStamp<T>(build: () => Promise<T>, stamp: () => Promise<unknown>): () => Promise<T> {
  let cached: { readonly stamp: unknown; readonly value: Promise<T> } | undefined;

  return async () => {
    const current = await stamp();
    if (cached && cached.stamp === current) return cached.value;

    const entry = { stamp: current, value: build() };
    cached = entry;
    // Выбывает только своя запись: новая, успевшая её заменить, остаётся.
    entry.value.catch(() => {
      if (cached === entry) cached = undefined;
    });
    return entry.value;
  };
}
