import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
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
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage(),
  checks = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:5173";
await mkdir("outputs/vercel-qa", { recursive: true });
const pass = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
try {
  await page.goto(base);
  await page.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".machine-image img,.hero-photo")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    const sizes = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.equal(sizes.width, sizes.scroll);
    await page.screenshot({
      path: `outputs/vercel-qa/site-${width}.png`,
      fullPage: true,
    });
    pass(`Фотографии загружены, без горизонтальной прокрутки: ${width}px`);
  }
  await page.getByRole("link", { name: /Подобрать технику/ }).click();
  assert.equal(new URL(page.url()).hash, "#fleet");
  await page.getByRole("link", { name: /Рассчитать стоимость/ }).click();
  assert.equal(new URL(page.url()).hash, "#calculator");
  pass("Переходы к каталогу и калькулятору");
  await page
    .getByLabel("Выбранная техника", { exact: true })
    .selectOption("loader");
  await page.getByLabel("Количество часов").fill("8");
  assert.match(await page.locator(".summary-total").innerText(), /25\s?600/);
  pass("Расчёт 3200 × 8 = 25 600 ₽");
  await page.getByLabel("Адрес объекта").fill("Тестовый адрес");
  await page.getByRole("button", { name: "Скопировать заявку" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Заявка скопирована" })
    .waitFor();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /Фронтальный погрузчик/,
  );
  pass("Полная заявка копируется");
  for (const zone of ["city", "suburb", "remote"])
    await page.getByLabel("Зона доставки").selectOption(zone);
  pass("Три зоны доставки");
  for (const selector of [
    ".header-actions",
    ".hero-buttons",
    ".order-summary",
    ".footer-links",
  ]) {
    await page
      .locator(selector)
      .getByRole("button", { name: /Telegram/ })
      .click();
    await page
      .getByRole("dialog", { name: "Контакт для заявок" })
      .getByRole("button", { name: "Понятно" })
      .click();
  }
  pass("Все четыре кнопки Telegram");
  for (const method of ["POST", "PUT", "DELETE"])
    assert.equal(
      (
        await page.request.fetch(base + "/api/machines", {
          method,
          data: {},
          headers: { origin: base },
        })
      ).status(),
      403,
    );
  assert.equal(
    (await page.request.get(base + "/api/machines?all=1")).status(),
    403,
  );
  assert.equal(
    (
      await page.request.get(base + "/api/machines?all=1", {
        headers: {
          "oai-authenticated-user-id": "local_seedy",
          "oai-authenticated-user-email": "old-owner@example.test",
        },
      })
    ).status(),
    403,
  );
  pass(
    "Защита записи и скрытых карточек, старые заголовки Sites не дают доступ",
  );
  await page.getByRole("link", { name: /Панель владельца/ }).click();
  await page
    .getByRole("heading", { name: "Кабинет ещё не подключён" })
    .waitFor();
  assert.match(page.url(), /\/owner\/login$/);
  pass("Без подключения база и сохранение не имитируются");
  assert.equal(
    (
      await page.request.post(base + "/api/auth/login", {
        data: { email: "test@example.com", password: "test-password" },
        headers: { origin: base },
      })
    ).status(),
    503,
  );
  pass("Нет входа с фиктивными данными");
  await page.getByRole("link", { name: /Открыть клиентскую страницу/ }).click();
  await page.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: async () => {
        throw Error("Denied");
      },
      configurable: true,
    }),
  );
  await page.getByLabel("Адрес объекта").fill("Адрес для ручного копирования");
  await page.getByRole("button", { name: "Скопировать заявку" }).click();
  await page.getByLabel("Текст заявки для ручного копирования").waitFor();
  pass("Ручное копирование при отказе доступа к буферу");
  await page.route("**/api/machines", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Парк техники обновляется" })
    .waitFor();
  await page.unroute("**/api/machines");
  pass("Пустой каталог");
  await page.route("**/api/machines", (r) =>
    r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.reload();
  await page
    .getByRole("alert")
    .filter({ hasText: "Не удалось загрузить парк техники" })
    .waitFor();
  await page.unroute("**/api/machines");
  await page.getByRole("button", { name: "Повторить" }).click();
  await page.locator(".machine-card:not(.skeleton)").nth(3).waitFor();
  pass("Ошибка чтения и повторная попытка");
  assert.deepEqual(errors, []);
  await writeFile(
    "outputs/vercel-qa/public-report.json",
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(checks.length + " checks passed");
} catch (e) {
  await page.screenshot({
    path: "outputs/vercel-qa/failure.png",
    fullPage: true,
  });
  throw e;
} finally {
  await browser.close();
}
