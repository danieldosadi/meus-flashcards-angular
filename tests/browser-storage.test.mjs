import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import ts from 'typescript';
import '@angular/compiler';
const build = new URL('../.test-build/', import.meta.url);
await mkdir(build,{recursive:true});
const source = await readFile(new URL('../src/app.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule('const MEMORA_BROWSER_STORAGE = true;\n'+source.replace('declare const MEMORA_BROWSER_STORAGE: boolean;',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}});
await writeFile(new URL('browser-app.mjs',build),compiled.outputText);
const {App}=await import(new URL('browser-app.mjs',build));
let stored;
beforeEach(()=>{
 stored=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)}});
 globalThis.document={getElementById:()=>null};
 globalThis.fetch=()=>assert.fail('A versão Pages não deve chamar o servidor');
});
test('Pages recupera cartões, matéria personalizada e progresso sem servidor',async()=>{
 const app=new App();await app.ngOnInit();
 app.subjectName='Estruturas';app.addSubject();
 app.question='Pergunta';app.answer='Resposta';app.newCategory='Estruturas';app.add();app.mark();await app.save();
 const restored=new App();await restored.ngOnInit();
 assert.equal(restored.cards()[0].question,'Pergunta');assert.ok(restored.categories.includes('Estruturas'));
 assert.equal(restored.progress(),100);assert.equal(restored.loading(),false);
 restored.requestRemove();restored.removeCard();await restored.save();
 const empty=new App();await empty.ngOnInit();assert.equal(empty.cards().length,0);assert.equal(empty.progress(),0);
});
test('falha de armazenamento preserva a sessão e permite salvar novamente',async()=>{
 const app=new App();await app.ngOnInit();const write=localStorage.setItem;
 localStorage.setItem=()=>{throw Error('Quota')};
 app.question='Pergunta';app.answer='Resposta';app.add();
 assert.equal(await app.save(),false);assert.equal(app.storageFailed(),true);assert.equal(app.cards().length,1);
 localStorage.setItem=write;await app.retrySave();assert.equal(app.storageFailed(),false);
 assert.equal(new App().cards().length,1);
});
test('dados ilegíveis não são sobrescritos ao abrir',async()=>{
 stored.set('memora-arquitetura-v2','{inválido');
 const app=new App();await app.ngOnInit();
 assert.equal(app.storageFailed(),true);assert.equal(stored.get('memora-arquitetura-v2'),'{inválido');
});
