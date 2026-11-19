/* =========================================================
   AVALIAÇÃO SAEB — funções comuns (professor e estudante)

   Firebase (mesmo projeto do Quiz):
   saeb/k/<cad>                      chave do caderno (ninguém lê)
   saeb/s/<cad>/<aid>                senha de cada estudante (só o professor lê)
   saeb/c/<cad>/info                 {nome, criado, dono}
   saeb/c/<cad>/donos/<uid>          professores com acesso
   saeb/c/<cad>/turmas/<tid>         {nome, ano}
   saeb/c/<cad>/alunos/<tid>/<aid>   {nome}               (estudantes leem só os nomes)
   saeb/c/<cad>/gab/<qid>            {g, desc, off}       (correções do professor)
   saeb/c/<cad>/apl/<pin>            resumo da aplicação para o painel
   saeb/a/<pin>/cad                  caderno dono da aplicação
   saeb/a/<pin>/info                 {titulo, tid, turma, disc, ano, tipo, qs, aberta, correcao}
   saeb/a/<pin>/gab/<i>              gabarito (o estudante só lê no treino ou com correção liberada)
   saeb/a/<pin>/sess/<uid>           {a, s}   prova de quem está respondendo
   saeb/a/<pin>/r/<aid>              {r:{i0:'A'...}, ini, fim, papel}
   ========================================================= */
import { conectar, TS } from '../quiz/rede.js';
export { TS };

const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const LETNUM = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const sorteio = (n, base) => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => base[x % base.length]).join('');
export const gerarPin = () => sorteio(5, LETRAS);           // código da prova: só letras (o Quiz usa só números)
export const gerarCad = () => sorteio(6, LETNUM);
export const gerarChave = () => sorteio(8, LETNUM);
export const gerarSenha = () => String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
export const limpar = (c, n=8) => String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,n);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const DISC = {lp:'Língua Portuguesa', mat:'Matemática'};
export const TIPOS = {diag:'Avaliação diagnóstica', sim:'Simulado', treino:'Treino com correção'};

let R = null;
export async function rede(){
  if (R) return R;
  if (!window.FIREBASE_CONFIG && !new URLSearchParams(location.search).has('teste')){
    await new Promise((ok, erro) => { const s=document.createElement('script'); s.src=new URL('../quiz/config.js', import.meta.url).href; s.onload=ok; s.onerror=()=>erro(new Error('sem-config')); document.head.appendChild(s); });
  }
  R = await conectar();
  return R;
}
export function msgErro(e){
  const m = String(e && (e.code || e.message) || e);
  if (/PERMISSION|permission/i.test(m)) return 'permissao';
  if (/sem-config/.test(m)) return 'config';
  return 'rede';
}

/* ---------- banco de questões ---------- */
const CACHE = {};
export const chaveBanco = (disc, ano) => disc + ano;
export async function banco(disc, ano){
  const k = chaveBanco(disc, ano);
  if (!CACHE[k]) CACHE[k] = fetch(new URL(`banco/${k}.json`, import.meta.url)).then(r => r.json()).then(l => { const m = {}; l.forEach(q => m[q.id] = q); return {lista:l, mapa:m}; });
  return CACHE[k];
}
let GAB = null;
export async function gabaritosBase(){
  if (!GAB) GAB = fetch(new URL('banco/gabaritos.json', import.meta.url)).then(r => r.json());
  return GAB;
}
export const matriz = (disc, ano) => window.MATRIZ_SAEB[disc + ano];
export function descTexto(disc, ano, d){ const m = matriz(disc, ano); return (m && m.d[d]) || 'Descritor não informado'; }
export const ordD = d => d === '?' ? 999 : parseInt(String(d).slice(1)) || 998;

/* ---------- desenho da questão ---------- */
const IMG = new URL('banco/img/', import.meta.url).href;
function par(p){
  if (p && p.t) return `<div class="q-tab"><table>${p.t.map(l => `<tr>${l.map(c => `<td>${c.map(par).join('')}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const temImg = p.some(s => typeof s !== 'string');
  return `<p class="${temImg ? 'q-img' : ''}">${p.map(s => typeof s === 'string' ? esc(s) : `<img src="${IMG}${s.i}" alt="figura da questão" loading="lazy">`).join('')}</p>`;
}
export const blocos = l => (l || []).map(par).join('');
export function enunciadoHtml(q){ return `<div class="q-enun">${blocos(q.p)}</div>`; }
export function alternativaHtml(q, L){ return blocos(q.o[L]); }

/* ---------- resultados ---------- */
export const faixa = p => p == null ? 'sd' : p >= 70 ? 'ok' : p >= 50 ? 'med' : 'crit';
export const FAIXA_TXT = {ok:'Adequado (70% ou mais)', med:'Em desenvolvimento (50% a 69%)', crit:'Crítico (abaixo de 50%)', sd:'Sem dados'};
export const pct = (a, t) => t ? Math.round(100 * a / t) : null;
export const respostasDe = rr => { const r = (rr && rr.r) || {}; return i => r['i' + i] || null; };
/* consolida várias aplicações: devolve por aluno, por descritor e por questão */
export function consolidar(apls){
  const alunos = {}, desc = {}, itens = [];
  apls.forEach(ap => {
    const inf = ap.info, gab = ap.gab || {}, R = ap.r || {};
    (inf.qs || []).forEach((qid, i) => {
      const g = gab['i' + i], d = (inf.qd || [])[i] || '?';
      const it = {pin: ap.pin, i, qid, d, g, cont:{A:0,B:0,C:0,D:0}, br:0, ac:0, n:0};
      Object.entries(R).forEach(([aid, rr]) => {
        const v = respostasDe(rr)(i), entregue = !!rr.fim;
        if (!v && !entregue) return;               // ainda respondendo: só conta o que já marcou
        if (!g) return;
        const ok = v === g ? 1 : 0;
        if (v) it.cont[v]++; else it.br++;
        it.n++; it.ac += ok;
        const A = alunos[aid] = alunos[aid] || {ac:0, n:0, d:{}};
        A.ac += ok; A.n++;
        const z = A.d[d] = A.d[d] || {ac:0, n:0}; z.ac += ok; z.n++;
        const D = desc[d] = desc[d] || {ac:0, n:0, itens:0}; D.ac += ok; D.n++;
      });
      if (g && desc[d]) desc[d].itens++;
      itens.push(it);
    });
  });
  return {alunos, desc, itens};
}
