import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi } from '../server/server.mjs';
import { createStore } from '../server/store.mjs';

const card={id:'one',category:'Topografia',question:'Qual é a função?',answer:'Medição e representação do terreno.'};
test('mantém matérias iniciais removidas após reabrir o arquivo',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));await createStore(directory).save({cards:[],learned:[],subjects:[],removedSubjects:['Topografia'],revision:0});
 assert.deepEqual((await createStore(directory).read()).removedSubjects,['Topografia']);
});
test('persiste matérias sem cartões e mantém compatibilidade com versões anteriores',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));const store=createStore(directory);
 await store.save({cards:[],learned:[],subjects:['Estruturas'],revision:0});
 assert.deepEqual((await createStore(directory).read()).subjects,['Estruturas']);
 await store.save({cards:[],learned:[],revision:1});assert.deepEqual((await store.read()).subjects,['Estruturas']);
});
async function listen(directory){const {server}=createApi(directory);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,url:`http://127.0.0.1:${server.address().port}/api/study`};}
const close=server=>new Promise(resolve=>server.close(resolve));
test('API grava arquivo e recupera cartões após reiniciar o serviço',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));let api=await listen(directory);
 try {
  const response=await fetch(api.url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({cards:[card],learned:['one'],revision:0})});assert.equal(response.status,200);
  assert.deepEqual(JSON.parse(await readFile(join(directory,'flashcards.json'),'utf8')).cards,[card]);
  await close(api.server);api=await listen(directory);
  const saved=await (await fetch(api.url)).json();assert.deepEqual(saved.learned,['one']);assert.equal(saved.cards[0].answer,card.answer);
 } finally {await close(api.server);}
});
test('mantém backup e rejeita gravação concorrente desatualizada',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));const store=createStore(directory);
 await store.save({cards:[card],learned:[],revision:0});await store.save({cards:[card],learned:['one'],revision:1});
 assert.deepEqual(JSON.parse(await readFile(join(directory,'flashcards.json.bak'),'utf8')).learned,[]);
 await assert.rejects(store.save({cards:[],learned:[],revision:1}),error=>error.status===409);
 assert.equal((await store.read()).cards.length,1);
});
test('arquivo danificado não é substituído por acervo vazio',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));await writeFile(join(directory,'flashcards.json'),'broken');
 await assert.rejects(createStore(directory).save({cards:[],learned:[],revision:0}));
 assert.equal(await readFile(join(directory,'flashcards.json'),'utf8'),'broken');
});
test('API rejeita origem externa e conteúdo inválido',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'memora-test-'));const api=await listen(directory);
 try {
  assert.equal((await fetch(api.url,{headers:{Origin:'https://example.com'}})).status,403);
  assert.equal((await fetch(api.url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({cards:[{}],learned:[],revision:0})})).status,400);
 } finally {await close(api.server);}
});
