import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createStore } from './store.mjs';

export function createApi(directory) {
  const store = createStore(directory);
  const server = createServer(async (request, response) => {
    const send = (status, value) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(JSON.stringify(value));
    };
    try {
      const hostname = (request.headers.host || '').split(':')[0];
      if (!['localhost', '127.0.0.1'].includes(hostname)) return send(403, { error: 'Acesso apenas local.' });
      if (request.headers.origin && !['http://localhost:4200', 'http://127.0.0.1:4200'].includes(request.headers.origin)) return send(403, { error: 'Origem não permitida.' });
      if (request.url !== '/api/study') return send(404, { error: 'Endereço não encontrado.' });
      if (request.method === 'GET') return send(200, await store.read());
      if (request.method !== 'PUT') return send(405, { error: 'Método não permitido.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Envie JSON.' });
      const chunks = []; let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 20 * 1024 * 1024) return send(413, { error: 'Acervo muito grande.' });
        chunks.push(chunk);
      }
      let value;
      try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'JSON inválido.' }); }
      return send(200, await store.save(value));
    } catch (error) {
      console.error('Falha no salvamento local:', error.message);
      send(error.status || 500, { error: error.status ? error.message : 'Não foi possível ler ou gravar o arquivo. Verifique o terminal e as permissões da pasta data.' });
    }
  });
  return { server, store };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../data/', import.meta.url));
  const { server } = createApi(directory);
  server.on('error', error => { console.error('Não foi possível iniciar o salvamento local:', error.message); process.exitCode = 1; });
  server.listen(3001, '127.0.0.1', () => console.log(`Salvamento automático ativo. Arquivo: ${resolve(directory, 'flashcards.json')}`));
}
