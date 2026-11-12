/* =========================================================
   TURMA NA NUVEM — Oficina do Poeta
   Guarda o trabalho de cada estudante no Firebase (o mesmo do Quiz STE),
   dentro de uma turma criada pelo professor.

   oficina/k/<código>                 chave do professor (ninguém lê; só as regras conferem)
   oficina/s/<código>/<aluno>         figurinhas secretas do estudante (só o professor lê)
   oficina/t/<código>/info            {nome, criada, dono}
   oficina/t/<código>/donos/<uid>     professores com acesso (gravam a chave)
   oficina/t/<código>/alunos/<aluno>  {nome, criado, atualizado, poemas, estrelas}
   oficina/t/<código>/sess/<uid>      {a: aluno, s: figurinhas}  (prova de quem está usando)
   oficina/t/<código>/w/<aluno>       trabalho do estudante (texto JSON)

   Com ?teste=1 no endereço, usa o banco local de teste do quiz (sem internet).
   ========================================================= */
import { conectar, TS } from '../quiz/rede.js';

export const FIGURINHAS = ['🐆','🦜','🐊','🐟','🌵','🌻','⭐','🌙','🎈'];
const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const gerar = n => Array.from(crypto.getRandomValues(new Uint32Array(n)), x => LETRAS[x % LETRAS.length]).join('');
export const limparCodigo = c => String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);

let R = null;
export async function rede(){
  if(R) return R;
  if(!window.FIREBASE_CONFIG && !new URLSearchParams(location.search).has('teste')){
    await new Promise((ok,erro)=>{ const s=document.createElement('script'); s.src=new URL('../quiz/config.js', import.meta.url).href; s.onload=ok; s.onerror=()=>erro(new Error('sem-config')); document.head.appendChild(s); });
  }
  R = await conectar();
  return R;
}
const T = c => `oficina/t/${c}`;
/* traduz erros do Firebase em mensagens para o usuário */
export function msgErro(e){
  const m = String(e && (e.code || e.message) || e);
  if(/PERMISSION|permission/i.test(m)) return 'permissao';
  if(/sem-config/.test(m)) return 'config';
  return 'rede';
}

/* ---------------- professor ---------------- */
export async function criarTurma(nome){
  const r = await rede();
  for(let t=0;t<6;t++){
    const cod = gerar(6);
    if(await r.get(T(cod)+'/info')) continue;
    const chave = gerar(8);
    await r.set(`oficina/k/${cod}`, chave);
    await r.set(`${T(cod)}/donos/${r.uid}`, chave);
    await r.set(`${T(cod)}/info`, {nome:String(nome).slice(0,30), criada:TS, dono:r.uid});
    return {cod, chave, nome};
  }
  throw new Error('não consegui gerar um código livre');
}
/* abre uma turma já criada (por exemplo, em outro computador) com a chave do professor */
export async function entrarProfessor(cod, chave){
  const r = await rede();
  cod = limparCodigo(cod); chave = limparCodigo(chave);
  if(r.tipo==='teste' && (await r.get(`oficina/k/${cod}`))!==chave) throw Object.assign(new Error('PERMISSION_DENIED'),{code:'PERMISSION_DENIED'});
  await r.set(`${T(cod)}/donos/${r.uid}`, chave);   // as regras só deixam gravar se a chave estiver certa
  const info = await r.get(`${T(cod)}/info`);
  if(!info) throw new Error('turma não encontrada');
  return {cod, chave, nome:info.nome};
}
export async function turmaCompleta(cod){ const r=await rede(); return r.get(T(cod)); }
export async function ouvirTurma(cod, cb){ const r=await rede(); return r.on(T(cod), cb); }
export async function figurinhasDe(cod){ const r=await rede(); return (await r.get(`oficina/s/${cod}`))||{}; }
export async function redefinirFigurinhas(cod, aid, senha){ const r=await rede(); await r.set(`oficina/s/${cod}/${aid}`, senha); }
export async function removerAluno(cod, aid){ const r=await rede(); await r.remove(`${T(cod)}/alunos/${aid}`); await r.remove(`${T(cod)}/w/${aid}`); await r.remove(`oficina/s/${cod}/${aid}`); }
export async function renomearAluno(cod, aid, nome){ const r=await rede(); await r.update(`${T(cod)}/alunos/${aid}`, {nome:String(nome).slice(0,30)}); }

/* ---------------- estudante ---------------- */
export async function infoTurma(cod){
  const r = await rede(); cod = limparCodigo(cod);
  const info = await r.get(`${T(cod)}/info`);
  if(!info) return null;
  const alunos = (await r.get(`${T(cod)}/alunos`)) || {};
  return {cod, nome:info.nome, alunos:Object.entries(alunos).map(([aid,a])=>({aid, nome:a.nome, atualizado:a.atualizado||0})).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'))};
}
export async function cadastrarAluno(cod, nome, senha){
  const r = await rede();
  const aid = 'a' + gerar(7).toLowerCase();
  await r.set(`oficina/s/${cod}/${aid}`, senha);
  await r.set(`${T(cod)}/sess/${r.uid}`, {a:aid, s:senha});
  await r.set(`${T(cod)}/alunos/${aid}`, {nome:String(nome).slice(0,30), criado:TS, atualizado:TS, poemas:0, estrelas:0});
  return aid;
}
/* confere as figurinhas: se estiverem erradas, o Firebase recusa a gravação */
export async function entrarAluno(cod, aid, senha){
  const r = await rede();
  if(r.tipo==='teste'){ const s = await r.get(`oficina/s/${cod}/${aid}`); if(s!==senha) throw Object.assign(new Error('PERMISSION_DENIED'),{code:'PERMISSION_DENIED'}); }
  await r.set(`${T(cod)}/sess/${r.uid}`, {a:aid, s:senha});
  const w = await r.get(`${T(cod)}/w/${aid}`);
  try{ return w ? JSON.parse(w) : null; }catch(e){ return null; }
}
export async function salvarTrabalho(cod, aid, dados, resumo){
  const r = await rede();
  await r.set(`${T(cod)}/w/${aid}`, JSON.stringify(dados));
  await r.update(`${T(cod)}/alunos/${aid}`, Object.assign({atualizado:TS}, resumo||{}));
}
export async function sairAluno(cod){ try{ const r=await rede(); await r.remove(`${T(cod)}/sess/${r.uid}`); }catch(e){} }
