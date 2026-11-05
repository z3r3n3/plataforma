/* =========================================================
   QUIZ STE — camada de rede
   Usa o Firebase Realtime Database quando quiz/config.js está preenchido.
   Com ?teste=1 na URL, usa um "banco" local (abas do mesmo navegador)
   só para testar o jogo sem internet.
   ========================================================= */
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const TS = {'.sv':'timestamp'};   // marcador de "hora do servidor"

export async function conectar(){
  const teste = new URLSearchParams(location.search).has('teste');
  if (teste) return redeLocal();
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) throw new Error('sem-config');
  return redeFirebase(cfg);
}

/* ---------------- Firebase ---------------- */
async function redeFirebase(cfg){
  const {initializeApp} = await import(FB+'firebase-app.js');
  const {getAuth, signInAnonymously, onAuthStateChanged} = await import(FB+'firebase-auth.js');
  const D = await import(FB+'firebase-database.js');
  const app = initializeApp(cfg);
  const auth = getAuth(app);
  const db = D.getDatabase(app);
  const user = await new Promise((ok, erro)=>{
    const sair = onAuthStateChanged(auth, u=>{ if(u){ sair(); ok(u); } });
    signInAnonymously(auth).catch(erro);
  });
  let offset = 0;
  D.onValue(D.ref(db,'.info/serverTimeOffset'), s=>{ offset = s.val()||0; });
  const conectadoCbs = new Set();
  D.onValue(D.ref(db,'.info/connected'), s=>{ const v=!!s.val(); conectadoCbs.forEach(cb=>cb(v)); });
  const r = p => D.ref(db, p);
  const conv = v => JSON.parse(JSON.stringify(v), (k,x)=> (x && x['.sv']==='timestamp') ? D.serverTimestamp() : x);
  return {
    tipo:'firebase', uid:user.uid,
    agora:()=>Date.now()+offset,
    set:(p,v)=>D.set(r(p), conv(v)),
    update:(p,v)=>D.update(r(p), conv(v)),
    remove:(p)=>D.remove(r(p)),
    get:async(p)=>(await D.get(r(p))).val(),
    on:(p,cb)=>D.onValue(r(p), s=>cb(s.val())),
    aoConectar:(cb)=>{ conectadoCbs.add(cb); return ()=>conectadoCbs.delete(cb); },
    pushChave:(p)=>D.push(r(p)).key,
    salasVelhas:async(ms)=>{
      try{
        const q=D.query(r('salas'), D.orderByChild('criadaEm'), D.endAt(Date.now()+offset-ms), D.limitToFirst(20));
        return Object.keys((await D.get(q)).val()||{});
      }catch(e){ return []; }
    }
  };
}

/* ---------------- Local (teste) ---------------- */
function redeLocal(){
  const CH='quizSTE.teste.db';
  const canal = ('BroadcastChannel' in window) ? new BroadcastChannel(CH) : null;
  let uid = sessionStorage.getItem('quizSTE.teste.uid');
  if(!uid){ uid='u'+Math.random().toString(36).slice(2,10); sessionStorage.setItem('quizSTE.teste.uid',uid); }
  const ler=()=>{ try{ return JSON.parse(localStorage.getItem(CH))||{}; }catch(e){ return {}; } };
  const gravar=(db)=>{ localStorage.setItem(CH, JSON.stringify(db)); avisar(); if(canal) canal.postMessage(1); };
  const partes=p=>p.split('/').filter(Boolean);
  const pegar=(db,p)=>partes(p).reduce((o,k)=>o==null?undefined:o[k], db);
  const resolver=v=>JSON.parse(JSON.stringify(v), (k,x)=> (x && x['.sv']==='timestamp') ? Date.now() : x);
  function colocar(db,p,v){ const ks=partes(p); let o=db; ks.slice(0,-1).forEach(k=>{ if(typeof o[k]!=='object'||o[k]===null) o[k]={}; o=o[k]; });
    const u=ks[ks.length-1]; if(v===null||v===undefined) delete o[u]; else o[u]=v; }
  const ouvintes=new Set();
  function avisar(){ const db=ler(); ouvintes.forEach(o=>{ const v=pegar(db,o.p); const s=JSON.stringify(v===undefined?null:v); if(s!==o.ult){ o.ult=s; o.cb(v===undefined?null:JSON.parse(s)); } }); }
  if(canal) canal.onmessage=avisar;
  window.addEventListener('storage', e=>{ if(e.key===CH) avisar(); });
  return {
    tipo:'teste', uid, agora:()=>Date.now(),
    set:async(p,v)=>{ const db=ler(); colocar(db,p,resolver(v)); gravar(db); },
    update:async(p,obj)=>{ const db=ler(); Object.entries(resolver(obj)).forEach(([k,v])=>colocar(db,(p?p+'/':'')+k,v)); gravar(db); },
    remove:async(p)=>{ const db=ler(); colocar(db,p,null); gravar(db); },
    get:async(p)=>{ const v=pegar(ler(),p); return v===undefined?null:v; },
    on:(p,cb)=>{ const o={p,cb,ult:undefined}; ouvintes.add(o); setTimeout(avisar,0); return ()=>ouvintes.delete(o); },
    aoConectar:(cb)=>{ setTimeout(()=>cb(true),0); return ()=>{}; },
    pushChave:()=>'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    salasVelhas:async()=>[]
  };
}
