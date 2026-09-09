import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalize,identityIndices,optionRows,visibleOptionRows,toggleOptionDisabled,canManagePillVisibility,latestVehicleReport,matchingAnswers,createRecoveryController} from '../form-recovery.js';
const admin={uid:'test-admin',email:'miguel.lopes@cruzvermelha.org.pt'};
test('eye preserves option metadata, order and round-trips stored JSON',()=>{
 const schema=[{type:'choice-single',options:JSON.stringify([[{text:'A',color:'#fff',width:120},'B']])}];
 assert.equal(toggleOptionDisabled(schema,0,0,0,{email:'test@example.invalid'}),false);
 assert.equal(toggleOptionDisabled(schema,0,0,0,admin),true);
 assert.equal(schema[0].options[0][0].width,120);
 assert.deepEqual(visibleOptionRows(JSON.stringify(schema[0].options)).flat().map(x=>x.text),['B']);
 assert.equal(toggleOptionDisabled(schema,0,0,0,admin),true);
 assert.deepEqual(visibleOptionRows(schema[0].options).flat().map(x=>x.text),['A','B']);
 assert.equal(canManagePillVisibility({...admin,isAnonymous:true}),false);
 assert.equal(canManagePillVisibility(null),false);
 assert.deepEqual(optionRows(['A','B']),[[{text:'A'},{text:'B'}]]);
 assert.deepEqual(visibleOptionRows([[{text:'A',disabled:true}],['B']]),[[{text:'B'}]]);
});
const ctx={uid:'test',email:'own@example.invalid',formId:'test-form',driver:'Miguel Teste',vehicle:'TEST-A',vehicleQuestion:'Viatura'};
const report=(id,vehicle,seconds,formId='test-form')=>({id,formId,respondent:'own@example.invalid',submittedAt:{seconds},answers:[{question:'Viatura',answer:vehicle}]});
test('latest report is scoped to author, form and vehicle even beyond 100 unrelated reports',()=>{
 const reports=[report('old','TEST-A',1),report('latest','TEST-A',2),...Array.from({length:150},(_,i)=>report(String(i),'TEST-B',i+3)),report('other-form','TEST-A',999,'other')];
 assert.equal(latestVehicleReport(reports,ctx).id,'latest');
 assert.equal(latestVehicleReport(reports,{...ctx,vehicle:'NONE'}),null);
 assert.equal(latestVehicleReport([report('bad','TEST-A',NaN)],ctx),null);
});
test('ambiguous legacy questions skipped; stable IDs supported',()=>{
 const schema=[{question:'Repeated',id:'a'},{question:'Repeated',id:'b'},{question:'Unique'}];
 assert.deepEqual(matchingAnswers(schema,[{question:'Repeated',answer:'x'},{question:'Unique',answer:'y'},{blockId:'b',question:'Repeated',answer:'z'}]).map(x=>[x.index,x.answer]),[[1,'z'],[2,'y']]);
});
test('switch vehicle during lookup: obsolete result never prompts or applies',async()=>{
 let current=ctx, resolveA, prompts=0, applied=[];
 const check=createRecoveryController({getContext:()=>current,findLatest:c=>c.vehicle==='TEST-A'?new Promise(r=>resolveA=r):Promise.resolve({id:'B'}),confirmLoad:()=>{prompts++;return true},apply:r=>applied.push(r.id),notify:()=>{}});
 const pending=check(); current={...ctx,vehicle:'TEST-B'};await check();resolveA({id:'A'});await pending;
 assert.deepEqual(applied,['B']);assert.equal(prompts,1);
});
test('logout after lookup and selection change during confirmation invalidate application',async()=>{
 let current=ctx, resolveConfirm, applied=0;
 const check=createRecoveryController({getContext:()=>current,findLatest:async()=>({}),confirmLoad:()=>new Promise(r=>resolveConfirm=r),apply:()=>applied++,notify:()=>{}});
 const pending=check();await Promise.resolve();current=null;await check();resolveConfirm(true);await pending;assert.equal(applied,0);
});
test('cancel, no report, error and reentry do not apply or loop',async()=>{
 for(const mode of ['cancel','none','error','apply']){
 let calls=0,applied=0,notices=0,check;
 check=createRecoveryController({getContext:()=>ctx,findLatest:async()=>{calls++;if(mode==='error')throw Error('denied');return mode==='none'?null:{}},confirmLoad:()=>mode!=='cancel',apply:()=>{applied++;check()},notify:()=>notices++});
 await check();assert.equal(calls,1);assert.equal(applied,mode==='apply'?1:0);assert.equal(notices,mode==='cancel'?0:1);
 }
});

import vm from 'node:vm';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../view_v201.html',import.meta.url),'utf8');
const restoreSource=html.slice(html.indexOf('        function restorePreviousAnswers('),html.indexOf('        const checkPreviousReport ='));
function pill(text,other=false){
 const classes=new Set(['selected',...(other?['pill-other']:[])]),input=other?{value:'old other'}:null;
 return {textContent:text,classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},querySelector:()=>input,input};
}
test('actual renderer restore replaces multi choices, restores Other, ignores hidden/deleted and preserves identity',()=>{
 const schema=[{type:'text-short',question:'Motorista'},{type:'choice-single',question:'Viatura'},
 {type:'choice-multi',question:'Material',hasOther:true},{type:'text-short',question:'Notes'},
 {type:'choice-single',question:'State'}];
 const choices=[pill('A'),pill('B'),pill('Outra',true)],single=[pill('Good'),pill('Bad')];
 const driver={value:'Miguel Current'},notes={value:'Old notes'};
 const blocks={0:{},1:{},2:{querySelectorAll:()=>choices},3:{},4:{querySelectorAll:()=>single}};
 const sandbox={window:{currentSchema:schema},matchingAnswers,document:{getElementById:id=>id==='ans-0'?driver:id==='ans-3'?notes:blocks[id.replace('block-','')]}};
 vm.createContext(sandbox);vm.runInContext(restoreSource,sandbox);
 sandbox.restorePreviousAnswers({answers:[{question:'Motorista',answer:'Old driver'},{question:'Material',answer:['A','Hidden','Deleted','Outra: new text']},{question:'Notes',answer:'New notes'},{question:'State',answer:'Good'}]},{driverIndex:0,vehicleIndex:1});
 assert.equal(driver.value,'Miguel Current');assert.equal(notes.value,'New notes');
 assert.deepEqual(choices.map(p=>p.classList.contains('selected')),[true,false,true]);
 assert.equal(choices[2].input.value,'new text');
 assert.deepEqual(single.map(p=>p.classList.contains('selected')),[true,false]);
 sandbox.restorePreviousAnswers({answers:[{question:'Material',answer:[]}]},{driverIndex:0,vehicleIndex:1});
 assert.deepEqual(choices.map(p=>p.classList.contains('selected')),[false,false,false]);
 assert.equal(choices[2].input.value,'');
});
test('all inline JavaScript parses, and restored function makes no submission/database calls',()=>{
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
   new vm.Script(match[2].replace(/^\s*import .*;\s*$/gm,''));
 }
 assert.doesNotMatch(restoreSource,/setDoc|submitResponse|togglePill\(/);
});
test('A to B to A rejects the first A response even though current vehicle matches again',async()=>{
 let current=ctx;const pending=[],applied=[];
 const check=createRecoveryController({getContext:()=>current,findLatest:()=>new Promise(r=>pending.push(r)),confirmLoad:()=>true,apply:r=>applied.push(r.id),notify:()=>{}});
 const a=check();current={...ctx,vehicle:'TEST-B'};const b=check();current=ctx;const a2=check();
 pending[0]({id:'obsolete-A'});pending[1]({id:'obsolete-B'});pending[2]({id:'current-A'});await Promise.all([a,b,a2]);assert.deepEqual(applied,['current-A']);
});

test('actual public renderer omits disabled options and empty rows, accepts string/flat options',()=>{
 const renderSource=html.slice(html.indexOf('        function renderForm('),html.indexOf('        async function sendNotificationEmail'));
 const container={innerHTML:'',prepend:()=>{}};
 const sandbox={visibleOptionRows,checkPreviousReport:()=>{},getContrastYIQ:()=>'',window:{},document:{getElementById:()=>container,createElement:()=>({setAttribute:()=>{},style:{}})}};
 vm.createContext(sandbox);vm.runInContext(renderSource,sandbox);
 sandbox.renderForm([{type:'choice-multi',question:'Choices',options:JSON.stringify([[{text:'Hidden only',disabled:true}],[{text:'Visible'}]])},{type:'choice-single',question:'Flat',options:['Flat A','Flat B']}]);
 assert.doesNotMatch(container.innerHTML,/Hidden only/);
 assert.match(container.innerHTML,/Visible/);assert.match(container.innerHTML,/Flat A/);
 assert.equal((container.innerHTML.match(/class="pill-row"/g)||[]).length,2);
});

test('actual eligibility requires login and Miguel; supports entering driver after vehicle',()=>{
 const source=html.slice(html.indexOf('        function readBlockAnswer('),html.indexOf('        function restorePreviousAnswers('));
 const driver={value:'Miguel Teste'},vehicle={value:'TEST-A'};
 const sandbox={normalize,identityIndices,currentUser:{uid:'test'},currentFormId:'test-form',window:{currentSchema:[{question:'Motorista'},{question:'Viatura'}]},document:{getElementById:id=>id==='ans-0'?driver:vehicle}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 assert.equal(sandbox.recoveryContext().vehicle,'TEST-A');
 driver.value='João';assert.equal(sandbox.recoveryContext(),null);driver.value='Miguel';
 sandbox.currentUser=null;assert.equal(sandbox.recoveryContext(),null);
 sandbox.currentUser={uid:'anon',isAnonymous:true};assert.equal(sandbox.recoveryContext(),null);
 sandbox.currentUser={uid:'test'};sandbox.window.isPreviewMode=true;assert.equal(sandbox.recoveryContext(),null);
});

test('continuing to type an eligible driver name does not repeat the same vehicle prompt',async()=>{
 let current=ctx,calls=0;
 const check=createRecoveryController({getContext:()=>current,findLatest:async()=>{calls++;return {}},confirmLoad:()=>false,apply:()=>{},notify:()=>{}});
 await check();current={...ctx,driver:'Miguel Teste Completo'};await check();assert.equal(calls,1);
 current=null;await check();current=ctx;await check();assert.equal(calls,2);
});
