/* =========================================================
   PAINEL DE AVALIAÇÃO — dados
   Tudo fica no navegador do professor (IndexedDB "jrmAvaliacao").
   Nada é enviado para servidor. Para levar a outro computador,
   use o backup (arquivo .json) do Painel de Avaliação.

   atividades: { id, tipo:'quiz'|'rubrica'|'jogo', titulo, turma, componente, ano, data,
                 itens:[{id, rotulo, hab:[códigos], ind, opcoes?, correta?, tempo?}],
                 alunos:{ chave:{nome} },
                 res:{ chave:{ itemId: valor } },   // quiz {r,ok,seg} · rubrica 1-4 · jogo {ok,total}
                 saidas?, aplicadas?, finalizada, atualizado }
   turmas:     { id, nome, alunos:[{k,nome}], apelidos:{ chaveDigitada: k }, criada }
   indicadores:{ id, nome, desc, componente, hab:[] }
   cfg:        niveis
   ========================================================= */
const NOME_DB='jrmAvaliacao', VERSAO=1, LOJAS=['atividades','turmas','indicadores'];
let dbP=null;
function abrir(){
  if(!dbP) dbP=new Promise((ok,erro)=>{
    const r=indexedDB.open(NOME_DB,VERSAO);
    r.onupgradeneeded=()=>{ const d=r.result; LOJAS.forEach(s=>{ if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'}); }); if(!d.objectStoreNames.contains('cfg')) d.createObjectStore('cfg'); };
    r.onsuccess=()=>ok(r.result); r.onerror=()=>erro(r.error);
  });
  return dbP;
}
async function tx(loja,modo,fn){ const d=await abrir(); return new Promise((ok,erro)=>{ const t=d.transaction(loja,modo), q=fn(t.objectStore(loja)); t.oncomplete=()=>ok(q?q.result:undefined); t.onerror=()=>erro(t.error); t.onabort=()=>erro(t.error); }); }
export const todos=loja=>tx(loja,'readonly',s=>s.getAll());
export const pegar=(loja,id)=>tx(loja,'readonly',s=>s.get(id));
export const salvar=(loja,obj)=>{ if(loja==='atividades') obj.atualizado=Date.now(); return tx(loja,'readwrite',s=>s.put(JSON.parse(JSON.stringify(obj)))); };
export const apagar=(loja,id)=>tx(loja,'readwrite',s=>s.delete(id));
export const cfgLer=k=>tx('cfg','readonly',s=>s.get(k));
export const cfgSalvar=(k,v)=>tx('cfg','readwrite',s=>s.put(v,k));
export const novoId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export async function pedirPersistencia(){ try{ if(navigator.storage&&navigator.storage.persist) return await navigator.storage.persist(); }catch(e){} return false; }

/* ---------- nomes e turmas ---------- */
export const chave=n=>String(n||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const idTurma=nome=>'t_'+chave(nome).replace(/ /g,'-');
export async function garantirTurma(nome){
  nome=String(nome||'').trim(); if(!nome) return null;
  const id=idTurma(nome); let t=await pegar('turmas',id);
  if(!t){ t={id,nome,alunos:[],apelidos:{},criada:Date.now()}; await salvar('turmas',t); }
  return t;
}
/* Descobre a chave do estudante na turma: lista da turma → apelidos → nome digitado */
export function alunoDe(turma,nomeDigitado){
  const k=chave(nomeDigitado); if(!k) return null;
  if(!turma) return k;
  if(turma.apelidos&&turma.apelidos[k]) return turma.apelidos[k];
  if(turma.alunos&&turma.alunos.some(a=>a.k===k)) return k;
  if(turma.alunos&&turma.alunos.length){ const so=turma.alunos.filter(a=>a.k.split(' ')[0]===k); if(so.length===1&&k.indexOf(' ')<0) return so[0].k; }
  return turma.alunos&&turma.alunos.length?null:k;   // null = nome não reconhecido (a turma tem lista)
}

/* ---------- níveis de desempenho ---------- */
export const NIVEIS_PADRAO=[
  {min:0, nome:'Abaixo do básico', cor:'#DC2626', curto:'AB'},
  {min:40,nome:'Básico',          cor:'#F59E0B', curto:'B'},
  {min:70,nome:'Adequado',        cor:'#16A34A', curto:'AD'},
  {min:90,nome:'Avançado',        cor:'#2563EB', curto:'AV'}
];
export async function niveis(){ const n=await cfgLer('niveis'); return Array.isArray(n)&&n.length===4?n:NIVEIS_PADRAO; }
export const nivelDe=(pct,N)=>{ if(pct==null||isNaN(pct)) return null; let k=0; N.forEach((n,i)=>{ if(pct>=n.min) k=i; }); return k; };
/* nota da rubrica (1 a 4) → percentual representativo, no meio da faixa do nível */
export const pctDaRubrica=(v,N)=>{ const i=v-1; const a=N[i].min, b=i<3?N[i+1].min:100; return Math.round((a+b)/2); };

/* ---------- backup ---------- */
export async function exportarTudo(){ return {formato:'jrmAvaliacao',versao:1,em:new Date().toISOString(),atividades:await todos('atividades'),turmas:await todos('turmas'),indicadores:await todos('indicadores'),niveis:await cfgLer('niveis')||null}; }
export async function importarTudo(obj){
  if(!obj||obj.formato!=='jrmAvaliacao') throw new Error('arquivo inválido');
  let n=0;
  for(const a of obj.atividades||[]){ const atual=await pegar('atividades',a.id); if(!atual||(a.atualizado||0)>=(atual.atualizado||0)){ await tx('atividades','readwrite',s=>s.put(a)); n++; } }
  for(const t of obj.turmas||[]){ const atual=await pegar('turmas',t.id); if(atual){ const ks=new Set(atual.alunos.map(a=>a.k)); t.alunos.forEach(a=>{ if(!ks.has(a.k)) atual.alunos.push(a); }); Object.assign(atual.apelidos,t.apelidos||{}); await salvar('turmas',atual); } else await salvar('turmas',t); }
  for(const i of obj.indicadores||[]) await salvar('indicadores',i);
  if(obj.niveis) await cfgSalvar('niveis',obj.niveis);
  return n;
}
