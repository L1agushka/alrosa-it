/* Isolated browser QA. All /api calls are intercepted; no database writes occur.
   The inventory is the repository CSV. ML/NLP/catalog responses are explicit QA
   fixtures to exercise UI states, never evidence of compatibility or predictions.
   Set PLAYWRIGHT_MODULE, CHROMIUM_PATH, QA_URL and QA_OUTPUT as needed. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const output=process.env.QA_OUTPUT||path.join(root,'output/playwright/premium-validation');
fs.mkdirSync(output,{recursive:true});
function csv(text){const records=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));records.push(row);row=[];cell=''}else cell+=c}if(cell||row.length){row.push(cell);records.push(row)}const headers=records.shift();return records.filter(r=>r.length===headers.length).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])))}
const inventory=csv(fs.readFileSync(path.join(root,'alrosa_audit_100_workstations.csv'),'utf8')).map(r=>({...r,ram_gb:+r.ram_gb,cpu_cores:+r.cpu_cores,disk_gb:+r.disk_gb,installed_software:r.installed_software.split(';').map(s=>s.trim())}));
const catalog=[{id:1,software_name:'QA: программа с аналогом',analog_name:'QA: проверяемый аналог',status:'manual_check'}, {id:2,software_name:'QA: нативная программа',status:'native'}, {id:3,software_name:'QA: блокирующая программа',status:'incompatible',is_blocker:true}];
const raw=(r)=>({id:r.workstation_id,user:r.user_fullname,department:r.department,ram:r.ram_gb,cores:r.cpu_cores,disk:r.disk_gb,installed_software:r.installed_software});
const ml={available:true,summary:{fleet_risk_index:45.3,high_risk_count:1,medium_risk_count:1,low_risk_count:1},feature_importances:[{feature:'ОЗУ — QA фактор',weight_pct:60},{feature:'ПО — QA фактор',weight_pct:40}],workstations:inventory.slice(0,3).map((r,i)=>({workstation_id:r.workstation_id,department:r.department,incident_probability:[18,42,76][i],risk_level:['Низкий','Умеренный','Высокий'][i],key_risk_factor:['ОЗУ — тестовый фактор','1С — тестовый фактор','САПР — тестовый фактор'][i],raw_workstation:raw(r)}))};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[],mutations=[],checks={},regression={};let rules=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{
  const request=route.request(),p=new URL(request.url()).pathname;
  if(request.method()!=='GET')mutations.push({path:p,method:request.method(),body:p.endsWith('/upload')?'multipart upload':request.postData()});
  let body=[];
  if(p.endsWith('/audit/latest'))body={workstations:inventory};
  if(p.endsWith('/catalog/compatibility'))body=catalog;
  if(p.endsWith('/catalog/software'))body=[];
  if(p.endsWith('/stats/blockers'))body={top_software:[]};
  if(p.endsWith('/ml-risk'))body=ml;
  if(p.endsWith('/nlp-match')){const q=JSON.parse(request.postData()).query;body={normalized_name:'QA: '+q,is_software:q!=='monkey',category:'Специализированное отраслевое ПО',summary:'Изолированный ответ для проверки интерфейса. Не результат модели.',method:'QA fixture',confidence_pct:50,cosine_similarity:.5,status:'manual_check',domestic_alt:'QA: требуется проверка',candidates:[]}}
  if(p.endsWith('/custom-rules')){if(request.method()==='POST')rules.push({id:'QA-1',...JSON.parse(request.postData())});body=request.method()==='GET'?rules:rules.at(-1)}
  if(request.method()==='DELETE'){rules=[];body={}}
  if(p.endsWith('/audit/upload'))return route.fulfill({status:400,json:{detail:'QA: проверка сообщения об ошибке импорта'}});
  await route.fulfill({json:body});
 });
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Войти в систему'}).first().click();
 await page.locator('.landing').waitFor({state:'detached'});
 await page.waitForTimeout(1200);
 const navigate=async i=>{await page.locator('.navigation button').nth(i).click();await page.waitForTimeout(350)};
 const grab=async name=>{await page.waitForTimeout(1200);return page.screenshot({path:path.join(output,name+'.png'),fullPage:true})};
 regression.overview=await page.locator('.hero-text').innerText();
 await navigate(1);
 regression.initialRows=await page.locator('.fleet-table tbody').innerText();
 assert.equal(await page.locator('.fleet-table tbody tr').count(),24);
 await page.getByRole('button',{name:'Показать ещё'}).click();assert.equal(await page.locator('.fleet-table tbody tr').count(),48);
 await page.getByRole('textbox',{name:'Поиск рабочего места, сотрудника или отдела'}).fill('WS-ALR-001');assert.equal(await page.locator('.fleet-table tbody tr').count(),1);
 await page.locator('.device-link').click();await page.getByRole('dialog').waitFor();regression.modalRisk=await page.getByRole('dialog').innerText();await grab('device-risk');
 await page.getByRole('button',{name:/Обзор и ПО/}).click();regression.modalHardware=await page.getByRole('dialog').innerText();await grab('device-overview');
 await page.getByRole('button',{name:/Контрфактический рецепт/}).click();regression.playbook=await page.locator('.modal pre').innerText();await grab('device-playbook');
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);checks.modalFocusReturned=await page.locator('.device-link').evaluate(e=>e===document.activeElement);
 await page.locator('.ws-search').fill('несуществующий-qa');assert.equal(await page.locator('.fleet-table').count(),0);await grab('empty-search');await page.getByRole('button',{name:'Сбросить фильтры'}).click();
 await page.getByLabel('Подразделение',{exact:true}).selectOption({label:inventory[0].department});regression.departmentRows=await page.locator('.fleet-table tbody').innerText();
 await page.getByLabel('Подразделение',{exact:true}).selectOption('');await page.getByLabel('Порядок сортировки').selectOption('status');regression.sortedRows=await page.locator('.fleet-table tbody').innerText();
 await page.locator('.ws-tools .seg button').filter({hasText:'Частично'}).click();regression.statusCount=await page.locator('.ws-count').innerText();
 await page.locator('input[type=file]').setInputFiles(path.join(root,'alrosa_audit_100_workstations.csv'));await page.locator('.error').waitFor();await grab('import-error');
 const download=async locator=>{const event=page.waitForEvent('download');await locator.click();return fs.readFileSync(await(await event).path(),'utf8')};
 regression.template=await download(page.getByRole('button',{name:'Шаблон',exact:true}));
 await navigate(0);await page.getByRole('tab',{name:'Офис',exact:true}).click();await page.getByRole('button',{name:'Волна 1',exact:true}).click();await grab('office');
 await page.getByRole('tab',{name:'Статусы',exact:true}).click();await grab('map-statuses');
 await navigate(2);await page.locator('input[type=range]').first().fill('16');regression.criteria=await page.locator('.sliders').innerText();await navigate(0);await page.waitForTimeout(1200);regression.changedOverview=await page.locator('.hero-text').innerText();
 await navigate(4);regression.export=await download(page.getByRole('button',{name:'Скачать CSV'}));
 await page.emulateMedia({media:'print'});await grab('print');await page.emulateMedia({media:'screen'});
 await navigate(5);await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.getByRole('tab',{name:'Память',exact:true}).click();await page.locator('.bx-opts button').last().click();await page.waitForTimeout(800);regression.builder=await page.locator('.bx-side').innerText();await grab('builder-expanded');await page.getByRole('button',{name:'Подобрать под критерии'}).click();await page.waitForTimeout(800);regression.autoBuilder=await page.locator('.bx-side').innerText();
 await navigate(6);await page.locator('label.chip').first().click();assert.equal(await page.locator('input[type=checkbox]').first().isChecked(),true);await page.waitForTimeout(1200);regression.mlSimulation=await page.locator('.page').innerText();await grab('ml-simulation');await page.getByRole('button',{name:'Сбросить симуляцию'}).click();
 await navigate(7);await page.getByRole('button',{name:/Зафиксировать в политиках/}).click();await page.getByText('Успешно сохранено!').waitFor();await grab('policy-saved');await page.getByRole('button',{name:'monkey',exact:true}).click();await page.getByRole('button',{name:/Принудительное добавление/}).click();await grab('policy-confirmation');await page.getByRole('button',{name:'Отмена',exact:true}).click();
 regression.mutations=structuredClone(mutations);
 for(const width of (process.env.QA_COMPARE_ONLY?[]:[1440,720,390,320])){await page.setViewportSize({width,height:width>1000?1000:844});for(let i=0;i<8;i++){await navigate(i);checks[`overflow-${width}-${i}`]=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(checks[`overflow-${width}-${i}`])checks[`overflow-elements-${width}-${i}`]=await page.evaluate(()=>[...document.querySelectorAll('.page *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&getComputedStyle(e).position!=='absolute'&&!e.closest('.table-wrapper,.fleet-table-wrap,.mz-stage')}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,text:e.textContent.slice(0,60)})));if(width===1440||width===390)await grab(`page-${i}-${width}`)}}
 await page.emulateMedia({reducedMotion:'reduce'});checks.reducedMotion=await page.locator('.page').evaluate(e=>getComputedStyle(e).animationName);
 checks.errors=errors;checks.allApiIntercepted=true;
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));fs.writeFileSync(path.join(output,'regression.json'),JSON.stringify(regression,null,2));
 console.log(JSON.stringify(checks,null,2));await browser.close();
 assert.deepEqual(errors,[], 'No uncaught browser errors');
 assert.equal(checks.modalFocusReturned,true, 'Device dialog returns focus');
 for(const [name,value] of Object.entries(checks))if(name.startsWith('overflow-')&&!name.startsWith('overflow-elements-'))assert.equal(value,false,name);
 assert.equal(checks.reducedMotion,'none','Reduced motion disables page animation');
})().catch(e=>{console.error(e);process.exit(1)});
