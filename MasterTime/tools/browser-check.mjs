import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MASTER_TIME_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.MASTER_TIME_BROWSER?{executablePath:process.env.MASTER_TIME_BROWSER}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto('http://127.0.0.1:4173/#day');
  await page.getByRole('heading',{name:'Подари внимание своему дню.'}).waitFor();
  await page.getByRole('button',{name:'+ Новое дело'}).click();
  await page.getByLabel('Название',{exact:true}).fill('Проверка плана');
  await page.getByLabel('Начало',{exact:true}).fill('09:00');
  await page.getByRole('button',{name:'Сохранить дело'}).click();
  await page.getByRole('button',{name:'Выполнить',exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:'✓ Выполнено'}).waitFor();
  assert.match(await page.locator('#balance').textContent(),/5 кристаллов/);
  await page.getByRole('button',{name:'Изменить',exact:true}).click();
  await page.getByLabel('Название',{exact:true}).fill('Обновленный план');
  await page.getByRole('button',{name:'Сохранить дело'}).click();
  await page.getByText('Обновленный план',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Мой месяц',exact:true}).click();
  await page.getByLabel('Следующее действие').fill('Написать главу');
  await page.getByRole('button',{name:'Добавить цель',exact:true}).click();
  await page.getByLabel('Написать главу',{exact:true}).check();
  await page.getByLabel('Название привычки').fill('Чтение');
  await page.getByRole('button',{name:'Добавить привычку'}).click();
  await page.locator('.habit-days button:not([disabled])').first().click();
  await page.getByRole('link',{name:'Колесо года',exact:true}).click();
  await page.getByRole('button',{name:'январь',exact:true}).click();
  await page.getByRole('heading',{name:'Мои цели',exact:false}).waitFor();
  await page.getByRole('link',{name:'Карточки',exact:true}).click();
  await page.locator('.practice').first().waitFor();
  assert.equal(await page.locator('.practice').count(),74);
  await page.getByRole('button',{name:'Открыть практику →'}).first().click();
  await page.getByRole('button',{name:'☆ В избранное'}).click();
  await page.getByLabel('Мое открытие').fill('Маленький шаг помогает');
  await page.getByRole('button',{name:'Выполнить и сохранить'}).click();
  await page.getByText('Маленький шаг помогает',{exact:true}).waitFor({state:'attached'});
  await page.getByLabel('Мое открытие').fill('Повторное открытие');
  await page.getByRole('button',{name:'Выполнить и сохранить'}).click();
  assert.match(await page.locator('#balance').textContent(),/8 кристаллов/);
  await page.getByRole('button',{name:'← В каталог'}).click();
  await page.locator('#filter').selectOption('favorites');
  assert.equal(await page.locator('.practice').count(),1);
  await page.evaluate(()=>{const key='master-time:v1',s=JSON.parse(localStorage.getItem(key));s.months['2020-02']={goals:[{id:'test-goal',title:'Сохраненная цель прошлого месяца',done:true}],events:'Важное событие',habits:[],cards:[],insights:'Открытие месяца',joy:'Прогулки',changes:'Больше отдыха'};localStorage.setItem(key,JSON.stringify(s));});
  await page.goto('http://127.0.0.1:4173/#book');
  await page.reload();
  await page.getByRole('heading',{name:'февраль 2020 г.'}).waitFor();
  await page.getByText('✓ Сохраненная цель прошлого месяца',{exact:true}).waitFor();
  await page.reload();
  await page.locator('.chapter').waitFor();
  assert.equal(await page.locator('.chapter').count(),1);
  await page.getByRole('link',{name:'Настройки',exact:true}).click();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'Скачать резервную копию JSON'}).click();
  const download=await downloaded;
  assert.match(download.suggestedFilename(),/^MasterTime-.*\.json$/);
  await page.goto('http://127.0.0.1:4173/#year');
  assert.equal(await page.locator('.wheel-month path').count(),12);
  await page.locator('.wheel-month[data-month$="-04"]').click();
  await page.locator('#month-select').waitFor();
  assert.match(await page.locator('#month-select').inputValue(),/-04$/);
  for(const file of ['hourglass-world.jpg','choice-crossroads.jpg']){
    const response=await page.request.get(`http://127.0.0.1:4173/assets/illustrations/${file}`);
    assert.equal(response.status(),200);
    assert.match(response.headers()['content-type'],/image\/jpeg/);
  }
  for(const width of [375,390,768,1440]){
    await page.setViewportSize({width,height:950});
    for(const route of ['day','week','month','year','cards','book','settings']){
      await page.goto(`http://127.0.0.1:4173/#${route}`);
      await page.locator('#content h1').waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow ${width} ${route}`);
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:4173/#day');
  await page.locator('#content h1').waitFor();
  await page.screenshot({path:'/private/tmp/master-time-desktop.png',fullPage:true});
  await page.setViewportSize({width:375,height:1000});
  await page.screenshot({path:'/private/tmp/master-time-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: task create/edit/complete/reload, monthly goal, habit check, 74 cards, favorites, repeated reward protection, automatic chapter with no duplicate on reload, JSON download, 28 responsive route checks, no page errors.');
}catch(error){await page.screenshot({path:'/private/tmp/master-time-check-failure.png',fullPage:true});console.error(await page.locator('#content').innerText());throw error;}finally{await browser.close();}
