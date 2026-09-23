import { Component, HostListener, signal, computed, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';

interface Card { id: string; category: string; question: string; answer: string; }
const initial: Card[] = [];
const subjects = [
  "Conforto Ambiental",
  "Acessibilidade (NBR 9050/2020)",
  "Instalações Prediais",
  "Legislação Ambiental",
  "Legislação Profissional (Conselho de Arquitetura e Urbanismo)",
  "Leis de Licitações e Contratos",
  "Patrimônio Histórico e Artístico",
  "Planejamento e Orçamento de Obras",
  "Política e Legislação Urbana",
  "Prevenção e combate a incêndios",
  "Representação Gráfica e Elaboração de Projetos",
  "Segurança do Trabalho",
  "Topografia"
];

@Component({
 selector:'app-root', standalone:true, imports:[FormsModule],
 templateUrl:'./app.html'
})
export class App implements OnInit {
 loading = signal(true);
 diskStatus = signal('Conectando ao salvamento no computador…');
 revision: number | null = null;
 private queue: Promise<boolean> = Promise.resolve(true);

 async ngOnInit() { await this.connect(); }

 private cache(pending: boolean) {
  try {
   localStorage.setItem('memora-arquitetura-v2', JSON.stringify({cards:this.cards(),learned:this.learned(),subjects:this.customSubjects(),removedSubjects:this.removedSubjects(),pending,revision:this.revision}));
  } catch { /* The disk is the primary storage; browser caching is optional. */ }
 }

 async connect() {
  this.loading.set(true);
  try {
   const response = await fetch('/api/study', {signal: AbortSignal.timeout(10000)});
   if(!response.ok) throw new Error('Não foi possível abrir o arquivo no computador.');
   const data = await response.json();
   if(!Array.isArray(data.cards) || !Array.isArray(data.learned) || !Number.isSafeInteger(data.revision)) throw new Error('Resposta inválida do serviço local.');
   let cached: any = null;
   try { cached = JSON.parse(localStorage.getItem('memora-arquitetura-v2') || 'null'); } catch {}
   if(cached?.pending && (!Array.isArray(cached.cards) || !cached.cards.every((card: any) => card && ['id','category','question','answer'].every(key => typeof card[key] === 'string') && this.categories.includes(card.category)))) {
    throw new Error('A cópia pendente do navegador é inválida. O arquivo do computador foi preservado.');
   }
   this.revision = data.revision;
   if(data.initialized && cached?.pending && cached.revision !== data.revision) {
    throw new Error('Há alterações pendentes no navegador e outra versão no arquivo. Os dados foram preservados; resolva a diferença antes de continuar.');
   }
   if(data.initialized && !cached?.pending) {
    this.removedSubjects.set(data.removedSubjects ?? []); this.customSubjects.set(data.subjects ?? []); this.cards.set(data.cards); this.learned.set(data.learned); this.resetCard(); this.cache(false);
    this.storageFailed.set(false); this.diskStatus.set('✓ Salvo no computador');
   } else {
    await this.save();
   }
  } catch(error) {
   this.revision = null;
   this.storageFailed.set(true);
   this.diskStatus.set(error instanceof Error && !['TimeoutError','TypeError'].includes(error.name) ? error.message : 'Serviço local indisponível. Inicie o aplicativo com npm start.');
  } finally { this.loading.set(false); }
 }

 save(): Promise<boolean> {
  this.cache(true);
  const snapshot = { cards: this.cards(), learned: this.learned(), subjects: this.customSubjects(), removedSubjects: this.removedSubjects() };
  this.diskStatus.set('Salvando no computador…');
  this.queue = this.queue.then(async () => {
   try {
    if(this.revision === null) throw new Error('Serviço local indisponível. Seus dados ainda não foram salvos no computador.');
    const response = await fetch('/api/study', {
     method:'PUT', headers:{'Content-Type':'application/json'},
     body:JSON.stringify({...snapshot,revision:this.revision}), signal:AbortSignal.timeout(10000)
    });
    if(!response.ok) {
     const error = await response.json();
     if(response.status===409) this.revision=null;
     throw new Error(error.error || 'Falha ao salvar no computador.');
    }
    const saved = await response.json(); this.revision=saved.revision;
    const isLatest = this.cards()===snapshot.cards && this.learned()===snapshot.learned && this.customSubjects()===snapshot.subjects && this.removedSubjects()===snapshot.removedSubjects;
    this.cache(!isLatest);
    if(isLatest) {this.storageFailed.set(false);this.diskStatus.set('✓ Salvo no computador');this.notice.set('');}
    return true;
   } catch(error) {
    this.storageFailed.set(true);
    this.diskStatus.set(error instanceof Error ? error.message : 'Falha ao salvar no computador.');
    this.notice.set('O salvamento não foi concluído. Mantenha esta página aberta e tente novamente.');
    return false;
   }
  });
  return this.queue;
 }

 async retrySave() { if(this.revision===null) await this.connect(); else await this.save(); }

 @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
  if(this.storageFailed() || this.diskStatus()==='Salvando no computador…') {event.preventDefault();event.returnValue='';}
 }
 cards = signal<Card[]>(initial); learned = signal<string[]>([]); category = signal('Todos');
 index = signal(0); flipped = signal(false); onlyReview = signal(false); modal = signal(false);
 editingId = signal<string | null>(null);
 deletingCard = signal<Card | null>(null);
 private returnFocusId = 'add-card';
 storageFailed = signal(false); notice = signal(''); question = ''; answer = ''; newCategory = subjects[0];
 customSubjects = signal<string[]>([]);
 removedSubjects = signal<string[]>([]);
 editingSubject = signal<string | null>(null);
 deletingSubject = signal<string | null>(null);
 creatingSubject = signal(false);
 subjectName = '';
 subjectError = signal('');
 get categories() { return ['Todos', ...subjects.filter(name=>!this.removedSubjects().includes(name)), ...this.customSubjects()]; }
 filtered = computed(() => this.cards().filter(c => (this.category()==='Todos'||c.category===this.category()) && (!this.onlyReview()||!this.learned().includes(c.id))));
 current = computed(() => this.filtered()[this.index()]);
 progress = computed(() => Math.round(this.learned().length / Math.max(this.cards().length,1)*100));
 constructor() {
  try {
   const raw = JSON.parse(localStorage.getItem('memora-arquitetura-v2') || 'null');
   if(raw && Array.isArray(raw.removedSubjects) && raw.removedSubjects.every((name: unknown)=>typeof name==='string')) this.removedSubjects.set(raw.removedSubjects);
   if(raw && Array.isArray(raw.subjects) && raw.subjects.every((name: unknown)=>typeof name==='string' && name.trim().length>0 && name.length<=200)) this.customSubjects.set([...new Set<string>(raw.subjects)]);
   if(raw && Array.isArray(raw.cards) && raw.cards.every((c:any)=>c && ['id','category','question','answer'].every(k=>typeof c[k]==='string') && this.categories.slice(1).includes(c.category)) && new Set(raw.cards.map((c:Card)=>c.id)).size===raw.cards.length) {
    this.cards.set(raw.cards); this.learned.set(Array.isArray(raw.learned)?[...new Set<string>(raw.learned.filter((id:unknown)=>raw.cards.some((c:Card)=>c.id===id)))]:[]);
   }
  } catch { this.storageFailed.set(true); this.notice.set('Não foi possível recuperar os dados salvos.'); }
 }
 countCategory(category:string) {return this.cards().filter(c=>c.category===category).length;}
 openSubjectModal() {
  this.returnFocusId='add-subject';this.editingId.set(null);this.deletingCard.set(null);
  this.editingSubject.set(null);this.deletingSubject.set(null);this.subjectName='';this.subjectError.set('');this.creatingSubject.set(true);this.modal.set(true);
  setTimeout(()=>document.getElementById('subject-name')?.focus());
 }
 addSubject() {
  const name=this.subjectName.trim().replace(/\s+/g,' ');
  if(!name || name.length>200) {this.subjectError.set('Informe um nome com até 200 caracteres.');return;}
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  if(this.categories.some(category=>category!==this.editingSubject() && normalize(category)===normalize(name))) {this.subjectError.set('Essa matéria já existe. Escolha outro nome.');return;}
  const old=this.editingSubject();
  if(old) {
   if(subjects.includes(old)) this.removedSubjects.update(all=>[...new Set([...all,old])]);
   this.customSubjects.update(all=>all.filter(item=>item!==old));
   this.cards.update(all=>all.map(card=>card.category===old?{...card,category:name}:card));
  }
  this.customSubjects.update(all=>[...all,name]);this.select(name);this.onlyReview.set(false);
  void this.save();this.closeModal();
 }
 editSubject(name:string) {
  if(name==='Todos' || !this.categories.includes(name))return;
  this.openSubjectModal();this.editingSubject.set(name);this.subjectName=name;
 }
 requestRemoveSubject(name:string) {
  if(name==='Todos' || !this.categories.includes(name))return;
  this.returnFocusId='add-subject';this.creatingSubject.set(false);this.editingSubject.set(null);
  this.deletingCard.set(null);this.deletingSubject.set(name);this.modal.set(true);
  setTimeout(()=>document.getElementById('cancel-remove-subject')?.focus());
 }
 removeSubject() {
  const name=this.deletingSubject();if(!name)return;
  if(subjects.includes(name)) this.removedSubjects.update(all=>[...new Set([...all,name])]);
  this.customSubjects.update(all=>all.filter(item=>item!==name));
  const removedIds=new Set(this.cards().filter(card=>card.category===name).map(card=>card.id));
  this.cards.update(all=>all.filter(card=>card.category!==name));
  this.learned.update(all=>all.filter(id=>!removedIds.has(id)));
  if(this.category()===name)this.select('Todos');else this.resetCard();
  void this.save();this.closeModal();
 }

 select(value:string) { this.category.set(value); this.resetCard(); }
 resetCard() { this.index.set(0); this.flipped.set(false); }
 move(step:number) { const n=this.filtered().length; if(n) {this.index.set((this.index()+step+n)%n);this.flipped.set(false);} }
 review() {this.onlyReview.update(v=>!v);this.resetCard();}
 mark() {const c=this.current();if(!c)return;this.learned.update(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id]);this.save();if(this.index()>=this.filtered().length)this.index.set(0);this.flipped.set(false);}
 shuffle() {const shuffled=[...this.cards()];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}this.cards.set(shuffled);this.resetCard();void this.save();}
 add() {
  if(!this.question.trim() || !this.answer.trim() || this.question.trim().length>250 || this.answer.trim().length>1000 || !this.categories.slice(1).includes(this.newCategory)) return;
  const id=this.editingId();
  const card={id:id ?? crypto.randomUUID(),category:this.newCategory,question:this.question.trim(),answer:this.answer.trim()};
  if(id) {
   const previous=this.cards().find(item=>item.id===id);
   if(!previous)return;
   this.cards.update(all=>all.map(item=>item.id===id ? card : item));
   if(previous.question!==card.question || previous.answer!==card.answer) this.learned.update(ids=>ids.filter(value=>value!==id));
  } else { this.cards.update(all=>[...all,card]); }
  this.category.set(card.category);this.onlyReview.set(false);
  this.index.set(this.filtered().findIndex(item=>item.id===card.id));this.flipped.set(false);
  void this.save();this.closeModal();this.question='';this.answer='';
 }
 closeModal() {
  this.modal.set(false);this.editingSubject.set(null);this.deletingSubject.set(null);this.creatingSubject.set(false);this.deletingCard.set(null);this.editingId.set(null);
  setTimeout(()=>(document.getElementById(this.returnFocusId) ?? document.getElementById('add-card'))?.focus());
 }
 openModal() {
  if(this.categories.length===1){this.openSubjectModal();return;}
  this.returnFocusId='add-card';this.editingId.set(null);this.deletingCard.set(null);this.question='';this.answer='';
  this.newCategory=this.category()==='Todos'?this.categories[1]:this.category();this.modal.set(true);
  setTimeout(()=>document.getElementById('question')?.focus());
 }
 editCard() {
  const card=this.current();if(!card)return;
  this.returnFocusId='edit-card';this.editingId.set(card.id);this.deletingCard.set(null);
  this.question=card.question;this.answer=card.answer;this.newCategory=card.category;this.modal.set(true);
  setTimeout(()=>document.getElementById('question')?.focus());
 }
 requestRemove() {
  const card=this.current();if(!card)return;
  this.returnFocusId='remove-card';this.editingId.set(null);this.deletingCard.set(card);this.modal.set(true);
  setTimeout(()=>document.getElementById('cancel-remove')?.focus());
 }
 removeCard() {
  const card=this.deletingCard();if(!card)return;
  this.cards.update(all=>all.filter(item=>item.id!==card.id));
  this.learned.update(ids=>ids.filter(id=>id!==card.id));
  this.index.set(Math.max(0,Math.min(this.index(),this.filtered().length-1)));
  this.flipped.set(false);void this.save();this.closeModal();
 }
 @HostListener('document:keydown',['$event']) keyboard(e:KeyboardEvent) {
  if(this.loading())return;
  if(this.modal()) {if(e.key==='Escape')this.closeModal();if(e.key==='Tab'){const els=Array.from(document.querySelectorAll<HTMLElement>('.dialog button:not(:disabled),.dialog input:not(:disabled),.dialog textarea:not(:disabled),.dialog select:not(:disabled)'));const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
  if(e.target instanceof HTMLElement && e.target.closest('input,textarea,select,button'))return;
  if(e.key==='ArrowRight'){e.preventDefault();this.move(1);}if(e.key==='ArrowLeft'){e.preventDefault();this.move(-1);}if(e.code==='Space'&&this.current()){e.preventDefault();this.flipped.update(v=>!v);}
 }
}






