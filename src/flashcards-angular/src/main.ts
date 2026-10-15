import { Component, HostListener, signal, computed } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

interface Card { id: string; category: string; question: string; answer: string; }
const initial: Card[] = [
  {id:'1',category:'Programação',question:'Qual é a diferença entre let e const em JavaScript?',answer:'let permite reatribuir o valor da variável. const impede a reatribuição, mas objetos e arrays declarados com const ainda podem ter seu conteúdo alterado.'},
  {id:'2',category:'Programação',question:'O que é um componente no Angular?',answer:'É uma unidade da interface que reúne uma classe TypeScript, um template HTML e estilos. Componentes podem ser combinados para construir uma aplicação.'},
  {id:'3',category:'Programação',question:'Para que serve o HTML semântico?',answer:'Para comunicar o significado do conteúdo com elementos como main, nav e article, facilitando a acessibilidade e a compreensão da estrutura da página.'},
  {id:'4',category:'Ciências',question:'Qual é a função da mitocôndria?',answer:'Produzir a maior parte do ATP usado pela célula, por meio da respiração celular. O ATP fornece energia para diversas atividades celulares.'},
  {id:'5',category:'Ciências',question:'O que acontece na fotossíntese?',answer:'Plantas, algas e algumas bactérias usam energia luminosa para produzir compostos orgânicos. Nas plantas, água e gás carbônico são utilizados e oxigênio é liberado.'},
  {id:'6',category:'História',question:'Em que ano ocorreu a Independência do Brasil?',answer:'Em 1822. O dia 7 de setembro marca a proclamação da Independência por Dom Pedro I.'},
  {id:'7',category:'História',question:'O que foi o Renascimento?',answer:'Um movimento cultural, artístico e intelectual que se desenvolveu na Europa, com valorização do humanismo e retomada de referências da Antiguidade clássica.'},
  {id:'8',category:'Inglês',question:'Qual é a diferença entre “since” e “for”?',answer:'Since indica o ponto inicial de um período: since 2020. For indica a duração: for three years.'}
];

@Component({
 selector:'app-root', standalone:true, imports:[FormsModule],
 templateUrl:'./app.html'
})
class App {
 cards = signal<Card[]>(initial); learned = signal<string[]>([]); category = signal('Todos');
 index = signal(0); flipped = signal(false); onlyReview = signal(false); modal = signal(false);
 notice = signal(''); question = ''; answer = ''; newCategory = 'Programação';
 categories = ['Todos','Programação','Ciências','História','Inglês'];
 filtered = computed(() => this.cards().filter(c => (this.category()==='Todos'||c.category===this.category()) && (!this.onlyReview()||!this.learned().includes(c.id))));
 current = computed(() => this.filtered()[this.index()]);
 progress = computed(() => Math.round(this.learned().length / Math.max(this.cards().length,1)*100));
 constructor() {
  try {
   const raw = JSON.parse(localStorage.getItem('memora-v1') || 'null');
   if(raw && Array.isArray(raw.cards) && raw.cards.length && raw.cards.every((c:any)=>c && ['id','category','question','answer'].every(k=>typeof c[k]==='string') && this.categories.slice(1).includes(c.category)) && new Set(raw.cards.map((c:Card)=>c.id)).size===raw.cards.length) {
    this.cards.set(raw.cards); this.learned.set(Array.isArray(raw.learned)?[...new Set<string>(raw.learned.filter((id:unknown)=>raw.cards.some((c:Card)=>c.id===id)))]:[]);
   }
  } catch { this.notice.set('Não foi possível recuperar os dados salvos.'); }
 }
 countCategory(category:string) {return this.cards().filter(c=>c.category===category).length;}
 save() { try { localStorage.setItem('memora-v1',JSON.stringify({cards:this.cards(),learned:this.learned()})); } catch { this.notice.set('O navegador não permitiu salvar. Seu progresso fica disponível nesta sessão.'); } }
 select(value:string) { this.category.set(value); this.resetCard(); }
 resetCard() { this.index.set(0); this.flipped.set(false); }
 move(step:number) { const n=this.filtered().length; if(n) {this.index.set((this.index()+step+n)%n);this.flipped.set(false);} }
 review() {this.onlyReview.update(v=>!v);this.resetCard();}
 mark() {const c=this.current();if(!c)return;this.learned.update(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id]);this.save();if(this.index()>=this.filtered().length)this.index.set(0);this.flipped.set(false);}
 shuffle() {const shuffled=[...this.cards()];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}this.cards.set(shuffled);this.resetCard();this.notice.set('Cartões embaralhados.');}
 add() {if(!this.question.trim()||!this.answer.trim())return;const c={id:crypto.randomUUID(),category:this.newCategory,question:this.question.trim(),answer:this.answer.trim()};this.cards.update(all=>[...all,c]);this.category.set(c.category);this.onlyReview.set(false);this.index.set(this.filtered().length-1);this.flipped.set(false);this.save();this.closeModal();this.question='';this.answer='';this.notice.set('Seu novo cartão está pronto!');}
 closeModal() {this.modal.set(false);setTimeout(()=>document.getElementById('add-card')?.focus());}
 openModal() {this.modal.set(true);setTimeout(()=>document.getElementById('question')?.focus());}
 @HostListener('document:keydown',['$event']) keyboard(e:KeyboardEvent) {
  if(this.modal()) {if(e.key==='Escape')this.closeModal();if(e.key==='Tab'){const els=Array.from(document.querySelectorAll<HTMLElement>('.dialog button,.dialog input,.dialog textarea,.dialog select'));const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}
  if((e.target as HTMLElement).closest('input,textarea,select,button'))return;
  if(e.key==='ArrowRight'){e.preventDefault();this.move(1);}if(e.key==='ArrowLeft'){e.preventDefault();this.move(-1);}if(e.code==='Space'&&this.current()){e.preventDefault();this.flipped.update(v=>!v);}
 }
}
bootstrapApplication(App).catch(console.error);
