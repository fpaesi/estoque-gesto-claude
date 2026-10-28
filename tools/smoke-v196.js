// Teste sem login da v196 (conferir compras): app inteiro no jsdom + Firebase falso.
//   node smoke.js [arquivo.html]
require('fake-indexeddb/auto');
const fs=require('fs'),assert=require('assert');
const {JSDOM}=require('jsdom');
const arquivo=process.argv[2]||'index.html';
let html=fs.readFileSync(arquivo,'utf8');
html=html.replace(/<script src="[^"]*firebase[^"]*"><\/script>/g,'');
const stub=`<script>
window.matchMedia=window.matchMedia||(q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
window.__store=new Map();window.__uploads={};
const clone=o=>o===undefined?undefined:JSON.parse(JSON.stringify(o));
function deepMerge(a,b){if(!a||typeof a!=='object'||Array.isArray(a)||!b||typeof b!=='object'||Array.isArray(b))return b;const o={...a};for(const k in b)o[k]=(k in a)?deepMerge(a[k],b[k]):b[k];return o;}
function snap(path){const has=__store.has(path);return {exists:has,id:path.split('/').pop(),data:()=>clone(__store.get(path)),get:k=>(__store.get(path)||{})[k]};}
function docRef(path){return {id:path.split('/').pop(),path,
  get:async()=>snap(path),
  set:async(d,o)=>{const v=clone(d);__store.set(path,o&&o.merge?deepMerge(__store.get(path)||{},v):v);},
  update:async(...a)=>{const cur=clone(__store.get(path)||{});
    if(a[0] instanceof FP){const [k1,k2]=a[0].parts;if(a[1]&&a[1].__del){if(cur[k1])delete cur[k1][k2];}else{cur[k1]=cur[k1]||{};cur[k1][k2]=a[1];}}
    else for(const k in a[0]){const ps=k.split('.');let o=cur;for(let i=0;i<ps.length-1;i++){o[ps[i]]=o[ps[i]]||{};o=o[ps[i]];}o[ps.at(-1)]=clone(a[0][k]);}
    __store.set(path,cur);},
  delete:async()=>{__store.delete(path);},
  collection:n=>colRef(path+'/'+n),onSnapshot:()=>()=>{}};}
function colRef(path){const q={doc:id=>docRef(path+'/'+(id||Math.random().toString(36).slice(2))),
  get:async()=>{const docs=[...__store.keys()].filter(k=>k.startsWith(path+'/')&&k.slice(path.length+1).indexOf('/')<0).map(k=>({...snap(k),ref:docRef(k)}));return {docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f)};},
  where:()=>q,orderBy:()=>q,limit:()=>q,onSnapshot:()=>()=>{},add:async d=>{const r=q.doc();await r.set(d);return r;}};return q;}
class FP{constructor(...p){this.parts=p;}}
const fs_={collection:colRef,batch:()=>{const ops=[];return {set:(r,d,o)=>ops.push(()=>r.set(d,o)),update:(r,d)=>ops.push(()=>r.update(d)),delete:r=>ops.push(()=>r.delete()),commit:async()=>{for(const f of ops)await f();}};},
  runTransaction:async fn=>fn({get:r=>r.get(),update:(r,d)=>r.update(d),set:(r,d,o)=>r.set(d,o)}),settings:()=>{},enablePersistence:async()=>{}};
const firestoreFn=()=>fs_;firestoreFn.FieldValue={delete:()=>({__del:true}),increment:n=>n,serverTimestamp:()=>Date.now(),arrayUnion:(...a)=>a};firestoreFn.FieldPath=FP;
window.firebase={apps:[],initializeApp:()=>({}),app:()=>({}),firestore:firestoreFn,
  auth:()=>({onAuthStateChanged:cb=>{window.__authCb=cb;return()=>{};},signOut:async()=>{},currentUser:null}),
  storage:()=>({ref:p=>{const r={child:c=>firebase.storage().ref((p?p+'/':'')+c),put:async b=>{__uploads[p]=b.size;},getDownloadURL:async()=>'https://fake.storage/'+p,delete:async()=>{}};return r;}}),
  functions:()=>({httpsCallable:()=>async()=>({data:{}})})};
<\/script>`;
html=html.replace('<head>','<head>'+stub);
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://fpaesi.github.io/estoque-gesto-claude/'});
const w=dom.window;
w.indexedDB=indexedDB;w.HTMLMediaElement.prototype.play=async()=>{};w.HTMLMediaElement.prototype.pause=()=>{};
w.URL.createObjectURL=()=>'blob:fake';
const erros=[];w.addEventListener('error',e=>erros.push(e.message));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
  await sleep(300);
  const E=s=>w.eval(s);
  // sessão de gestor e base mínima (ficha real da Polpetini, 28/10/2026)
  E(`firebaseReady=true;currentUser={uid:'u1',email:'fabio@gesto.cc'};currentUserRole='admin';currentUserNome='Fabio';
     storage=firebase.storage();db=firebase.firestore();
     appConfirm=(m,o,ok)=>ok&&ok();
     aplicarCatalogo([
      {cod:'5463189',nome:'ALMÔNDEGA POLPETINI 150g',grupo:'Processados Cozinha',unidade:'UN'},
      {cod:'5265153',nome:'CARNE MOÍDA 1ª',grupo:'Carnes',unidade:'KG'},
      {cod:'5265234',nome:'FARINHA FLOCADA PANKO 1kg',grupo:'Secos',unidade:'KG'},
      {cod:'5265332',nome:'OVO BANDEJA 20un = 1,2kg',grupo:'Ovos',unidade:'KG'},
      {cod:'5265357',nome:'PIMENTA DO REINO 500g',grupo:'Temperos',unidade:'KG'},
      {cod:'5265382',nome:'QUEIJO PARMESÃO',grupo:'Laticínios',unidade:'KG'},
      {cod:'5265415',nome:'SAL MARINHO 1kg',grupo:'Temperos',unidade:'KG'},
      {cod:'5362159',nome:'CEBOLA',grupo:'Hortifruti',unidade:'KG'},
      {cod:'5375538',nome:'SALSINHA',grupo:'Hortifruti',unidade:'KG'}],{},Date.now(),{});
     ESTOQUE_SAIPOS={'5265153':{custoMedio:40},'5265332':{custoMedio:12},'5265234':{custoMedio:30},'5265382':{custoMedio:90},'5265357':{custoMedio:80},'5265415':{custoMedio:8},'5362159':{custoMedio:6},'5375538':{custoMedio:20}};`);
  w.__store.set('fichas_saipos/5463189',{yield:27,ingredientes:[
    {cod:'5265153',qtt:3},{cod:'5265234',qtt:0.45},{cod:'5265332',qtt:0.36},{cod:'5265357',qtt:0.005},
    {cod:'5265382',qtt:0.45},{cod:'5265415',qtt:0.05},{cod:'5362159',qtt:0.24},{cod:'5375538',qtt:0.02}],nome:'ALMÔNDEGA POLPETINI 150g'});
  w.__store.set('gestao/ultimo_custo',{itens:{'5265153':{custo:42.5},'5265332':{custo:12,suspeito:false}}});

  w.__store.set('gestao/ultimo_custo',{itens:{
    '5265153':{custo:42.5},
    '5362159':{custo:6,un:'KG',suspeito:true,motivo:'custo 12.00 × mediana 6.00',referencia:'mediana',ultimaCompra:{custo:12,data:'2026-10-23',nf:'9175',fornecedor:'COMERCIO DE PRODUTOS ALIMENTICIOS JNRG'}}}});
  E(`aplicarCatalogo(CATALOGO.concat([{cod:'5275000',nome:'TOMATE CEREJA',grupo:'Hortifruti',unidade:'KG'}]),{},Date.now(),{})`);
  // padrões vindos da função
  w.__store.set('padroes_nf/a1',{id:'a1',raiz:'08397041',fornecedor:'COMERCIO DE PRODUTOS ALIMENTICIOS JNRG',cod:'5375538',nome:'SALSINHA',un:'KG',
    desc:'TEMPERO VERDE UN',unCompra:'un',gramatura:null,divergente:false,historico:{compras:18,fatores:{'0.15':18},moda:0.15,modaN:18,ultima:'2026-10-23'},
    sugestao:{porUn:0.15,origem:'historico'},status:'a_conferir',porUn:0.15,origem:'historico',manual:false});
  w.__store.set('padroes_nf/a2',{id:'a2',raiz:'93015006',fornecedor:'Loja Zaffari Expo',cod:'5362161',nome:'ESPINAFRE',un:'KG',
    desc:'ESPINAFRE ORGANICO',unCompra:'maço',historico:{compras:1,fatores:{'0.1':1},moda:0.1,modaN:1,ultima:'2026-09-11'},
    sugestao:{porUn:0.1,origem:'historico'},status:'pesar',porUn:null,origem:'historico',manual:false});
  w.__store.set('padroes_nf/a3',{id:'a3',raiz:'93015006',fornecedor:'Loja Zaffari Expo',cod:'5275000',nome:'TOMATE CEREJA',un:'KG',
    desc:'TOMATE GRAPE 500G',unCompra:'emb',gramatura:0.5,divergente:false,historico:{compras:3,fatores:{'0.5':2,'0.18':1},moda:0.5,modaN:2,ultima:'2026-10-20'},
    sugestao:{porUn:0.5,origem:'rotulo'},status:'confirmado',porUn:0.5,origem:'rotulo',manual:false});
  w.__store.set('gestao/padroes_alertas',{geradoEm:Date.now(),alertas:[{chave:'a3|8146|0.18',id:'a3',cod:'5275000',nome:'TOMATE CEREJA',un:'KG',
    fornecedor:'Loja Zaffari Expo',desc:'TOMATE GRAPE 500G',nf:'8146',data:'2026-10-20',qi:2,unCompra:'emb',fatorNota:0.18,padrao:0.5,
    qtdNota:0.36,qtdCerta:1,custoNota:55.5,custoCerto:19.98,impacto:12.79}]});

  E(`gestaoTabId='receitas'`);
  const g=w.document.createElement('div');w.document.body.appendChild(g);
  E(`renderGestao`)(g);await sleep(100);
  // 1) aba Conferir compras
  const chip=[...g.querySelectorAll('[data-rgt]')].find(x=>x.dataset.rgt==='compras');
  assert.ok(chip,'chip Conferir compras');chip.click();await sleep(150);
  const t=g.textContent;
  assert.ok(t.includes('Custos a conferir (2)'),'2 custos a conferir: '+t.slice(0,400));
  assert.ok(t.includes('NF 8146')&&t.includes('NF 9175'),'as duas notas');
  assert.ok(t.includes('0,18')&&t.includes('estoque inflado')===false&&t.includes('estoque faltando'),'tomate: 0,36 kg lançado, 1 kg certo → faltando');
  assert.ok(t.includes('A conferir (1)')&&t.includes('Pesar (1)')&&t.includes('Confirmados (1)'),'contagem por status');
  assert.ok(t.includes('JNRG · TEMPERO VERDE UN')&&t.includes('0,15 kg'),'linha da salsinha');

  // 2) Erro na nota → grava conferência e some da lista
  const bErro=[...g.querySelectorAll('[data-cc-dec="erro"]')].find(b=>b.closest('.pcard').textContent.includes('8146'));
  bErro.click();await sleep(100);
  const cf=w.__store.get('conferencias_custo/5275000_8146');
  assert.ok(cf&&cf.decisao==='erro'&&cf.tipo==='fator'&&cf.por==='u1'&&cf.chave==='a3|8146|0.18','conferência gravada: '+JSON.stringify(cf));
  assert.ok(g.textContent.includes('Custos a conferir (1)'),'saiu da lista');
  // Compra correta na cebola
  g.querySelector('[data-cc-dec="correta"]').click();await sleep(100);
  assert.strictEqual(w.__store.get('conferencias_custo/5362159_9175').decisao,'correta');
  assert.ok(g.textContent.includes('Nenhuma compra pendente'),'lista zerada');

  // 3) confirmar padrão pesando
  g.querySelector('[data-pnf-id="a1"]').click();await sleep(50);
  const sh=w.document.querySelector('.sheet-dinamico');assert.ok(sh,'abriu a folha');
  const set=(s,v)=>{const i=sh.querySelector(s);i.value=v;i.dispatchEvent(new w.Event('input'));};
  set('#pp-n','5');set('#pp-t','0,8');
  assert.strictEqual(sh.querySelector('#pp-v').value,'0,16','média 0,16');
  sh.querySelector('#pp-uc').value='maço';
  sh.querySelector('#pp-ok').click();await sleep(100);
  const a1=w.__store.get('padroes_nf/a1');
  assert.ok(a1.status==='confirmado'&&a1.porUn===0.16&&a1.origem==='pesagem'&&a1.manual===true&&a1.unCompra==='maço'&&a1.amostra.n===5,'padrão pesado: '+JSON.stringify(a1));
  assert.strictEqual(a1.desc,'TEMPERO VERDE UN','não mexe no que a função grava');
  assert.ok(g.textContent.includes('A conferir (0)')&&g.textContent.includes('Confirmados (2)'),'recontou');
  // 4) busca
  [...g.querySelectorAll('[data-pnf]')].find(x=>x.dataset.pnf==='confirmado').click();await sleep(50);
  const b=g.querySelector('#pnf-busca');b.value='zaffari';b.dispatchEvent(new w.Event('input'));await sleep(50);
  assert.ok(g.textContent.includes('TOMATE GRAPE 500G')&&!g.textContent.includes('TEMPERO VERDE UN'),'filtra por fornecedor');
  // 5) v197: aba Peso por unidade usa a unidade do Saipos; pendente = comprado por unidade
  w.__store.set('pesos_unidade/x',{});
  E(`rcGTab='pesos';rcPesoFiltro='un';rcBusca=''`);E(`renderGestao`)(g);await sleep(150);
  let tp=g.textContent;
  assert.ok(tp.includes('SALSINHA')&&tp.includes('comprado por'),'salsinha: comprada por unidade, sem peso: '+tp.slice(0,600));
  assert.ok(!tp.includes('SAL MARINHO'),'sal (kg, comprado por pacote) não é pendência');
  assert.ok(tp.includes('(1 sem peso)'),'1 pendente');
  [...g.querySelectorAll('[data-pf]')].find(x=>x.dataset.pf==='todos').click();await sleep(50);
  tp=g.textContent;
  assert.ok(tp.includes('SAL MARINHO 1kg')&&tp.includes('usa em kg (unidade do Saipos)'),'sal usa em kg');
  assert.deepStrictEqual(erros,[],'erros de script: '+erros.join(' | '));
  console.log('OK — conferir compras da v196 + peso por unidade da v197 passaram (5 blocos)');
  process.exit(0);
})().catch(e=>{console.error('FALHOU:',e.message);console.error(erros.slice(0,5));process.exit(1);});
