import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({ headless: true,
  ...(existsSync(edge) ? { executablePath: edge } : {}) });
const checks = [];
await mkdir("outputs/vercel-qa", { recursive: true });
try {
  for (const [width, height] of [[360,640],[390,844],[768,1024],[1280,720],[1440,900]]) {
    const context = await browser.newContext({ viewport: {width, height},
      ...(width < 600 ? {isMobile:true,hasTouch:true} : {}) });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5173");
    await page.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
    for (const area of [".footer-links", ".hero-buttons", ".header-actions"]) {
      const button = page.locator(area).getByRole("button", {name:/Telegram/});
      const activate = () => width < 600 ? button.tap() : button.click();
      await button.scrollIntoViewIfNeeded();
      await activate();
      const dialog = page.getByRole("dialog", {name:"Контакт для заявок"});
      await dialog.waitFor();
      const heading = dialog.getByRole("heading", {name:"Здесь мы укажем ваш Телеграм",exact:true});
      const bounds = await dialog.boundingBox();
      const title = await heading.boundingBox();
      const view = await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
      await page.screenshot({path:`outputs/vercel-qa/contact-${width}-${area.slice(1)}.png`});
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= view.height + 1,
        `Диалог ${area} вне экрана ${width}: ${JSON.stringify({bounds,view})}`);
      assert.ok(title.y >= 0 && title.y + title.height <= view.height);
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= view.width + 1);
      await dialog.getByRole("button",{name:"Закрыть",exact:true}).click();
      await activate();
      await dialog.getByRole("button",{name:"Понятно"}).click();
      assert.equal(await dialog.isVisible(), false);
      checks.push(`${width}×${height}: ${area}, фраза сразу в экране, оба способа закрытия и повторное открытие`);
    }
    await context.close();
  }
  await writeFile("outputs/vercel-qa/mobile-contact-report.json",JSON.stringify({checks},null,2));
  console.log(`${checks.length} contact checks passed`);
} finally { await browser.close(); }
