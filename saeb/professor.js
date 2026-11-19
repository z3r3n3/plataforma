/* =========================================================
   AVALIAÇÃO SAEB — painel do professor
   ========================================================= */
import { rede, msgErro, limpar, esc, banco, gabaritosBase, matriz, descTexto, ordD, enunciadoHtml, alternativaHtml, blocos,
  gerarPin, gerarCad, gerarChave, gerarSenha, TS, DISC, TIPOS, faixa, FAIXA_TXT, pct, consolidar, respostasDe } from './comum.js';

const $ = s => document.querySelector(s), app = $('#app');
const LS = 'saeb.prof.v1';
const URL_ALUNO = new URL('aluno.html', location.href).href.replace(/\?.*$/, '');
let R, CAD, CHAVE, D = {}, SEN = {}, GB = {}, ABA = 'turmas', TSEL = null, desligarCad = null, desligarApl = null;
let NOVA = null;           // aplicação em montagem
let RES = {tid:'', disc:'mat', pins:null};
let BQ = {chave:'mat5', desc:'', st:'todas', busca:'', pag:0};
const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
const modal = (h, larga) => { const c = $('#modal-c'); c.innerHTML = h; c.classList.toggle('larga', !!larga); $('#modal').classList.remove('hidden'); };
const fecharModal = () => { $('#modal').classList.add('hidden'); if (desligarApl) { desligarApl(); desligarApl = null; } };
const lerLS = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch(e){ return {}; } };
const gravarLS = o => { try { localStorage.setItem(LS, JSON.stringify(Object.assign(lerLS(), o))); } catch(e){} };
const dataBR = t => t ? new Date(t).toLocaleDateString('pt-BR') : '';
const turmas = () => Object.entries(D.turmas || {}).map(([tid, t]) => ({tid, ...t})).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
const alunosDe = tid => Object.entries((D.alunos || {})[tid] || {}).map(([aid, a]) => ({aid, ...a})).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
const apls = () => Object.entries(D.apl || {}).map(([pin, a]) => ({pin, ...a})).sort((a, b) => (b.criada||0) - (a.criada||0));
const gabDe = qid => (D.gab && D.gab[qid] && D.gab[qid].g) || (GB[qid] && GB[qid].g) || null;
const origemGab = qid => (D.gab && D.gab[qid] && D.gab[qid].g) ? 'prof' : (GB[qid] ? 'base' : null);
const descDe = q => (D.gab && D.gab[q.id] && D.gab[q.id].desc) || q.desc;
const desligada = q => !!(D.gab && D.gab[q.id] && D.gab[q.id].off);
const usavel = q => !q.prob && !desligada(q);
const chip = (f, t) => `<span class="chip f-${f}">${t}</span>`;

/* ---------------- entrada ---------------- */
async function iniciar(){
  try { R = await rede(); } catch(e){ app.innerHTML = `<section class="cartao centro"><h1>Sem conexão</h1><p>${msgErro(e)==='config'?'Configuração do servidor não encontrada.':'Verifique a internet e recarregue.'}</p></section>`; return; }
  GB = await gabaritosBase();
  const g = lerLS();
  if (g.cad && g.chave) return abrirCaderno(g.cad, g.chave, true);
  telaEntrada();
}
function telaEntrada(){
  $('#cad-topo').textContent = '';
  app.innerHTML = `<section class="cartao"><p class="selo">Avaliação no formato SAEB · 5º e 9º ano</p><h1>Acompanhe a turma por descritor</h1>
    <p>Monte provas de <b>Língua Portuguesa</b> e <b>Matemática</b> escolhendo os descritores da Matriz de Referência do SAEB. Os estudantes respondem no celular ou no computador com um código; você vê o mapa da turma, os grupos para retomada e quais alternativas erradas mais apareceram.</p></section>
  <div class="grade2">
    <section class="cartao"><h2>Primeira vez</h2><p class="mini">Crie o seu <b>caderno</b>: ele guarda turmas, provas e resultados. Você recebe um código e uma chave para abrir em qualquer computador.</p>
      <div class="linha"><label>Nome do caderno<input id="n-cad" maxlength="40" placeholder="ex.: Prof. Ana · Escola X"></label></div><button class="btn pri" data-a="criar-cad">Criar caderno</button></section>
    <section class="cartao"><h2>Já tenho caderno</h2>
      <div class="linha"><label>Código<input id="e-cad" maxlength="6" class="codigo" autocapitalize="characters"></label><label>Chave<input id="e-chave" maxlength="8" class="codigo" autocapitalize="characters"></label></div>
      <button class="btn" data-a="abrir-cad">Abrir</button><p id="e-erro" class="erro"></p></section>
  </div>`;
}
async function criarCaderno(){
  const nome = ($('#n-cad').value || '').trim().slice(0, 40) || 'Meu caderno';
  for (let t = 0; t < 6; t++){
    const cad = gerarCad();
    if (await R.get(`saeb/c/${cad}/info`)) continue;
    const chave = gerarChave();
    await R.set(`saeb/k/${cad}`, chave);
    await R.set(`saeb/c/${cad}/donos/${R.uid}`, chave);
    await R.set(`saeb/c/${cad}/info`, {nome, criado:TS, dono:R.uid});
    modal(`<h2>Caderno criado! Anote:</h2><p>Para abrir em outro computador você vai precisar do <b>código</b> e da <b>chave</b>.</p>
      <div class="linha"><div class="caixa-cod"><div class="mini">Código</div><div class="codigo">${cad}</div></div><div class="caixa-cod"><div class="mini">Chave</div><div class="codigo">${chave}</div></div></div>
      <p class="aviso">⚠️ A chave não aparece de novo depois (só em “Caderno” → “Mostrar chave”, neste computador). Tire uma foto ou anote.</p><button class="btn pri" data-a="fechar">Entendi</button>`);
    return abrirCaderno(cad, chave);
  }
  toast('Não consegui criar agora. Tente de novo.');
}
async function abrirCaderno(cad, chave, auto){
  cad = limpar(cad, 6); chave = limpar(chave, 8);
  try {
    if (R.tipo === 'teste' && (await R.get(`saeb/k/${cad}`)) !== chave) throw {code:'PERMISSION_DENIED'};
    await R.set(`saeb/c/${cad}/donos/${R.uid}`, chave);
    const inf = await R.get(`saeb/c/${cad}/info`); if (!inf) throw new Error('nao');
  } catch(e){
    if (auto) return telaEntrada();
    $('#e-erro').textContent = msgErro(e) === 'permissao' ? 'Código ou chave errados.' : 'Caderno não encontrado ou sem internet.'; return;
  }
  CAD = cad; CHAVE = chave; gravarLS({cad, chave});
  if (desligarCad) desligarCad();
  desligarCad = R.on(`saeb/c/${cad}`, v => { D = v || {}; if (!TSEL || !(D.turmas||{})[TSEL]) TSEL = (turmas()[0]||{}).tid || null; desenhar(); });
  SEN = (await R.get(`saeb/s/${cad}`)) || {};
}

/* ---------------- estrutura ---------------- */
function desenhar(){
  if (!CAD) return;
  if (document.activeElement && document.activeElement.matches('input,textarea,select') && app.contains(document.activeElement) && ABA !== 'apl') return; // não atrapalha quem está digitando
  $('#cad-topo').innerHTML = `${esc((D.info||{}).nome||'')} · caderno <b class="codigo">${CAD}</b>`;
  const abas = [['turmas','👥 Turmas'],['apl','📝 Provas'],['res','📊 Resultados'],['banco','🗂️ Banco de questões'],['cad','⚙️ Caderno']];
  app.innerHTML = `<nav class="abas">${abas.map(([k, t]) => `<button class="btn ${ABA===k?'on':''}" data-aba="${k}">${t}</button>`).join('')}</nav><div id="aba"></div>`;
  ({turmas:abaTurmas, apl:abaApl, res:abaRes, banco:abaBanco, cad:abaCad})[ABA]();
}

/* ---------------- turmas ---------------- */
function abaTurmas(){
  const ts = turmas(), t = TSEL && D.turmas[TSEL];
  const al = t ? alunosDe(TSEL) : [];
  $('#aba').innerHTML = `<section class="cartao"><h2>Turmas</h2>
    <div class="linha">${ts.map(x => `<button class="btn ${x.tid===TSEL?'pri':''}" data-turma="${x.tid}">${esc(x.nome)} <span class="mini">${x.ano}º</span></button>`).join('') || '<span class="mini">Nenhuma turma ainda.</span>'}</div>
    <div class="linha"><label>Nova turma<input id="t-nome" maxlength="24" placeholder="ex.: 9º A"></label><label style="max-width:150px">Ano<select id="t-ano"><option value="5">5º ano</option><option value="9" selected>9º ano</option></select></label><button class="btn" data-a="nova-turma">+ Criar turma</button></div></section>
  ${t ? `<section class="cartao"><div class="linha" style="align-items:center"><h2 style="flex:1">${esc(t.nome)} <span class="mini">· ${t.ano}º ano · ${al.length} estudante(s)</span></h2>
      <button class="btn" data-a="cartoes">🖨️ Imprimir cartões com senha</button><button class="btn perigo peq" data-a="apagar-turma">Excluir turma</button></div>
    <div class="tab-w"><table class="t"><thead><tr><th>Estudante</th><th>Senha</th><th></th></tr></thead><tbody>
      ${al.map(a => `<tr><td>${esc(a.nome)}</td><td class="codigo">${esc(SEN[a.aid]||'—')}</td><td style="text-align:right"><button class="btn peq" data-senha="${a.aid}">Nova senha</button> <button class="btn peq" data-ren="${a.aid}">Renomear</button> <button class="btn peq perigo" data-rem="${a.aid}">Remover</button></td></tr>`).join('') || '<tr><td colspan="3" class="mini">Cole a lista abaixo para cadastrar.</td></tr>'}
    </tbody></table></div>
    <h3 style="margin-top:14px">Adicionar estudantes</h3><p class="mini">Cole um nome por linha (pode copiar da lista de chamada; números no começo são ignorados). Cada estudante recebe uma senha de 4 números.</p>
    <textarea id="t-lista" placeholder="Ana Beatriz&#10;Bruno Henrique&#10;…"></textarea><button class="btn pri" data-a="add-alunos">Cadastrar</button></section>` : ''}`;
}
async function novaTurma(){
  const nome = ($('#t-nome').value || '').trim().slice(0, 24); if (!nome) return toast('Digite o nome da turma.');
  const tid = 't' + Date.now().toString(36);
  await R.set(`saeb/c/${CAD}/turmas/${tid}`, {nome, ano:+$('#t-ano').value, criada:TS}); TSEL = tid;
}
async function addAlunos(){
  const nomes = ($('#t-lista').value || '').split('\n').map(l => l.replace(/^\s*\d+[\).\-:\s]*/, '').replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean);
  if (!nomes.length) return toast('Cole pelo menos um nome.');
  const exist = new Set(alunosDe(TSEL).map(a => a.nome.toLowerCase()));
  let n = 0;
  for (const nome of nomes){
    if (exist.has(nome.toLowerCase())) continue; exist.add(nome.toLowerCase());
    const aid = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), s = gerarSenha();
    await R.set(`saeb/s/${CAD}/${aid}`, s); SEN[aid] = s;
    await R.set(`saeb/c/${CAD}/alunos/${TSEL}/${aid}`, {nome}); n++;
  }
  toast(`${n} estudante(s) cadastrado(s).`);
}
function cartoes(){
  const t = D.turmas[TSEL], al = alunosDe(TSEL);
  const w = window.open('', '_blank'); if (!w) return toast('Permita janelas pop-up para imprimir.');
  w.document.write(`<!doctype html><meta charset="utf-8"><title>Cartões ${esc(t.nome)}</title><style>body{font-family:Arial,sans-serif;margin:10mm}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}.c{border:1.5px dashed #555;border-radius:8px;padding:5mm;break-inside:avoid}.c b{font-size:18px}.s{font:800 26px monospace;letter-spacing:4px}.m{font-size:11px;color:#444}</style>
  <h3>${esc(t.nome)} · cartões de acesso às provas</h3><div class="g">${al.map(a => `<div class="c"><b>${esc(a.nome)}</b><div class="m">${esc(t.nome)}</div><div class="m">Senha:</div><div class="s">${esc(SEN[a.aid]||'')}</div><div class="m">Site: ${esc(URL_ALUNO)}</div></div>`).join('')}</div><script>print()<\/script>`);
  w.document.close();
}

/* ---------------- provas (aplicações) ---------------- */
function abaApl(){
  const lista = apls(), ts = turmas();
  $('#aba').innerHTML = `${NOVA ? '' : `<section class="cartao"><div class="linha" style="align-items:center"><h2 style="flex:1">Provas</h2><button class="btn pri" data-a="nova-apl" ${ts.length?'':'disabled'}>+ Montar nova prova</button></div>
    ${ts.length ? '' : '<p class="aviso">Crie uma turma primeiro (aba Turmas).</p>'}
    <div class="tab-w"><table class="t"><thead><tr><th>Código</th><th>Prova</th><th>Turma</th><th>Data</th><th>Situação</th><th></th></tr></thead><tbody>
    ${lista.map(a => `<tr><td class="codigo">${a.pin}</td><td><b>${esc(a.titulo)}</b><div class="mini">${DISC[a.disc]} · ${TIPOS[a.tipo]} · ${(a.qs||[]).length} questões</div></td><td>${esc(a.turma||'')}</td><td>${dataBR(a.criada)}</td><td>${a.aberta?chip('ok','aberta'):chip('sd','fechada')}</td><td><button class="btn peq" data-apl="${a.pin}">Abrir</button></td></tr>`).join('') || '<tr><td colspan="6" class="mini">Nenhuma prova ainda.</td></tr>'}
    </tbody></table></div></section>`}
    <div id="montagem"></div>`;
  if (NOVA) desenharMontagem();
}
async function poolDe(disc, ano){
  const B = await banco(disc, ano);
  return B.lista.filter(usavel);
}
async function novaApl(){
  const t = turmas().find(x => x.tid === TSEL) || turmas()[0];
  NOVA = {tid:t.tid, disc:'mat', tipo:'diag', porD:2, sel:new Set(), qs:null, titulo:''};
  ABA = 'apl'; desenhar();
}
async function desenharMontagem(){
  const N = NOVA, t = D.turmas[N.tid], ano = t.ano, M = matriz(N.disc, ano);
  const pool = await poolDe(N.disc, ano);
  if (NOVA !== N || ABA !== 'apl') return;
  const cont = {}; pool.forEach(q => { const d = descDe(q); const c = cont[d] = cont[d] || {t:0, g:0}; c.t++; if (gabDe(q.id)) c.g++; });
  const el = $('#montagem'); if (!el) return;
  if (!N.qs){
    el.innerHTML = `<section class="cartao"><h2>Montar nova prova</h2>
      <div class="linha"><label>Turma<select id="m-turma">${turmas().map(x => `<option value="${x.tid}" ${x.tid===N.tid?'selected':''}>${esc(x.nome)} (${x.ano}º)</option>`).join('')}</select></label>
        <label>Disciplina<select id="m-disc"><option value="mat" ${N.disc==='mat'?'selected':''}>Matemática</option><option value="lp" ${N.disc==='lp'?'selected':''}>Língua Portuguesa</option></select></label>
        <label>Tipo<select id="m-tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}" ${N.tipo===k?'selected':''}>${v}</option>`).join('')}</select></label>
        <label style="max-width:170px">Questões por descritor<select id="m-por">${[1,2,3,4,5].map(n => `<option ${N.porD===n?'selected':''}>${n}</option>`).join('')}</select></label></div>
      <p class="mini">Diagnóstica e simulado: o estudante só vê o resultado quando você liberar a correção. Treino: ele vê se acertou a cada questão.</p>
      <div class="linha" style="align-items:center"><h3 style="flex:1">Descritores · ${M.nome}</h3><button class="btn peq" data-a="m-todos">Marcar todos</button><button class="btn peq" data-a="m-nenhum">Limpar</button></div>
      <p class="mini">Entre parênteses: questões <b>prontas</b> (com gabarito) / total no banco. Descritores sem questão prontas ainda podem ser usados: você marca o gabarito na hora.</p>
      ${M.temas.map(([tema, ds]) => `<h4 style="margin:12px 0 6px">${tema}</h4><div class="desc-ck">${ds.map(d => { const c = cont[d] || {t:0, g:0};
        return `<label title="${esc(M.d[d])}"><input type="checkbox" data-d="${d}" ${N.sel.has(d)?'checked':''} ${c.t?'':'disabled'}><span><b>${d}</b> ${esc(M.d[d])} <span class="mini">(${c.g}/${c.t})</span></span></label>`; }).join('')}</div>`).join('')}
      <div class="nav"><button class="btn" data-a="m-cancelar">Cancelar</button><button class="btn pri" data-a="m-montar">Montar prova →</button></div></section>`;
    el.querySelector('#m-turma').onchange = e => { N.tid = e.target.value; N.sel.clear(); desenharMontagem(); };
    el.querySelector('#m-disc').onchange = e => { N.disc = e.target.value; N.sel.clear(); desenharMontagem(); };
    el.querySelector('#m-tipo').onchange = e => N.tipo = e.target.value;
    el.querySelector('#m-por').onchange = e => N.porD = +e.target.value;
    el.querySelectorAll('[data-d]').forEach(c => c.onchange = () => c.checked ? N.sel.add(c.dataset.d) : N.sel.delete(c.dataset.d));
    return;
  }
  const B = await banco(N.disc, ano), falta = N.qs.filter(id => !N.gab[id]).length;
  if (NOVA !== N || !N.qs) return;
  el.innerHTML = `<section class="cartao"><h2>Revise a prova</h2>
    <div class="linha"><label>Título<input id="m-tit" value="${esc(N.titulo)}" maxlength="60"></label></div>
    <p class="mini">${N.qs.length} questões · ${esc(t.nome)} · ${DISC[N.disc]} · ${TIPOS[N.tipo]}. Use “Trocar” para sortear outra questão do mesmo descritor.</p>
    ${falta ? `<p class="aviso">⚠️ ${falta} questão(ões) ainda sem gabarito: toque na letra certa em cada uma. O gabarito fica salvo no seu caderno para as próximas provas.</p>` : ''}
    ${N.qs.map((id, i) => { const q = B.mapa[id], d = descDe(q);
      return `<div class="prev-q"><div class="cab"><b>${i+1}</b>${chip('sd', d)}<span class="mini" style="flex:1">${esc(descTexto(N.disc, ano, d)).slice(0, 90)}…</span>
        <span class="gab-ls" title="Gabarito">${[...'ABCD'].map(L => `<button data-mgab="${id}:${L}" class="${N.gab[id]===L?'on':''}">${L}</button>`).join('')}</span>
        <button class="btn peq" data-trocar="${i}">↻ Trocar</button><button class="btn peq perigo" data-tirar="${i}">✕</button></div>
        <div class="corpo">${enunciadoHtml(q)}<div class="alts">${[...'ABCD'].map(L => `<div class="alt"><b>${L}</b><div>${alternativaHtml(q, L)}</div></div>`).join('')}</div></div>
        <button class="btn fant peq" data-expandir>ver inteira</button></div>`; }).join('')}
    <div class="nav"><button class="btn" data-a="m-voltar">← Descritores</button><button class="btn pri" data-a="m-liberar" ${falta||!N.qs.length?'disabled':''}>Liberar para a turma ✔</button></div></section>`;
  el.querySelector('#m-tit').oninput = e => N.titulo = e.target.value;
}
async function montar(){
  const N = NOVA; if (!N.sel.size) return toast('Escolha pelo menos um descritor.');
  const ano = D.turmas[N.tid].ano, pool = await poolDe(N.disc, ano);
  const usadas = new Set(apls().filter(a => a.tid === N.tid).flatMap(a => a.qs || []));
  const nota = q => (gabDe(q.id) ? 0 : 2) + (usadas.has(q.id) ? 1 : 0) + Math.random();
  N.qs = []; N.gab = {};
  [...N.sel].sort((a, b) => ordD(a) - ordD(b)).forEach(d => {
    pool.filter(q => descDe(q) === d).sort((a, b) => nota(a) - nota(b)).slice(0, N.porD).forEach(q => { N.qs.push(q.id); if (gabDe(q.id)) N.gab[q.id] = gabDe(q.id); });
  });
  N.titulo = N.titulo || `${N.tipo==='diag'?'Diagnóstica':N.tipo==='sim'?'Simulado':'Treino'} de ${DISC[N.disc]} · ${new Date().toLocaleDateString('pt-BR')}`;
  desenharMontagem();
}
async function trocar(i){
  const N = NOVA, ano = D.turmas[N.tid].ano, B = await banco(N.disc, ano), d = descDe(B.mapa[N.qs[i]]);
  const op = (await poolDe(N.disc, ano)).filter(q => descDe(q) === d && !N.qs.includes(q.id));
  if (!op.length) return toast('Não há outra questão desse descritor.');
  op.sort((a, b) => (gabDe(a.id) ? 0 : 1) - (gabDe(b.id) ? 0 : 1) + (Math.random() - .5));
  const q = op[0]; N.qs[i] = q.id; if (gabDe(q.id)) N.gab[q.id] = gabDe(q.id);
  desenharMontagem();
}
async function liberar(){
  const N = NOVA, t = D.turmas[N.tid], B = await banco(N.disc, t.ano);
  let pin; for (let k = 0; k < 8; k++){ const p = gerarPin(); if (!(await R.get(`saeb/a/${p}/info`).catch(() => null))) { pin = p; break; } }
  if (!pin) return toast('Tente de novo.');
  const qd = N.qs.map(id => descDe(B.mapa[id])), gab = {}; N.qs.forEach((id, i) => gab['i'+i] = N.gab[id]);
  const titulo = (N.titulo || 'Prova').trim().slice(0, 60);
  const info = {cad:CAD, titulo, tid:N.tid, turma:t.nome, disc:N.disc, ano:t.ano, tipo:N.tipo, qs:N.qs, qd, aberta:true, correcao:false, criada:TS};
  for (const id of N.qs) if (N.gab[id] && N.gab[id] !== gabDe(id)) await R.update(`saeb/c/${CAD}/gab/${id}`, {g:N.gab[id]});
  await R.set(`saeb/a/${pin}/cad`, CAD);
  await R.set(`saeb/a/${pin}/info`, info);
  await R.set(`saeb/a/${pin}/gab`, gab);
  await R.set(`saeb/c/${CAD}/apl/${pin}`, {titulo, tid:N.tid, turma:t.nome, disc:N.disc, ano:t.ano, tipo:N.tipo, qs:N.qs, aberta:true, criada:TS});
  NOVA = null; desenhar(); abrirApl(pin);
}
/* ---------- detalhes de uma prova ---------- */
function abrirApl(pin){
  if (desligarApl) desligarApl();
  const a = D.apl[pin]; if (!a) return;
  const al = alunosDe(a.tid);
  const des = v => {
    if (!v || !v.info) return;
    const inf = v.info, n = inf.qs.length, rr = v.r || {}, gab = v.gab || {};
    const lin = al.map(x => { const r = rr[x.aid]; const f = r ? respostasDe(r) : null; const feitas = r ? Object.keys(r.r||{}).length : 0;
      const ac = r ? inf.qs.filter((_, i) => f(i) && f(i) === gab['i'+i]).length : 0;
      const st = !r ? '<span class="mini">não entrou</span>' : r.fim ? `<span class="feito">✔ entregou</span>${r.papel?' <span class="mini">(papel)</span>':''}` : `respondendo · ${feitas}/${n}`;
      return `<tr><td>${esc(x.nome)}</td><td>${st}</td><td>${r && (r.fim || feitas) ? `${ac}/${n} (${pct(ac, n)}%)` : ''}</td><td>${r && r.fim ? `<button class="btn peq" data-reabrir="${pin}:${x.aid}">Reabrir entrega</button>` : ''}</td></tr>`; }).join('');
    const entregues = al.filter(x => rr[x.aid] && rr[x.aid].fim).length;
    $('#modal-c').innerHTML = `<div class="linha" style="align-items:flex-start"><div style="flex:1"><p class="selo">${TIPOS[inf.tipo]} · ${DISC[inf.disc]} · ${inf.ano}º ano</p><h2>${esc(inf.titulo)}</h2><p class="mini">${esc(inf.turma)} · ${n} questões · criada em ${dataBR(inf.criada)}</p></div>
        <div class="caixa-cod"><div class="mini">Código para os estudantes</div><div class="codigo">${pin}</div><div class="mini">${esc(URL_ALUNO.replace(/^https?:\/\//,''))}</div></div></div>
      <div class="linha">${inf.aberta ? `<button class="btn" data-fechar-apl="${pin}">🔒 Fechar (não aceitar mais respostas)</button>` : `<button class="btn" data-abrir-apl="${pin}">🔓 Reabrir</button>`}
        ${inf.correcao ? `<button class="btn" data-corr="${pin}:0">🙈 Ocultar correção</button>` : `<button class="btn" data-corr="${pin}:1">👁️ Liberar correção para os estudantes</button>`}
        <button class="btn" data-papel="${pin}">✍️ Lançar respostas do papel</button><button class="btn" data-imprimir="${pin}">🖨️ Imprimir prova</button><button class="btn" data-ver-res="${pin}">📊 Resultado</button></div>
      <h3>Acompanhamento ao vivo <span class="mini">· ${entregues} de ${al.length} entregaram</span></h3>
      <div class="tab-w ao-vivo"><table class="t"><thead><tr><th>Estudante</th><th>Situação</th><th>Acertos</th><th></th></tr></thead><tbody>${lin || '<tr><td colspan="4">Sem estudantes na turma.</td></tr>'}</tbody></table></div>
      <div class="nav"><button class="btn perigo peq" data-apagar-apl="${pin}">Excluir prova e respostas</button><button class="btn pri" data-a="fechar">Fechar</button></div>`;
  };
  modal('<p class="carregando">Abrindo…</p>', true);
  desligarApl = R.on(`saeb/a/${pin}`, des);
}
async function marcarApl(pin, campo, val){
  await R.set(`saeb/a/${pin}/info/${campo}`, val);
  if (campo === 'aberta') await R.set(`saeb/c/${CAD}/apl/${pin}/aberta`, val);
}
async function lancarPapel(pin){
  if (desligarApl) { desligarApl(); desligarApl = null; }
  const v = await R.get(`saeb/a/${pin}`), inf = v.info, n = inf.qs.length, al = alunosDe(inf.tid), gab = v.gab || {};
  modal(`<h2>Lançar respostas do papel</h2><p class="mini">Digite a letra marcada por cada estudante (A, B, C ou D). Deixe vazio o que ficou em branco. O cursor anda sozinho.</p>
    <div class="tab-w papel"><table class="t"><thead><tr><th>Estudante</th>${inf.qs.map((_, i) => `<th>${i+1}</th>`).join('')}</tr></thead><tbody>
    ${al.map(x => { const f = respostasDe((v.r||{})[x.aid]); return `<tr data-al="${x.aid}"><td>${esc(x.nome)}</td>${inf.qs.map((_, i) => `<td><input maxlength="1" data-i="${i}" value="${f(i)||''}"></td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div><div class="nav"><button class="btn" data-a="fechar">Cancelar</button><button class="btn pri" data-salvar-papel="${pin}">Salvar</button></div>`, true);
  const ins = [...$('#modal-c').querySelectorAll('input[data-i]')];
  const cor = inp => { const i = inp.dataset.i, L = inp.value.toUpperCase(); inp.classList.toggle('ok', !!L && L === gab['i'+i]); inp.classList.toggle('no', !!L && L !== gab['i'+i]); };
  ins.forEach((inp, k) => { cor(inp); inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^ABCD]/g, ''); cor(inp); if (inp.value && ins[k+1]) ins[k+1].focus(); }; });
}
async function salvarPapel(pin){
  const rows = [...$('#modal-c').querySelectorAll('tr[data-al]')]; let n = 0;
  for (const tr of rows){
    const r = {}; tr.querySelectorAll('input[data-i]').forEach(inp => { if (inp.value) r['i'+inp.dataset.i] = inp.value; });
    if (!Object.keys(r).length) continue;
    await R.set(`saeb/a/${pin}/r/${tr.dataset.al}`, {r, fim:TS, papel:true}); n++;
  }
  toast(`Respostas de ${n} estudante(s) salvas.`); abrirApl(pin);
}
async function imprimir(pin){
  const v = await R.get(`saeb/a/${pin}`), inf = v.info, B = await banco(inf.disc, inf.ano);
  const w = window.open('', '_blank'); if (!w) return toast('Permita janelas pop-up para imprimir.');
  const qs = inf.qs.map(id => B.mapa[id]);
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(inf.titulo)}</title><style>body{font-family:Arial,sans-serif;font-size:14px;margin:12mm}h1{font-size:18px;margin:0}.cab{border:1.5px solid #333;padding:6px 10px;margin-bottom:10px}.q{break-inside:avoid;margin:0 0 14px}.q p{margin:0 0 6px;white-space:pre-wrap}.q img{max-width:100%;max-height:300px}.alt{display:flex;gap:6px;margin:3px 0}.alt p{margin:0}table{border-collapse:collapse}td{border:1px solid #777;padding:3px 6px}.gab{break-before:page}</style>
  <div class="cab"><h1>${esc(inf.titulo)}</h1><p>${DISC[inf.disc]} · ${inf.ano}º ano · ${esc(inf.turma)}</p><p>Nome: ______________________________________________ Data: ____/____/______</p></div>
  ${qs.map((q, i) => `<div class="q"><b>Questão ${i+1}</b>${blocos(q.p)}${[...'ABCD'].map(L => `<div class="alt"><b>(${L})</b><div>${blocos(q.o[L])}</div></div>`).join('')}</div>`).join('')}
  <div class="gab"><h1>Gabarito e descritores (professor)</h1><table><tr><th>Questão</th><th>Gabarito</th><th>Descritor</th></tr>${inf.qs.map((_, i) => `<tr><td>${i+1}</td><td><b>${(v.gab||{})['i'+i]||''}</b></td><td>${inf.qd[i]} – ${esc(descTexto(inf.disc, inf.ano, inf.qd[i]))}</td></tr>`).join('')}</table></div>
  <script>window.onload=()=>setTimeout(()=>print(),400)<\/script>`);
  w.document.close();
}

/* ---------------- resultados ---------------- */
async function abaRes(){
  const ts = turmas(); if (!RES.tid || !D.turmas[RES.tid]) RES.tid = (ts[0]||{}).tid || '';
  const lista = apls().filter(a => a.tid === RES.tid && a.disc === RES.disc);
  const pins = RES.pins ? lista.filter(a => RES.pins.has(a.pin)).map(a => a.pin) : lista.map(a => a.pin);
  $('#aba').innerHTML = `<section class="cartao nao-imprimir"><div class="linha"><label>Turma<select id="r-turma">${ts.map(t => `<option value="${t.tid}" ${t.tid===RES.tid?'selected':''}>${esc(t.nome)} (${t.ano}º)</option>`).join('')}</select></label>
      <label>Disciplina<select id="r-disc"><option value="mat" ${RES.disc==='mat'?'selected':''}>Matemática</option><option value="lp" ${RES.disc==='lp'?'selected':''}>Língua Portuguesa</option></select></label></div>
    <div class="linha">${lista.map(a => `<label style="flex:0 0 auto;flex-direction:row;align-items:center;font-weight:400"><input type="checkbox" data-rpin="${a.pin}" ${pins.includes(a.pin)?'checked':''}> ${esc(a.titulo)} <span class="mini">(${dataBR(a.criada)})</span></label>`).join('') || '<span class="mini">Nenhuma prova desta disciplina para a turma.</span>'}</div>
    <div class="linha"><button class="btn" data-a="csv" ${pins.length?'':'disabled'}>⬇ Exportar planilha (CSV)</button><button class="btn" data-a="imprimir-rel" ${pins.length?'':'disabled'}>🖨️ Imprimir relatório</button></div></section>
    <div id="rel">${pins.length ? '<p class="carregando">Calculando…</p>' : ''}</div>`;
  $('#r-turma') && ($('#r-turma').onchange = e => { RES.tid = e.target.value; RES.pins = null; abaRes(); });
  $('#r-disc').onchange = e => { RES.disc = e.target.value; RES.pins = null; abaRes(); };
  $('#aba').querySelectorAll('[data-rpin]').forEach(c => c.onchange = () => { RES.pins = new Set([...$('#aba').querySelectorAll('[data-rpin]:checked')].map(x => x.dataset.rpin)); abaRes(); });
  if (!pins.length) return;
  const dados = await Promise.all(pins.map(async pin => ({pin, ...(await R.get(`saeb/a/${pin}`) || {})})));
  const validos = dados.filter(x => x.info).sort((a, b) => (a.info.criada||0) - (b.info.criada||0));
  if (!validos.length) return;
  const t = D.turmas[RES.tid], ano = t.ano, B = await banco(RES.disc, ano), M = matriz(RES.disc, ano);
  validos.forEach(v => { v.info.qd = v.info.qs.map((id, i) => B.mapa[id] ? descDe(B.mapa[id]) : v.info.qd[i]); });
  const C = consolidar(validos), al = alunosDe(RES.tid), nomes = Object.fromEntries(al.map(a => [a.aid, a.nome]));
  const avaliados = Object.keys(C.alunos).filter(a => C.alunos[a].n);
  const tot = Object.values(C.desc).reduce((s, z) => ({ac:s.ac + z.ac, n:s.n + z.n}), {ac:0, n:0});
  const ds = Object.keys(C.desc).sort((a, b) => ordD(a) - ordD(b));
  const crit = ds.filter(d => faixa(pct(C.desc[d].ac, C.desc[d].n)) === 'crit');
  const cor = f => ({ok:'var(--ok)', med:'var(--med)', crit:'var(--crit)', sd:'var(--sd)'})[f];
  const porPior = [...ds].sort((a, b) => pct(C.desc[a].ac, C.desc[a].n) - pct(C.desc[b].ac, C.desc[b].n));
  /* grupos para retomada */
  const grupos = porPior.filter(d => pct(C.desc[d].ac, C.desc[d].n) < 70).map(d => {
    const quem = avaliados.map(aid => ({aid, z:C.alunos[aid].d[d]})).filter(x => x.z && x.z.n && pct(x.z.ac, x.z.n) < 50);
    return {d, p:pct(C.desc[d].ac, C.desc[d].n), quem};
  }).filter(g => g.quem.length);
  /* evolução */
  const evo = validos.length > 1 ? ds.map(d => ({d, v:validos.map(v => { const c = consolidar([v]).desc[d]; return c ? pct(c.ac, c.n) : null; })})) : null;
  $('#rel').innerHTML = `<section class="cartao"><p class="selo">${esc(t.nome)} · ${DISC[RES.disc]} · ${ano}º ano</p><h2>Visão geral</h2>
    <div class="resumo"><div><b>${avaliados.length}</b>estudantes avaliados</div><div><b>${validos.length}</b>prova(s)</div><div><b>${pct(tot.ac, tot.n) ?? '–'}%</b>acerto médio</div><div><b>${crit.length}</b>descritor(es) crítico(s)</div></div>
    <div class="legenda">${['ok','med','crit'].map(f => chip(f, FAIXA_TXT[f])).join('')}</div>
    <p class="mini">As faixas são do painel (porcentagem de acerto), não a escala de proficiência oficial do SAEB. Quanto mais questões por descritor, mais confiável o retrato.</p></section>

  <section class="cartao"><h2>Desempenho da turma por descritor</h2><p class="mini">Do mais difícil para o mais fácil. Entre parênteses: respostas corrigidas e número de questões diferentes.</p>
    ${porPior.map(d => { const z = C.desc[d], p = pct(z.ac, z.n), f = faixa(p);
      return `<div class="desc-lin"><span class="cod">${d}</span><span>${esc(M.d[d] || 'Questões sem descritor informado')} <span class="mini">(${z.n} respostas · ${z.itens} questão(ões))</span></span><span class="barra-w"><span class="barra-p"><i style="width:${p}%;background:${cor(f)}"></i></span> <b style="color:${cor(f)}">${p}%</b></span></div>`; }).join('')}</section>

  <section class="cartao"><h2>Mapa estudante × descritor</h2><p class="mini">Cada quadrinho mostra o acerto do estudante naquele descritor (acertos/questões). Passe o dedo ou o mouse sobre o código para ler o descritor.</p>
    <div class="tab-w"><table class="t mapa-calor"><thead><tr><th>Estudante</th><th>Geral</th>${ds.map(d => `<th class="dh" title="${d}: ${esc(M.d[d]||'')}">${d}</th>`).join('')}</tr></thead><tbody>
    ${avaliados.sort((a, b) => (nomes[a]||'').localeCompare(nomes[b]||'', 'pt')).map(aid => { const A = C.alunos[aid], pg = pct(A.ac, A.n);
      return `<tr><td class="nome">${esc(nomes[aid] || '(removido)')}</td><td class="c f-${faixa(pg)}">${pg}%</td>${ds.map(d => { const z = A.d[d]; if (!z) return '<td class="c f-sd">·</td>'; const p = pct(z.ac, z.n);
        return `<td class="c f-${faixa(p)}" title="${esc(nomes[aid]||'')} · ${d}: ${z.ac} de ${z.n}">${p}%<small>${z.ac}/${z.n}</small></td>`; }).join('')}</tr>`; }).join('')}
    </tbody></table></div>
    ${al.length > avaliados.length ? `<p class="mini">Ainda sem respostas: ${al.filter(a => !avaliados.includes(a.aid)).map(a => esc(a.nome)).join(', ')}.</p>` : ''}</section>

  <section class="cartao"><h2>Grupos para retomada</h2><p class="mini">Descritores com a turma abaixo de 70% e os estudantes que ficaram abaixo de 50% neles. ⚠️ indica que o estudante respondeu só 1 ou 2 questões do descritor: confirme com outra atividade.</p>
    ${grupos.map(g => `<div class="grupo ${g.p >= 50 ? 'med' : ''}"><b>${g.d}</b> · turma ${g.p}% — ${esc(M.d[g.d] || 'sem descritor')}<br>${g.quem.map(x => `${esc(nomes[x.aid] || '?')} <span class="mini">(${x.z.ac}/${x.z.n})${x.z.n < 3 ? ' ⚠️' : ''}</span>`).join(' · ')}</div>`).join('') || '<p>Nenhum grupo: a turma está acima de 70% em todos os descritores avaliados. 🎉</p>'}</section>

  ${evo ? `<section class="cartao"><h2>Evolução entre as provas</h2><div class="tab-w"><table class="t"><thead><tr><th>Descritor</th>${validos.map(v => `<th>${esc(v.info.titulo)}<div class="mini">${dataBR(v.info.criada)}</div></th>`).join('')}</tr></thead><tbody>
    ${evo.map(e => `<tr><td><b>${e.d}</b></td>${e.v.map(p => `<td>${p == null ? '<span class="mini">—</span>' : chip(faixa(p), p + '%')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` : ''}

  <section class="cartao"><h2>Análise das questões</h2><p class="mini">Em verde, a alternativa certa; em vermelho, a errada mais marcada. A alternativa errada mais escolhida mostra o raciocínio que a turma está usando: é o melhor ponto de partida para a retomada.</p>
    ${validos.map(v => { const its = C.itens.filter(x => x.pin === v.pin);
      return `<h3 style="margin:12px 0 4px">${esc(v.info.titulo)}</h3><div class="tab-w"><table class="t"><thead><tr><th>Nº</th><th>Descritor</th><th>Acerto</th><th>Alternativas</th><th>Atenção</th><th></th></tr></thead><tbody>
      ${its.map(it => { const tot = it.n || 0, err = [...'ABCD'].filter(L => L !== it.g).sort((a, b) => it.cont[b] - it.cont[a])[0], perr = pct(it.cont[err], tot), p = pct(it.ac, tot);
        const mx = Math.max(1, ...'ABCD'.split('').map(L => it.cont[L]));
        return `<tr><td>${it.i+1}</td><td>${chip('sd', it.d)}</td><td>${tot ? chip(faixa(p), p + '%') : '<span class="mini">—</span>'}</td>
          <td><div class="dist">${'ABCD'.split('').map(L => `<span class="${L===it.g?'g':(L===err && it.cont[L] && perr >= 25 ? 'top' : '')}" style="height:${4 + 30 * it.cont[L] / mx}px" title="${L}: ${it.cont[L]}"><em>${L}</em></span>`).join('')}</div></td>
          <td class="mini">${tot && it.cont[err] && perr >= 25 ? `${perr}% marcaram <b>${err}</b>` : ''}${it.br ? ` · ${it.br} em branco` : ''}</td><td><button class="btn peq" data-verq="${RES.disc}${ano}:${it.qid}:${v.pin}:${it.i}">Ver</button></td></tr>`; }).join('')}</tbody></table></div>`; }).join('')}</section>`;
  RES.ultimo = {validos, C, nomes, M, t};
}
function csv(){
  const U = RES.ultimo; if (!U) return;
  const linhas = [['Prova','Data','Estudante','Turma','Questão','Descritor','Marcada','Gabarito','Acertou']];
  U.validos.forEach(v => Object.entries(v.r || {}).forEach(([aid, rr]) => { const f = respostasDe(rr);
    v.info.qs.forEach((_, i) => { const m = f(i), g = (v.gab||{})['i'+i]; linhas.push([v.info.titulo, dataBR(v.info.criada), U.nomes[aid]||'', U.t.nome, i+1, v.info.qd[i], m||'', g||'', m ? (m===g?'Sim':'Não') : (rr.fim?'Em branco':'')]); }); }));
  const txt = '﻿' + linhas.map(l => l.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], {type:'text/csv;charset=utf-8'})); a.download = `saeb_${U.t.nome.replace(/\W+/g,'_')}_${RES.disc}.csv`; a.click();
}
async function verQuestao(arg){
  const [ch, qid, pin, i] = arg.split(':'), disc = ch.replace(/\d/g, ''), ano = +ch.replace(/\D/g, '');
  const B = await banco(disc, ano), q = B.mapa[qid], it = RES.ultimo && RES.ultimo.C.itens.find(x => x.pin === pin && x.i === +i);
  modal(`<h2>Questão ${+i+1} · ${descDe(q)}</h2><p class="mini">${esc(descTexto(disc, ano, descDe(q)))}</p>${enunciadoHtml(q)}
    <div class="alts">${[...'ABCD'].map(L => `<div class="alt ${it && L===it.g?'certa':''}"><b>${L}</b><div>${alternativaHtml(q, L)}</div>${it ? `<span class="chip" style="margin-left:auto">${it.cont[L]} (${pct(it.cont[L], it.n) ?? 0}%)</span>` : ''}</div>`).join('')}</div>
    <p class="mini">Fonte: ${esc(q.fonte)}</p><div class="nav"><button class="btn" data-a="fechar">Fechar</button></div>`, true);
}

/* ---------------- banco de questões ---------------- */
async function abaBanco(){
  const disc = BQ.chave.replace(/\d/g, ''), ano = +BQ.chave.replace(/\D/g, ''), M = matriz(disc, ano), B = await banco(disc, ano);
  let l = B.lista;
  if (BQ.desc) l = l.filter(q => descDe(q) === BQ.desc);
  if (BQ.st === 'prontas') l = l.filter(q => usavel(q) && gabDe(q.id));
  if (BQ.st === 'semgab') l = l.filter(q => usavel(q) && !gabDe(q.id));
  if (BQ.st === 'prob') l = l.filter(q => q.prob);
  if (BQ.st === 'off') l = l.filter(desligada);
  if (BQ.busca) { const b = BQ.busca.toLowerCase(); l = l.filter(q => JSON.stringify(q.p).toLowerCase().includes(b)); }
  const POR = 15, pags = Math.max(1, Math.ceil(l.length / POR)); BQ.pag = Math.min(BQ.pag, pags - 1);
  const ver = l.slice(BQ.pag * POR, BQ.pag * POR + POR);
  const ativos = B.lista.filter(usavel), prontas = ativos.filter(q => gabDe(q.id)).length;
  $('#aba').innerHTML = `<section class="cartao"><h2>Banco de questões</h2>
    <p class="mini">${B.lista.length} questões neste banco · <b>${prontas}</b> prontas (com gabarito) · ${ativos.length - prontas} sem gabarito · ${B.lista.filter(q => q.prob).length} com defeito da importação (desativadas).</p>
    <div class="linha"><label>Banco<select id="b-ch">${['mat5','lp5','mat9','lp9'].map(k => `<option value="${k}" ${BQ.chave===k?'selected':''}>${matriz(k.replace(/\d/g,''), +k.replace(/\D/g,'')).nome}</option>`).join('')}</select></label>
      <label>Descritor<select id="b-desc"><option value="">Todos</option>${[...Object.keys(M.d), '?'].map(d => `<option value="${d}" ${BQ.desc===d?'selected':''}>${d === '?' ? 'Sem descritor' : d + ' · ' + esc(M.d[d]).slice(0, 60)}</option>`).join('')}</select></label>
      <label>Situação<select id="b-st">${[['todas','Todas'],['prontas','Prontas'],['semgab','Sem gabarito'],['prob','Com defeito'],['off','Desativadas por mim']].map(([k, v]) => `<option value="${k}" ${BQ.st===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <label>Buscar no texto<input id="b-busca" value="${esc(BQ.busca)}" placeholder="palavra do enunciado"></label></div>
    <p class="mini">${l.length} encontrada(s). Toque na letra para gravar o gabarito; mude o descritor se estiver errado. As correções valem para o seu caderno.</p>
    ${ver.map(q => { const g = gabDe(q.id), o = origemGab(q.id), d = descDe(q);
      return `<div class="prev-q"><div class="cab">${q.prob ? chip('crit', 'defeito: ' + q.prob.join(', ')) : desligada(q) ? chip('sd', 'desativada') : g ? chip('ok', o === 'prof' ? 'gabarito seu' : 'gabarito do banco') : chip('med', 'sem gabarito')}
        <select data-bdesc="${q.id}">${[...Object.keys(M.d), '?'].map(x => `<option value="${x}" ${d===x?'selected':''}>${x === '?' ? 'sem descritor' : x}</option>`).join('')}</select>
        <span class="mini" style="flex:1">${esc(q.fonte)}</span>
        ${q.prob ? '' : `<span class="gab-ls">${[...'ABCD'].map(L => `<button data-bgab="${q.id}:${L}" class="${g===L?'on':''}">${L}</button>`).join('')}</span>`}
        <button class="btn peq" data-boff="${q.id}">${desligada(q) ? 'Reativar' : 'Desativar'}</button></div>
        <div class="corpo">${enunciadoHtml(q)}<div class="alts">${[...'ABCD'].map(L => q.o[L] ? `<div class="alt ${g===L?'certa':''}"><b>${L}</b><div>${alternativaHtml(q, L)}</div></div>` : '').join('')}</div></div>
        <button class="btn fant peq" data-expandir>ver inteira</button></div>`; }).join('')}
    <div class="nav"><button class="btn" data-bpag="-1" ${BQ.pag===0?'disabled':''}>← Anteriores</button><span class="mini">página ${BQ.pag+1} de ${pags}</span><button class="btn" data-bpag="1" ${BQ.pag>=pags-1?'disabled':''}>Próximas →</button></div></section>`;
  $('#b-ch').onchange = e => { BQ.chave = e.target.value; BQ.desc = ''; BQ.pag = 0; abaBanco(); };
  $('#b-desc').onchange = e => { BQ.desc = e.target.value; BQ.pag = 0; abaBanco(); };
  $('#b-st').onchange = e => { BQ.st = e.target.value; BQ.pag = 0; abaBanco(); };
  $('#b-busca').onchange = e => { BQ.busca = e.target.value.trim(); BQ.pag = 0; abaBanco(); };
  $('#aba').querySelectorAll('[data-bdesc]').forEach(s => s.onchange = () => R.update(`saeb/c/${CAD}/gab/${s.dataset.bdesc}`, {desc:s.value}).then(() => toast('Descritor salvo.')));
}
async function gravarGab(qid, L){
  await R.update(`saeb/c/${CAD}/gab/${qid}`, {g:L});
  /* atualiza o gabarito das provas que já usaram a questão */
  for (const a of apls()) { const i = (a.qs || []).indexOf(qid); if (i >= 0) await R.set(`saeb/a/${a.pin}/gab/i${i}`, L); }
  toast('Gabarito salvo.');
}

/* ---------------- caderno ---------------- */
function abaCad(){
  $('#aba').innerHTML = `<section class="cartao"><h2>${esc((D.info||{}).nome || 'Caderno')}</h2>
    <p>Para abrir este caderno em outro computador use:</p><div class="linha"><div class="caixa-cod"><div class="mini">Código</div><div class="codigo">${CAD}</div></div><div class="caixa-cod"><div class="mini">Chave</div><div class="codigo" id="ch">••••••••</div></div><button class="btn" data-a="mostrar-chave">Mostrar chave</button></div>
    <p class="mini">Guarde a chave em lugar seguro: quem tiver código e chave vê as turmas e os resultados.</p>
    <button class="btn" data-a="sair-cad">Sair deste computador</button></section>
    <section class="cartao"><h2>Como usar</h2><ol>
      <li><b>Turmas:</b> crie a turma e cole a lista de estudantes. Imprima os cartões com as senhas.</li>
      <li><b>Provas:</b> escolha os descritores e quantas questões de cada um. Revise, marque o gabarito que faltar e libere.</li>
      <li>Mostre o <b>código de 5 letras</b> no quadro. Os estudantes entram em <b>${esc(URL_ALUNO.replace(/^https?:\/\//,''))}</b> (ou digitam o código na página inicial do site), tocam no nome e digitam a senha.</li>
      <li>Sem computadores para todos? <b>Imprima a prova</b> e depois use <b>Lançar respostas do papel</b>.</li>
      <li><b>Resultados:</b> veja a turma por descritor, o mapa de cada estudante, os grupos para retomada, a evolução e as alternativas erradas mais marcadas.</li></ol>
      <p class="mini">Matriz de Referência do SAEB (Prova Brasil): Língua Portuguesa D1–D15 (5º) e D1–D21 (9º); Matemática D1–D28 (5º) e D1–D37 (9º).</p></section>`;
}

/* ---------------- cliques ---------------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const ds = b.dataset;
  try {
    if (ds.a === 'criar-cad') return criarCaderno();
    if (ds.a === 'abrir-cad') return abrirCaderno($('#e-cad').value, $('#e-chave').value);
    if (ds.a === 'fechar') return fecharModal();
    if (ds.aba) { ABA = ds.aba; if (ABA !== 'apl') NOVA = null; return desenhar(); }
    if (ds.turma) { TSEL = ds.turma; return desenhar(); }
    if (ds.a === 'nova-turma') return novaTurma();
    if (ds.a === 'add-alunos') return addAlunos();
    if (ds.a === 'cartoes') return cartoes();
    if (ds.a === 'apagar-turma') { if (confirm('Excluir a turma e a lista de estudantes? As provas já feitas continuam guardadas.')) { await R.remove(`saeb/c/${CAD}/alunos/${TSEL}`); await R.remove(`saeb/c/${CAD}/turmas/${TSEL}`); TSEL = null; } return; }
    if (ds.senha) { const s = gerarSenha(); await R.set(`saeb/s/${CAD}/${ds.senha}`, s); SEN[ds.senha] = s; toast('Nova senha: ' + s); return desenhar(); }
    if (ds.ren) { const n = prompt('Novo nome:', D.alunos[TSEL][ds.ren].nome); if (n && n.trim()) await R.update(`saeb/c/${CAD}/alunos/${TSEL}/${ds.ren}`, {nome:n.trim().slice(0, 40)}); return; }
    if (ds.rem) { if (confirm('Remover este estudante da turma?')) { await R.remove(`saeb/c/${CAD}/alunos/${TSEL}/${ds.rem}`); await R.remove(`saeb/s/${CAD}/${ds.rem}`); } return; }
    if (ds.a === 'nova-apl') return novaApl();
    if (ds.a === 'm-todos') { $('#montagem').querySelectorAll('[data-d]:not(:disabled)').forEach(c => { c.checked = true; NOVA.sel.add(c.dataset.d); }); return; }
    if (ds.a === 'm-nenhum') { NOVA.sel.clear(); return desenharMontagem(); }
    if (ds.a === 'm-cancelar') { NOVA = null; return desenhar(); }
    if (ds.a === 'm-montar') return montar();
    if (ds.a === 'm-voltar') { NOVA.qs = null; return desenharMontagem(); }
    if (ds.a === 'm-liberar') { b.disabled = true; return liberar(); }
    if (ds.mgab) { const [id, L] = ds.mgab.split(':'); NOVA.gab[id] = L; return desenharMontagem(); }
    if (ds.trocar != null) return trocar(+ds.trocar);
    if (ds.tirar != null) { NOVA.qs.splice(+ds.tirar, 1); return desenharMontagem(); }
    if (ds.expandir != null) { const c = b.parentElement.querySelector('.corpo'); c.classList.toggle('aberto'); b.textContent = c.classList.contains('aberto') ? 'recolher' : 'ver inteira'; return; }
    if (ds.apl) return abrirApl(ds.apl);
    if (ds.fecharApl) return marcarApl(ds.fecharApl, 'aberta', false);
    if (ds.abrirApl) return marcarApl(ds.abrirApl, 'aberta', true);
    if (ds.corr) { const [p, v] = ds.corr.split(':'); return marcarApl(p, 'correcao', v === '1'); }
    if (ds.reabrir) { const [p, aid] = ds.reabrir.split(':'); return R.remove(`saeb/a/${p}/r/${aid}/fim`); }
    if (ds.papel) return lancarPapel(ds.papel);
    if (ds.salvarPapel) return salvarPapel(ds.salvarPapel);
    if (ds.imprimir) return imprimir(ds.imprimir);
    if (ds.verRes) { const a = D.apl[ds.verRes]; RES = {tid:a.tid, disc:a.disc, pins:new Set([ds.verRes])}; fecharModal(); ABA = 'res'; return desenhar(); }
    if (ds.apagarApl) { if (confirm('Excluir esta prova e todas as respostas? Não dá para desfazer.')) { await R.remove(`saeb/a/${ds.apagarApl}`); await R.remove(`saeb/c/${CAD}/apl/${ds.apagarApl}`); fecharModal(); } return; }
    if (ds.a === 'csv') return csv();
    if (ds.a === 'imprimir-rel') return print();
    if (ds.verq) return verQuestao(ds.verq);
    if (ds.bgab) { const [id, L] = ds.bgab.split(':'); await gravarGab(id, L); return abaBanco(); }
    if (ds.boff) { const off = !desligada({id:ds.boff}); await R.update(`saeb/c/${CAD}/gab/${ds.boff}`, {off}); return abaBanco(); }
    if (ds.bpag) { BQ.pag += +ds.bpag; abaBanco(); return window.scrollTo(0, 0); }
    if (ds.a === 'mostrar-chave') { $('#ch').textContent = CHAVE; return; }
    if (ds.a === 'sair-cad') { if (confirm('Sair do caderno neste computador? Para voltar, você vai precisar do código e da chave.')) { try { localStorage.removeItem(LS); } catch(_){} if (desligarCad) desligarCad(); CAD = null; D = {}; telaEntrada(); } return; }
  } catch(err){ console.error(err); toast(msgErro(err) === 'permissao' ? 'Sem permissão para essa ação.' : 'Não consegui salvar. Verifique a internet.'); }
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharModal(); });
iniciar();
