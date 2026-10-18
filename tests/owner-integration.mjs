import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { startMockSupabase } from "./mock-supabase.mjs";
const mock = await startMockSupabase();
let logs = "";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "5174",
  ],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (d) => (logs += d));
child.stderr.on("data", (d) => (logs += d));
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(edge) ? { executablePath: edge } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  base = "http://127.0.0.1:5174";
const checks = [];
const pass = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.goto(base + "/owner");
  await page
    .getByRole("heading", { name: "Управление вашим парком" })
    .waitFor();
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Войти в кабинет" }).click();
  await page.getByRole("alert").waitFor();
  pass("Неверный пароль отклонён");
  await page.getByLabel("Email", { exact: true }).fill("viewer@example.test");
  await page.getByLabel("Пароль", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Войти в кабинет" }).click();
  await page.getByRole("alert").filter({ hasText: "доступ" }).waitFor();
  pass("Пользователь без роли владельца не входит в кабинет");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByRole("button", { name: "Войти в кабинет" }).click();
  await page.getByRole("heading", { name: "Рабочий кабинет" }).waitFor();
  await page.locator(".owner-card:not(.skeleton)").nth(3).waitFor();
  pass("Вход владельца с cookie-сессией");
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    await page.screenshot({
      path: `outputs/vercel-qa/owner-${width}.png`,
      fullPage: true,
    });
    pass(`Кабинет ${width}px без горизонтальной прокрутки`);
  }
  await page
    .getByRole("button", { name: "Добавить технику", exact: true })
    .click();
  await page.getByLabel("Название", { exact: true }).fill("Проверочная машина");
  await page
    .getByLabel("Описание", { exact: true })
    .fill("Проверка миграции на Vercel");
  await page.getByLabel("Цена за час, ₽").fill("4100");
  await page.getByLabel("Минимальная смена, ч").fill("6");
  const image = await page.screenshot({
    clip: { x: 0, y: 0, width: 20, height: 20 },
  });
  await page
    .getByLabel("Фотография техники", { exact: true })
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page
    .getByRole("heading", { name: "Проверочная машина", exact: true })
    .waitFor();
  assert.equal(mock.photos.size, 1);
  pass("Добавление карточки и прямое фото по подписанному URL");
  await page.reload();
  await page
    .getByRole("heading", { name: "Проверочная машина", exact: true })
    .waitFor();
  pass("Карточка сохраняется после перезагрузки");
  const card = () =>
    page.locator(".owner-card").filter({ hasText: "Проверочная машина" });
  await card().getByRole("button", { name: "Редактировать" }).click();
  await page.getByLabel("Цена за час, ₽").fill("4200");
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".owner-card")].some(
      (c) =>
        c.textContent.includes("Проверочная машина") &&
        c.textContent.includes("4 200"),
    ),
  );
  pass("Редактирование карточки");
  const visitor = await browser.newPage();
  await visitor.goto(base);
  await visitor.locator(".machine-card:not(.skeleton)").nth(4).waitFor();
  assert.match(
    await visitor
      .locator(".machine-card")
      .filter({ hasText: "Проверочная машина" })
      .innerText(),
    /4\s?200/,
  );
  pass("Изменение видно в независимой сессии");
  await card()
    .getByRole("button", { name: "Скрыть: Проверочная машина" })
    .click();
  await card().getByText("Скрыта с сайта — видна только вам").waitFor();
  await visitor.reload();
  await visitor.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
  assert.equal(await visitor.locator(".machine-card").count(), 4);
  pass("Скрытие исключает машину из каталога");
  await card()
    .getByRole("button", { name: "Показать: Проверочная машина" })
    .click();
  await card()
    .getByRole("button", { name: "Скрыть: Проверочная машина" })
    .waitFor();
  pass("Восстановление скрытой карточки");
  await card()
    .getByRole("button", { name: "Удалить: Проверочная машина" })
    .click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  assert.equal(await card().count(), 1);
  pass("Отмена удаления");
  await card()
    .getByRole("button", { name: "Удалить: Проверочная машина" })
    .click();
  await page
    .getByRole("button", { name: "Удалить карточку", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".owner-card:not(.skeleton)").length === 4,
  );
  pass("Удаление с подтверждением");
  assert.equal(
    (
      await page.request.post(base + "/api/machines", {
        headers: { origin: "https://evil.test" },
        data: {},
      })
    ).status(),
    403,
  );
  pass("Защита от постороннего Origin");
  await page.getByRole("button", { name: "Редактировать" }).first().click();
  await page.route("**/api/machines", (r) =>
    r.request().method() === "PUT"
      ? r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Не удалось сохранить изменения" }),
        })
      : r.continue(),
  );
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page.getByRole("dialog").getByRole("alert").waitFor();
  assert.equal(
    await page.getByLabel("Название", { exact: true }).inputValue(),
    "Мини-экскаватор",
  );
  await page.unroute("**/api/machines");
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  pass("Ошибка сохранения не теряет форму");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page
    .getByRole("heading", { name: "Управление вашим парком" })
    .waitFor();
  assert.equal(
    (await page.request.get(base + "/api/machines?all=1")).status(),
    403,
  );
  pass("Выход отзывает доступ");
  await writeFile(
    "outputs/vercel-qa/owner-report.json",
    JSON.stringify(
      {
        checks,
        note: "Supabase HTTP test double; real hosted Supabase has not been connected.",
      },
      null,
      2,
    ),
  );
  console.log(checks.length + " owner checks passed");
} catch (e) {
  await writeFile("outputs/vercel-qa/owner-failure.log", logs);
  await page.screenshot({
    path: "outputs/vercel-qa/owner-failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser.close();
  child.kill();
  await mock.close();
}
