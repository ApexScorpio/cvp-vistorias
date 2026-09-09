const {chromium,expect}=require(process.env.CVP_PLAYWRIGHT_MODULE);
const {spawn}=require('node:child_process');
const fs=require('node:fs');
(async()=>{
 let browser,server;
 try {
  server=spawn(process.execPath,['tests/serve-recovery.mjs'],{stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Servidor de teste nao iniciou')),15000);
   server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);reject(Error('Servidor terminou: '+code))});
   server.stdout.on('data',data=>{if(String(data).includes('Isolated harness:')){clearTimeout(timer);resolve()}});
  });
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  // CVP_PAGE_DIAGNOSTICS
  server.stderr.on('data', data => console.error('SERVER_ERROR: '+String(data)));
  page.on('pageerror', error => console.error('PAGE_ERROR: '+JSON.stringify({name:error.name,message:error.message,stack:error.stack})));
  page.on('console', message => {
    if(message.type()==='error') console.error('CONSOLE_ERROR: '+message.text());
  });
  page.on('requestfailed', request => {
    console.error('REQUEST_FAILED: '+request.url()+' '+JSON.stringify(request.failure()));
  });
  page.on('response', response => {
    if(response.status()>=400) console.error('HTTP_ERROR: '+response.status()+' '+response.url());
  });
  const base='http://localhost:8765';
  fs.mkdirSync('evidence/recovery',{recursive:true});
  await page.goto(base+'/view_v201.html?id=test-form');
  await expect(page.locator('#block-3')).toBeVisible();
  await expect(page.getByText('Oculta',{exact:true})).toHaveCount(0);
  await page.getByText('Ativa B',{exact:true}).click();
  await page.locator('#ans-1').fill('Miguel Teste');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByText('TEST-A',{exact:true}).click();
  await expect(page.locator('#previous-report-status')).toContainText('carregadas');
  await expect(page.getByText('Ativa A',{exact:true})).toHaveClass(/selected/);
  await expect(page.getByText('Ativa B',{exact:true})).not.toHaveClass(/selected/);
  await expect(page.locator('.pill-other-input')).toHaveValue('exemplo');
  await expect(page.locator('#ans-1')).toHaveValue('Miguel Teste');
  await expect(page.locator('#test-writes')).toHaveText('0');
  await page.screenshot({path:'evidence/recovery/desktop-restauro.png',fullPage:true});
  await page.goto(base+'/view_v201.html?id=test-form');
  await page.locator('#ans-4').fill('Manter este texto');
  await page.locator('#ans-1').fill('Miguel');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByText('TEST-A',{exact:true}).click();
  await expect(page.locator('#ans-4')).toHaveValue('Manter este texto');
  await page.getByText('TEST-NONE',{exact:true}).click();
  await expect(page.locator('#previous-report-status')).toContainText('Nao existe'.replace('Nao','Não'));
  await page.goto(base+'/view_v201.html?id=test-form&logout=1');
  await page.locator('#ans-1').fill('Miguel');
  await page.getByText('TEST-A',{exact:true}).click();
  await expect(page.locator('#test-reads')).toHaveText('0');
  await page.goto(base+'/builder.html?id=test-form');
  const wrapper=page.locator('.pill-edit-wrapper').filter({has:page.locator('input[value="Ativa A"]')});
  await wrapper.getByTitle('Desativar opção',{exact:true}).click();
  await expect(wrapper.getByTitle('Reativar opção',{exact:true})).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(()=>window.testLastWrite && JSON.parse(window.testLastWrite.schema[3].options)[0][0].disabled===true);
  await page.screenshot({path:'evidence/recovery/editor-desativada.png',fullPage:true});
  await wrapper.getByTitle('Reativar opção',{exact:true}).click();
  await page.waitForFunction(()=>window.testLastWrite && JSON.parse(window.testLastWrite.schema[3].options)[0][0].disabled===false);
  await page.goto(base+'/builder.html?id=test-form&regular=1');
  await expect(page.locator('.pill-input').first()).toBeVisible();
  await expect(page.locator('.pill-visibility-btn')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/view_v201.html?id=test-form');
  await page.locator('#ans-1').fill('Miguel');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByText('TEST-A',{exact:true}).click();
  await expect(page.locator('#previous-report-status')).toContainText('carregadas');
  await expect(page.getByText('Oculta',{exact:true})).toHaveCount(0);
  await page.screenshot({path:'evidence/recovery/mobile-restauro.png',fullPage:true});
  fs.writeFileSync('evidence/recovery/browser-result.json',JSON.stringify({passed:true,date:new Date().toISOString(),database:'simulated',realSubmissions:0,checks:['desktop restore','multi replacement','other','hidden options','cancel','no report','logged out','admin eye and saved state','reactivate','regular user','mobile restore']},null,2));
  console.log('BROWSER_CHECKS=PASS; REAL_SUBMISSIONS=0');
 } finally {if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
