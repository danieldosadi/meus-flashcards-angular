import { Component, HostListener, signal, computed } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
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
class App {
 cards = signal<Card[]>(initial); learned = signal<string[]>([]); category = signal('Todos');
 index = signal(0); flipped = signal(false); onlyReview = signal(false); modal = signal(false);
 notice = signal(''); question = ''; answer = ''; newCategory = subjects[0];
 categories = ['Todos', ...subjects];
 filtered = computed(() => this.cards().filter(c => (this.category()==='Todos'||c.category===this.category()) && (!this.onlyReview()||!this.learned().includes(c.id))));
 current = computed(() => this.filtered()[this.index()]);
 progress = computed(() => Math.round(this.learned().length / Math.max(this.cards().length,1)*100));
 constructor() {
  try {
   const raw = JSON.parse(localStorage.getItem('memora-arquitetura-v2') || 'null');
   if(raw && Array.isArray(raw.cards) && raw.cards.every((c:any)=>c && ['id','category','question','answer'].every(k=>typeof c[k]==='string') && this.categories.slice(1).includes(c.category)) && new Set(raw.cards.map((c:Card)=>c.id)).size===raw.cards.length) {
    this.cards.set(raw.cards); this.learned.set(Array.isArray(raw.learned)?[...new Set<string>(raw.learned.filter((id:unknown)=>raw.cards.some((c:Card)=>c.id===id)))]:[]);
   }
  } catch { this.notice.set('Não foi possível recuperar os dados salvos.'); }
 }
 countCategory(category:string) {return this.cards().filter(c=>c.category===category).length;}
 save() { try { localStorage.setItem('memora-arquitetura-v2',JSON.stringify({cards:this.cards(),learned:this.learned()})); } catch { this.notice.set('O navegador não permitiu salvar. Seu progresso fica disponível nesta sessão.'); } }
 select(value:string) { this.category.set(value); this.resetCard(); }
 resetCard() { this.index.set(0); this.flipped.set(false); }
 move(step:number) { const n=this.filtered().length; if(n) {this.index.set((this.index()+step+n)%n);this.flipped.set(false);} }
 review() {this.onlyReview.update(v=>!v);this.resetCard();}
 mark() {const c=this.current();if(!c)return;this.learned.update(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id]);this.save();if(this.index()>=this.filtered().length)this.index.set(0);this.flipped.set(false);}
 shuffle() {const shuffled=[...this.cards()];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}this.cards.set(shuffled);this.resetCard();this.notice.set('Cartões embaralhados.');}
 add() {if(!this.question.trim()||!this.answer.trim())return;const c={id:crypto.randomUUID(),category:this.newCategory,question:this.question.trim(),answer:this.answer.trim()};this.cards.update(all=>[...all,c]);this.category.set(c.category);this.onlyReview.set(false);this.index.set(this.filtered().length-1);this.flipped.set(false);this.save();this.closeModal();this.question='';this.answer='';this.notice.set('Seu novo cartão está pronto!');}
 closeModal() {this.modal.set(false);setTimeout(()=>document.getElementById('add-card')?.focus());}
 openModal() {this.newCategory=this.category()==='Todos'?subjects[0]:this.category();this.modal.set(true);setTimeout(()=>document.getElementById('question')?.focus());}
 @HostListener('document:keydown',['$event']) keyboard(e:KeyboardEvent) {
  if(this.modal()) {if(e.key==='Escape')this.closeModal();if(e.key==='Tab'){const els=Array.from(document.querySelectorAll<HTMLElement>('.dialog button,.dialog input,.dialog textarea,.dialog select'));const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
  if((e.target as HTMLElement).closest('input,textarea,select,button'))return;
  if(e.key==='ArrowRight'){e.preventDefault();this.move(1);}if(e.key==='ArrowLeft'){e.preventDefault();this.move(-1);}if(e.code==='Space'&&this.current()){e.preventDefault();this.flipped.update(v=>!v);}
 }
}
bootstrapApplication(App).catch(console.error);
