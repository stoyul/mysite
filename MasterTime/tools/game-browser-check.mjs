import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MASTER_TIME_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.MASTER_TIME_BROWSER?{executablePath:process.env.MASTER_TIME_BROWSER}:{})});
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('master-time:v1')));
const advance=()=>page.locator('[data-game="advance"]').click();
const choose=async index=>page.locator('.scene-choices button:not([disabled])').nth(index).click();
try{
  await page.goto('http://127.0.0.1:4173/#game');
  await page.getByRole('heading',{name:/МАСТЕР ВРЕМЕНИ/}).waitFor();
  assert.equal(await page.locator('aside').isVisible(),false);
  await page.locator('#sound-toggle').click();
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('#music-toggle').click();assert.equal(await page.locator('#music-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('#music-toggle').click();
  await page.getByRole('button',{name:'НАЧАТЬ ИГРУ'}).click();
  await page.locator('#passport-sleep-form button.primary').click();
  await page.locator('#passport-day-form button.primary').click();
  await page.locator('#passport-rhythm-form button.primary').click();
  await page.locator('#passport-prime-form button.primary').click();
  await page.locator('#passport-wishes-form input[type=checkbox]').first().check();
  await page.locator('#passport-wishes-form button.primary').click();
  assert.equal((await state()).profile.passport.averageSleep,450);
  await page.getByRole('button',{name:'ДАЛЕЕ →'}).click();
  await page.getByRole('button',{name:'ДАЛЕЕ →'}).click();
  await page.getByRole('button',{name:'НАЧАТЬ МОЙ ДЕНЬ →'}).click();
  await page.locator('[data-key="sleep"][data-delta="15"]').click();
  assert.match(await page.locator('[data-time-output="sleep"]').innerText(),/7 ч 45 мин/);
  await page.getByRole('button',{name:'ВЫБРАТЬ МОЕ ЖЕЛАНИЕ →'}).click();
  await page.locator('.wish-grid button').nth(3).click();
  await page.getByRole('button',{name:/ПРОДОЛЖИТЬ · ВЫБРАНО 2/}).click();
  await page.locator('.focus-list button').first().click();
  await choose(1);
  let run=(await state()).gameRuns[0];
  assert.equal(run.mode,'journey-v2');
  assert.equal(run.resources.crystals,7);
  assert.equal(run.missionAwarded,true);
  assert.equal(run.allocation.wishes,15);
  assert.equal(run.schedule.sleep,465);assert.equal(run.allocation.unaccounted,195);
  assert.equal(run.desires.length,2);
  assert.equal(run.history[0].saved,15);
  assert.match(await page.locator('.mission-unlock').innerText(),/Первые 15 минут/);
  await page.reload();
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
  await page.locator('.journey-impact').waitFor();
  await advance();
  await page.locator('[data-game="history-node"]').first().click();
  assert.equal(await page.locator('#journey-review').isVisible(),true);
  await page.locator('#close-journey-review').click();
  await choose(1);await advance();
  await page.locator('#game-practice-form').waitFor();
  await page.getByLabel('Что ты заметила?').fill('Я могу сохранить время для важного');
  await page.getByLabel('Какой маленький шаг сделаешь?').fill('15 минут изучать язык');
  await page.getByRole('button',{name:'СОХРАНИТЬ ШАГ →'}).click();
  assert.equal((await state()).gameRuns[0].practice.minutes,15);
  await advance();
  await choose(1);await advance();
  await choose(1);await advance();
  run=(await state()).gameRuns[0];
  assert.equal(run.phase,'result');
  assert.equal(run.history.filter(h=>h.kind==='choice').length,4);
  assert.equal(await page.locator('.game-comparison .compare-row').count(),7);
  assert.equal(run.achievements.includes('Первые 15 минут'),true);
  assert.equal((await state()).decisions.length,4);
  assert.equal((await state()).cardRuns.length,1);
  assert.equal((await state()).rewards.filter(r=>r.key===`game:${run.id}:complete`).length,1);
  await page.reload();
  assert.equal((await state()).rewards.filter(r=>r.key===`game:${run.id}:complete`).length,1);
  await page.getByRole('button',{name:'ДОБАВИТЬ ШАГ В ПЛАН'}).click();
  assert.equal(await page.getByLabel('Название',{exact:true}).inputValue(),'15 минут изучать язык');
  await page.getByRole('button',{name:'Сохранить дело'}).click();
  assert.equal((await state()).tasks[0].sourceRunId,run.id);
  await page.goto('http://127.0.0.1:4173/#runs');assert.ok(await page.locator('#content').getByText('День 1').count());
  await page.goto('http://127.0.0.1:4173/#chapters');
  for(const [kind,count,title] of [['week',7,'Моя неделя'],['month',4,'Мой месяц'],['year',12,'Мой год']]){
    await page.locator(`[data-chapter="open"][data-kind="${kind}"]`).click();
    if(kind!=='week'){await page.locator('#chapter-setup-form input').fill(kind==='month'?'Читать каждый день':'Больше времени для близких');await page.locator('#chapter-setup-form button').click();}
    await page.locator('.chapter-scene').waitFor();
    for(let i=0;i<count;i++){
      await page.locator('[data-chapter="choose"][data-choice="0"]').click();
      await page.locator('.chapter-consequence').waitFor();
      await page.locator('[data-chapter="advance"]').click();
    }
    await page.locator('.chapter-result').waitFor();
    let s=await state(),chapter=s.chapterRuns.find(r=>r.id===s.activeChapter);
    assert.equal(chapter.kind,kind);assert.equal(chapter.phase,'result');assert.equal(chapter.history.length,count);
    assert.equal(s.rewards.filter(r=>r.key===`chapter:${chapter.id}`).length,1);
    await page.reload();await page.locator('.chapter-result').waitFor();
    assert.equal((await state()).rewards.filter(r=>r.key===`chapter:${chapter.id}`).length,1);
    if(kind==='week'){
      await page.locator('[data-chapter="bridge-week"]').click();
      assert.equal(await page.locator('#task-form [name="duration"]').inputValue(),'30');
      await page.getByRole('button',{name:'Сохранить дело'}).click();
      assert.ok((await state()).tasks.some(t=>t.duration===30));
    }
    if(kind==='month'){
      await page.locator('[data-chapter="bridge-month"]').click();
      assert.ok(Object.values((await state()).months).some(m=>m.habits?.some(h=>h.sourceChapterId===chapter.id)));
    }
    if(kind==='year'){
      await page.locator('[data-chapter="bridge-year"]').click();
      assert.ok(Object.values((await state()).months).some(m=>m.goals?.some(g=>g.sourceChapterId===chapter.id)));
    }
    await page.goto('http://127.0.0.1:4173/#chapters');
    await page.getByRole('heading',{name:title}).waitFor();
  }
  await page.goto('http://127.0.0.1:4173/#cards');
  await page.locator('.practice').first().waitFor();
  assert.equal(await page.locator('.practice').count(),74);
  await page.locator('.practice').first().getByRole('button').click();
  assert.equal(await page.locator('.card-editorial>div').count(),2);
  await page.getByRole('button',{name:'☆ В избранное'}).click();
  assert.equal((await state()).favorites.length,1);
  await page.reload();
  assert.equal((await state()).favorites.length,1);
  for(const width of [375,390,768,1440]){
    await page.setViewportSize({width,height:950});
    for(const route of ['game','play','runs','passport','tools','achievements','chapters','chapter','day','cards']){
      await page.goto('http://127.0.0.1:4173/#'+route);
      await page.locator('#content h1').waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route}: ${width}`);
      assert.ok(!/[ёЁ]/.test(await page.locator('#content').innerText()),`${route}: contains ё`);
    }
  }
  const filePage=await browser.newPage({viewport:{width:390,height:844}});
  await filePage.goto(pathToFileURL(fileURLToPath(new URL('../index.html',import.meta.url))).href+'#game');
  await filePage.getByRole('button',{name:'НАЧАТЬ ИГРУ'}).waitFor();
  await filePage.goto(filePage.url().split('#')[0]+'#cards');
  assert.equal(await filePage.locator('.practice').count(),74);
  await filePage.close();
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile intro → 24h plan → wishes → 4 choices → practice → result → saved reward → task bridge; history, sound, 3 chapter campaigns, 74 cards, favorites, responsive/file views.');
}catch(e){await page.screenshot({path:'/private/tmp/master-time-game-failure.png',fullPage:true});console.error((await page.locator('#content').innerText()).slice(0,2800));console.error('NOTICE',await page.locator('#notice').innerText());throw e;}finally{await browser.close();}
