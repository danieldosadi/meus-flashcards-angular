import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import '@angular/compiler';

// Use the actual Angular signals and application class without starting a browser.
const build = new URL('../.test-build/', import.meta.url);
await mkdir(build, { recursive: true });
const source = await readFile(new URL('../src/app.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
  experimentalDecorators: true,
}});
await writeFile(new URL('app.mjs', build), compiled.outputText);
const { App } = await import(new URL('app.mjs', build));
let stored, disk, offline;
beforeEach(() => {
 stored = new Map(); disk = {cards:[],learned:[],revision:0,initialized:false}; offline=false;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)}});
 globalThis.document={getElementById:()=>null};
 globalThis.fetch=async (_url, options={})=>{
  if(offline) throw new Error('Serviço desconectado');
  if(options.method==='PUT') {
   const value=JSON.parse(options.body);
   if(value.revision!==disk.revision)return {ok:false,status:409,json:async()=>({error:'Outra janela alterou os dados'})};
   disk={...value,revision:disk.revision+1,initialized:true};
  }
  return {ok:true,json:async()=>structuredClone(disk)};
 };
});
async function openApp(){const app=new App();await app.ngOnInit();return app;}
async function add(app,question='Pergunta'){app.question=question;app.answer='Resposta';app.add();await app.save();}
test('salva e recupera do computador sem depender do navegador',async()=>{
 const app=await openApp();await add(app);app.mark();await app.save();
 stored.clear();const restored=await openApp();assert.equal(restored.cards().length,1);assert.equal(restored.progress(),100);
});
test('migra cartões existentes do navegador para arquivo novo',async()=>{
 stored.set('memora-arquitetura-v2',JSON.stringify({cards:[{id:'old',category:'Topografia',question:'Pergunta',answer:'Resposta'}],learned:['old']}));
 await openApp();assert.equal(disk.cards[0].id,'old');assert.deepEqual(disk.learned,['old']);
});
test('falha de gravação não exibe sucesso e permite tentar novamente',async()=>{
 const app=await openApp();offline=true;await add(app);
 assert.equal(app.storageFailed(),true);assert.equal(disk.cards.length,0);
 assert.match(app.notice(),/não foi concluído/);
 offline=false;await app.retrySave();assert.equal(disk.cards.length,1);assert.equal(app.storageFailed(),false);
});
test('recupera alterações pendentes depois de reabrir',async()=>{
 const app=await openApp();offline=true;await add(app);offline=false;
 const restored=await openApp();assert.equal(restored.cards().length,1);assert.equal(disk.cards.length,1);
});
test('não sobrescreve outra janela com uma revisão antiga',async()=>{
 const first=await openApp(),second=await openApp();await add(first,'Primeira');await add(second,'Segunda');
 assert.equal(second.storageFailed(),true);assert.equal(disk.cards[0].question,'Primeira');
 await second.retrySave();assert.equal(disk.cards[0].question,'Primeira');assert.equal(second.cards()[0].question,'Segunda');
});
test('revisão mantém índice válido até finalizar',async()=>{
 const app=await openApp();await add(app,'Primeira');await add(app,'Segunda');app.review();app.move(1);app.mark();await app.save();
 assert.equal(app.current().question,'Primeira');app.mark();await app.save();assert.equal(app.current(),undefined);app.review();assert.equal(app.filtered().length,2);
});
test('salva no arquivo mesmo com localStorage bloqueado',async()=>{
 localStorage.setItem=()=>{throw new Error('Quota');};const app=await openApp();await add(app);assert.equal(disk.cards.length,1);assert.equal(app.storageFailed(),false);
});
test('Tab usa apenas controles habilitados',async()=>{
 const app=await openApp();app.modal.set(true);let focused='';
 const first={focus:()=>focused='first'},last={focus:()=>focused='last'},disabled={focus:()=>assert.fail('Disabled')};
 document.querySelectorAll=selector=>selector.includes(':not(:disabled)')?[first,last]:[first,last,disabled];
 document.activeElement=last;app.keyboard({key:'Tab',preventDefault(){}});assert.equal(focused,'first');
 document.activeElement=first;app.keyboard({key:'Tab',shiftKey:true,preventDefault(){}});assert.equal(focused,'last');
});
test('edita sem duplicar e retorna conteúdo alterado à revisão',async()=>{
 const app=await openApp();await add(app);const id=app.current().id;app.mark();await app.save();
 app.editCard();app.question='Pergunta atualizada';app.answer='Nova resposta';app.newCategory='Topografia';app.add();await app.save();
 assert.equal(app.cards().length,1);assert.equal(app.current().id,id);assert.equal(app.learned().length,0);
 stored.clear();const restored=await openApp();assert.equal(restored.current().question,'Pergunta atualizada');assert.equal(restored.current().category,'Topografia');
});
test('cancelar edição não altera cartão; novo cadastro não reaproveita edição',async()=>{
 const app=await openApp();await add(app);app.editCard();app.question='Descartar';app.closeModal();
 assert.equal(app.current().question,'Pergunta');app.openModal();assert.equal(app.question,'');assert.equal(app.editingId(),null);
});
test('salvar edição sem mudar conteúdo preserva aprendizado',async()=>{
 const app=await openApp();await add(app);app.mark();await app.save();app.editCard();app.add();await app.save();assert.equal(app.learned().length,1);
});
test('remoção exige confirmação e exclui também o progresso no arquivo',async()=>{
 const app=await openApp();await add(app);app.mark();await app.save();app.requestRemove();app.closeModal();
 assert.equal(app.cards().length,1);app.removeCard();assert.equal(app.cards().length,1);
 app.requestRemove();app.removeCard();await app.save();assert.equal(app.current(),undefined);assert.equal(app.index(),0);assert.equal(app.learned().length,0);
 stored.clear();const restored=await openApp();assert.equal(restored.cards().length,0);assert.equal(restored.progress(),0);
});
test('remover último cartão de uma seleção mantém navegação válida',async()=>{
 const app=await openApp();await add(app,'Primeira');await add(app,'Segunda');app.requestRemove();app.removeCard();await app.save();assert.equal(app.current().question,'Primeira');assert.equal(app.index(),0);
});
test('nova matéria vazia persiste e aceita cartões após reabrir',async()=>{
 const app=await openApp();app.openSubjectModal();app.subjectName='  Estruturas  ';app.addSubject();await app.save();
 assert.equal(app.category(),'Estruturas');assert.equal(app.cards().length,0);assert.deepEqual(disk.subjects,['Estruturas']);
 stored.clear();const restored=await openApp();assert.ok(restored.categories.includes('Estruturas'));
 restored.select('Estruturas');restored.openModal();await add(restored);assert.equal(disk.cards[0].category,'Estruturas');
});
test('recusa matérias duplicadas e cancelar não cria matéria',async()=>{
 const app=await openApp();app.openSubjectModal();app.subjectName='  legislacao   ambiental ';app.addSubject();
 assert.match(app.subjectError(),/já existe/);assert.equal(app.customSubjects().length,0);
 app.subjectName='Estruturas';app.closeModal();assert.equal(app.customSubjects().length,0);
});
test('renomeia matéria inicial preservando cartões e progresso após recarregar',async()=>{
 const app=await openApp();await add(app);app.mark();await app.save();const old=app.current().category;
 app.editSubject(old);app.subjectName='Conforto térmico';app.addSubject();await app.save();
 assert.equal(app.current().category,'Conforto térmico');assert.equal(app.learned().length,1);assert.ok(!app.categories.includes(old));
 stored.clear();const restored=await openApp();assert.ok(!restored.categories.includes(old));assert.ok(restored.categories.includes('Conforto térmico'));assert.equal(restored.learned().length,1);
});
test('cancelar remoção de matéria preserva tudo e confirmar remove apenas seus cartões',async()=>{
 const app=await openApp();await add(app);const old=app.current().category;app.mark();await app.save();
 app.newCategory='Topografia';await add(app,'Outro cartão');
 app.requestRemoveSubject(old);app.closeModal();app.removeSubject();assert.equal(app.cards().length,2);
 app.requestRemoveSubject(old);app.removeSubject();await app.save();
 assert.equal(app.cards().length,1);assert.equal(app.current().category,'Topografia');assert.equal(app.learned().length,0);
 stored.clear();const restored=await openApp();assert.ok(!restored.categories.includes(old));assert.equal(restored.cards().length,1);
});
test('renomear matéria para nome existente é recusado; Todos não pode ser removido',async()=>{
 const app=await openApp();app.editSubject('Topografia');app.subjectName='Conforto Ambiental';app.addSubject();assert.match(app.subjectError(),/já existe/);app.closeModal();
 app.requestRemoveSubject('Todos');assert.equal(app.modal(),false);assert.equal(app.deletingSubject(),null);
});
test('renomeia e remove matéria personalizada vazia sem fazê-la reaparecer',async()=>{
 const app=await openApp();app.openSubjectModal();app.subjectName='Nova';app.addSubject();await app.save();
 app.editSubject('Nova');app.subjectName='Renomeada';app.addSubject();await app.save();assert.ok(!app.categories.includes('Nova'));
 app.requestRemoveSubject('Renomeada');app.removeSubject();await app.save();stored.clear();const restored=await openApp();assert.ok(!restored.categories.includes('Renomeada'));
});
after(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});

