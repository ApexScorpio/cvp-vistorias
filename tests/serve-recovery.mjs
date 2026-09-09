// Isolated browser harness: Firebase is replaced, all writes stay in memory.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const schema=[
 {type:'title',content:'Teste sanitizado — recuperação'},
 {type:'text-short',question:'Motorista'},
 {type:'choice-single',question:'Viatura',options:[['TEST-A','TEST-B','TEST-NONE']]},
 {type:'choice-multi',question:'Material',hasOther:true,options:[[{text:'Ativa A'},{text:'Oculta',disabled:true},{text:'Ativa B'}]]},
 {type:'text-short',question:'Observações'},
 {type:'date',question:'Data'},
 {type:'choice-single',question:'Estado',options:['Bom','Mau']}
];
const form={uid:'test-admin',title:'Teste sanitizado',schema};
const admin='miguel.lopes@cruzvermelha.org.pt';
const reports=Array.from({length:151},(_,i)=>({formId:'test-form',submittedAt:{seconds:i+100},answers:[{question:'Viatura',answer:'TEST-B'}]}));
reports.push({formId:'test-form',submittedAt:{seconds:2},answers:[{question:'Motorista',answer:'Miguel Antigo'},{question:'Viatura',answer:'TEST-A'},{question:'Material',answer:['Ativa A','Oculta','Outra: exemplo']},{question:'Observações',answer:'Relatório mais recente de TEST-A'},{question:'Estado',answer:'Bom'}]});
const firebase=`
 const params=new URLSearchParams(location.search);
 const user=params.has('logout')?null:{uid:'test-admin',email:params.has('regular')?'regular@example.invalid':${JSON.stringify(admin)},isAnonymous:false};
 export const auth={currentUser:user},db={};
 const authCallbacks=[];
 export function onAuthStateChanged(auth,callback){authCallbacks.push(callback);queueMicrotask(()=>callback(auth.currentUser));}
 export const collection=(_db,name)=>({name});
 export const doc=(...args)=>({id:args.at(-1)});
 export const where=(...args)=>args;
 export const query=(collection,...conditions)=>({collection,conditions});
 export const serverTimestamp=()=>({seconds:0});
 export const setDoc=async(...args)=>{const el=document.getElementById('test-writes');el.textContent=Number(el.textContent)+1;window.testLastWrite=args[1];};
 export const getDoc=async()=>({exists:()=>true,id:'test-form',data:()=>(${JSON.stringify(form)})});
 export const getDocs=async q=>{
   if(q.collection.name==='forms')return {empty:false,docs:[await getDoc()]};
   if(q.conditions.length!==1 || q.conditions[0][0]!=='formId')throw Error('Wrong query');
   const el=document.getElementById('test-reads');el.textContent=Number(el.textContent)+1;
   return {docs:${JSON.stringify(reports)}.map((r,i)=>({id:String(i),data:()=>r}))};
 };
`;
const toolbar='<aside style="background:white;color:black;padding:10px;position:relative;z-index:999">TESTE ISOLADO — Leituras: <span id="test-reads">0</span>; Escritas: <span id="test-writes">0</span></aside>';
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'view_v201.html':url.pathname.slice(1);
 res.setHeader('Cache-Control','no-store');
 if(name==='firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end(firebase);return;}
 if(name==='themes.js'){res.setHeader('Content-Type','text/javascript');res.end('export const applyTheme=()=>{};');return;}
 const target=path.resolve(root,name);
 if(!target.startsWith(root+path.sep)||!fs.existsSync(target)){res.writeHead(404);res.end();return;}
 let source=fs.readFileSync(target);
 if(name.endsWith('.html'))source=source.toString().replace('<body','<body').replace(/(<body[^>]*>)/,'$1'+toolbar).replace(/<script\b[^>]*src="https:[^"]*"[^>]*><\/script>/g,'').replace(/<link\b[^>]*href="https:[^"]*"[^>]*>/g,'');
 res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(source);
}).listen(8765,'0.0.0.0',()=>console.log('Isolated harness: http://localhost:8765/view_v201.html?id=test-form'));
