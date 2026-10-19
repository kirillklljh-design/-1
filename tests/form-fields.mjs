import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const engines = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const checks = [];
await mkdir("outputs/vercel-qa", {recursive:true});
for (const engine of ["webkit", "chromium"]) {
  const browser = await engines[engine].launch({headless:true,
    ...(engine === "chromium" && existsSync(edge) ? {executablePath:edge} : {})});
  try {
    for (const width of [360,390,768,1280,1440]) {
      const context = await browser.newContext({viewport:{width,height:900},
        ...(width < 600 ? {isMobile:true,hasTouch:true} : {})});
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173");
      await page.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
      await page.getByLabel("Выбранная техника", {exact:true}).selectOption("truck");
      await page.locator(".rental-form").screenshot({path:`outputs/vercel-qa/fields-${engine}-${width}-placeholder.png`});
      await page.getByLabel("Адрес объекта").fill("Нижний Новгород, улица Максима Горького, 123");
      await page.getByLabel("Дата начала работ").fill("2026-10-20");
      await page.getByLabel("Желаемое время подачи").fill("13:30");
      await page.getByLabel("Количество часов").fill("8");
      await page.getByLabel("Зона доставки").selectOption("suburb");
      await page.locator(".rental-form").screenshot({path:`outputs/vercel-qa/fields-${engine}-${width}-filled.png`});
      const layout = await page.locator(".rental-form .input-icon").evaluateAll(wrappers=>wrappers.map(wrapper=>{
        const field=wrapper.querySelector("input,select");
        const icon=wrapper.querySelector("svg");
        const style=getComputedStyle(field);
        return {tag:field.tagName,type:field.type,
          textStart:field.getBoundingClientRect().left+parseFloat(style.borderLeftWidth)+parseFloat(style.paddingLeft),
          iconRight:icon.getBoundingClientRect().right,appearance:style.appearance};
      }));
      for (const field of layout) {
        assert.ok(field.textStart>=field.iconRight+8,`${engine} ${width}: текст пересекается с иконкой ${JSON.stringify(field)}`);
        if(field.tag === "SELECT") assert.equal(field.appearance,"none","WebKit должен использовать CSS-отступы вместо нативного оформления списка");
      }
      assert.equal(await page.getByLabel("Выбранная техника",{exact:true}).inputValue(),"truck");
      assert.match(await page.getByLabel("Адрес объекта").inputValue(),/Максима Горького, 123$/);
      assert.match(await page.locator(".summary-total").innerText(),/25\s?400/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      checks.push(`${engine} ${width}: выбор техники, заполненный адрес/дата/время/часы без наложения иконок, расчёт и ширина`);
      await context.close();
    }
  } finally {await browser.close();}
}
await writeFile("outputs/vercel-qa/form-fields-report.json",JSON.stringify({checks},null,2));
console.log(`${checks.length} form-field checks passed`);
