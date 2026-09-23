import { mkdir, readFile, open, rename, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

export function validState(value) {
  if (!value || !Array.isArray(value.cards) || !Array.isArray(value.learned) || value.cards.length > 10000) return false;
  if (value.removedSubjects !== undefined && (!Array.isArray(value.removedSubjects) || !value.removedSubjects.every(name => typeof name === 'string' && name.length > 0 && name.length <= 200))) return false;
  if (value.subjects !== undefined && (!Array.isArray(value.subjects) || !value.subjects.every(name => typeof name === 'string' && name.trim().length > 0 && name.length <= 200) || new Set(value.subjects).size !== value.subjects.length)) return false;
  const ids = new Set();
  for (const card of value.cards) {
    if (!card || !['id', 'category', 'question', 'answer'].every(key => typeof card[key] === 'string' && card[key].trim().length > 0)) return false;
    if (card.id.length > 100 || card.category.length > 200 || card.question.length > 250 || card.answer.length > 1000 || ids.has(card.id)) return false;
    ids.add(card.id);
  }
  return value.learned.every(id => ids.has(id)) && new Set(value.learned).size === value.learned.length;
}

export function createStore(directory) {
  const file = join(directory, 'flashcards.json');
  let queue = Promise.resolve();
  async function read() {
    try {
      const value = JSON.parse(await readFile(file, 'utf8'));
      if (!validState(value) || !Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('Arquivo de dados inválido. Preserve o arquivo e restaure o backup.');
      return { ...value, initialized: true };
    } catch (error) {
      if (error.code === 'ENOENT') return { cards: [], learned: [], revision: 0, initialized: false };
      throw error;
    }
  }
  function save(value) {
    const operation = queue.then(async () => {
      if (!validState(value)) throw Object.assign(new Error('Cartões inválidos.'), { status: 400 });
      const current = await read();
      if (value.revision !== current.revision) throw Object.assign(new Error('Os dados foram alterados em outra janela. Reabra o aplicativo antes de continuar.'), { status: 409 });
      await mkdir(directory, { recursive: true });
      const next = { cards: value.cards, learned: value.learned, subjects: value.subjects ?? current.subjects ?? [], removedSubjects: value.removedSubjects ?? current.removedSubjects ?? [], revision: current.revision + 1, updatedAt: new Date().toISOString() };
      const temporary = file + '.tmp';
      const handle = await open(temporary, 'w');
      try { await handle.writeFile(JSON.stringify(next, null, 2), 'utf8'); await handle.sync(); }
      finally { await handle.close(); }
      if (current.initialized) await copyFile(file, file + '.bak');
      await rename(temporary, file);
      return { ...next, initialized: true };
    });
    queue = operation.catch(() => {});
    return operation;
  }
  return { read, save, file };
}
