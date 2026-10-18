import { test } from 'node:test';
import assert from 'node:assert/strict';
// С расширением: Node в ESM его не достраивает.
import { memoizeByStamp } from '../src/data/memo.ts';

/** Сборщик, который отвечает по очереди заготовленными исходами и считает свои вызовы. */
function scripted(outcomes) {
  const calls = { count: 0 };
  const build = () => {
    const outcome = outcomes[calls.count++];
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
  };
  return { build, calls };
}

test('отклонённый промис не остаётся в кэше: следующий вызов строит заново', async () => {
  const { build, calls } = scripted([new Error('карта сломана'), 'индекс']);
  const get = memoizeByStamp(build, async () => 1);

  await assert.rejects(get(), /карта сломана/);
  assert.equal(await get(), 'индекс');
  assert.equal(calls.count, 2);
});

test('успешный результат живёт, пока метка та же', async () => {
  const { build, calls } = scripted(['первый', 'второй']);
  const get = memoizeByStamp(build, async () => 1);

  assert.equal(await get(), 'первый');
  assert.equal(await get(), 'первый');
  assert.equal(calls.count, 1);
});

test('метка сменилась — результат строится заново', async () => {
  const { build, calls } = scripted(['прежняя карта', 'новая карта']);
  let mtime = 1;
  const get = memoizeByStamp(build, async () => mtime);

  assert.equal(await get(), 'прежняя карта');
  mtime = 2;
  assert.equal(await get(), 'новая карта');
  assert.equal(await get(), 'новая карта');
  assert.equal(calls.count, 2);
});

test('метка undefined — одна и та же метка: сборка не пересобирает результат', async () => {
  const { build, calls } = scripted(['первый', 'второй']);
  const get = memoizeByStamp(build, async () => undefined);

  assert.equal(await get(), 'первый');
  assert.equal(await get(), 'первый');
  assert.equal(calls.count, 1);
});

test('вызовы вперемешку делят один промис', async () => {
  const { build, calls } = scripted(['индекс']);
  const get = memoizeByStamp(build, async () => 1);

  assert.deepEqual(await Promise.all([get(), get(), get()]), ['индекс', 'индекс', 'индекс']);
  assert.equal(calls.count, 1);
});

test('запоздалый отказ прежней записи не выбрасывает новую', async () => {
  let rejectFirst;
  const first = new Promise((_, reject) => {
    rejectFirst = reject;
  });
  const builds = [first, Promise.resolve('новая карта')];
  let count = 0;
  let mtime = 1;
  const get = memoizeByStamp(
    () => builds[count++],
    async () => mtime,
  );

  const stale = get();
  mtime = 2;
  assert.equal(await get(), 'новая карта');

  rejectFirst(new Error('прежняя карта сломана'));
  await assert.rejects(stale, /прежняя карта сломана/);

  assert.equal(await get(), 'новая карта');
  assert.equal(count, 2);
});
