// Requires an already running local Vinext preview and Playwright (or PLAYWRIGHT_MODULE).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Run only against a local test database",
);
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(edge) ? { executablePath: edge } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
// Remove only this scenario's fixture after an interrupted previous test run.
const fixtureContext = await browser.newContext();
await fixtureContext.request.get(
  base + "/signin-with-chatgpt?return_to=%2Fowner",
);
const fixtureResponse = await fixtureContext.request.get(
  base + "/api/machines?all=1",
);
if (fixtureResponse.ok())
  for (const m of await fixtureResponse.json())
    if (m.name === "Тестовая машина")
      await fixtureContext.request.delete(base + "/api/machines", {
        data: { id: m.id },
        headers: { origin: base },
      });
await fixtureContext.close();
const errors = [],
  failed = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`);
});
await mkdir("outputs/qa", { recursive: true });
const check = (name) => {
  checks.push(name);
  console.log("PASS", name);
};
async function visibleCount(n) {
  await page.waitForFunction(
    (n) =>
      document.querySelectorAll(".machine-card:not(.skeleton)").length === n,
    n,
  );
}
async function noOverflow(label) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  assert.ok(
    result.width <= result.viewport,
    `${label}: ${JSON.stringify(result)}`,
  );
  check(label + " — без горизонтальной прокрутки");
}
try {
  await page.goto(base);
  await visibleCount(4);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    (await page.request.get(base + "/api/machines?all=1")).status(),
    403,
  );
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
    (
      await page.request.post(base + "/api/upload", {
        headers: { origin: base },
      })
    ).status(),
    403,
  );
  check("API запрещает чтение скрытых карточек и все записи без входа");
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(`Клиентская страница ${width}px`);
    await page.screenshot({
      path: `outputs/qa/site-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: /Подобрать технику/ }).click();
  assert.equal(new URL(page.url()).hash, "#fleet");
  await page.getByRole("link", { name: /Рассчитать стоимость/ }).click();
  assert.equal(new URL(page.url()).hash, "#calculator");
  check("Навигация к каталогу и расчёту");
  for (const card of await page.locator(".machine-card").all()) {
    await card.getByRole("link").click();
    const name = await card.locator("h3").innerText();
    assert.ok(
      (await page.locator(".order-summary dl").innerText()).includes(name),
    );
  }
  check("Выбор каждой из четырёх машин обновляет расчёт");
  await page
    .getByLabel("Выбранная техника", { exact: true })
    .selectOption("loader");
  await page.getByLabel("Количество часов").fill("8");
  assert.match(await page.locator(".summary-total").innerText(), /25\s?600/);
  for (const zone of ["city", "suburb", "remote"]) {
    await page.getByLabel("Зона доставки").selectOption(zone);
    assert.match(
      await page.locator(".delivery-note").innerText(),
      /согласуем отдельно/,
    );
  }
  check("Все зоны доставки и аренда 3200 × 8 = 25 600 ₽");
  const hours = page.getByLabel("Количество часов");
  await hours.fill("3");
  assert.equal(await hours.evaluate((e) => e.validity.rangeUnderflow), true);
  await hours.fill("4.5");
  assert.equal(await hours.evaluate((e) => e.validity.stepMismatch), true);
  await page
    .getByLabel("Выбранная техника", { exact: true })
    .selectOption("excavator");
  assert.equal(await hours.inputValue(), "8");
  check("Минимум часов, целочисленность и смена машины");
  await page.getByRole("button", { name: "Скопировать заявку" }).click();
  assert.equal(
    await page
      .getByLabel("Адрес объекта")
      .evaluate((e) => e.validity.valueMissing),
    true,
  );
  await page
    .getByLabel("Адрес объекта")
    .fill("Екатеринбург, ул. Монтажников, 18");
  await page.getByLabel("Дата начала работ").fill("2020-01-01");
  assert.equal(
    await page
      .getByLabel("Дата начала работ")
      .evaluate((e) => e.validity.rangeUnderflow),
    true,
  );
  await page.getByLabel("Дата начала работ").fill("2027-01-15");
  await page.getByLabel("Комментарий").fill("Нужно подготовить площадку");
  await page.getByRole("button", { name: "Скопировать заявку" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Заявка скопирована" })
    .waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(clip, /Монтажников/);
  assert.match(clip, /30\s?400/);
  assert.match(clip, /Дальше 100 км/);
  check("Обязательные поля, запрет прошедшей даты и копирование полной заявки");
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
    const dlg = page.getByRole("dialog", { name: "Контакт для заявок" });
    await dlg.waitFor();
    assert.match(await dlg.innerText(), /Telegram пока не указан/);
    await dlg.getByRole("button", { name: "Понятно" }).click();
  }
  check("Все четыре кнопки Telegram открывают корректное уведомление");
  await page.getByRole("link", { name: /Панель владельца/ }).click();
  await page.getByRole("link", { name: /Войти через ChatGPT/ }).waitFor();
  await page.getByRole("link", { name: /Войти через ChatGPT/ }).click();
  await page.getByRole("heading", { name: "Рабочий кабинет" }).waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".owner-card").length === 4,
  );
  check("Ссылка в кабинет и локальный вход через ChatGPT");
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await noOverflow(`Кабинет ${width}px`);
    await page.screenshot({
      path: `outputs/qa/owner-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page
    .getByRole("button", { name: "Добавить технику", exact: true })
    .click();
  await noOverflow("Редактор карточки 390px");
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  assert.equal(await page.locator("dialog[open]").count(), 0);
  check("Отмена добавления");
  await page
    .getByRole("button", { name: "Добавить технику", exact: true })
    .click();
  await page.getByLabel("Название", { exact: true }).fill("Тестовая машина");
  await page
    .getByLabel("Описание", { exact: true })
    .fill("Машина для проверки сохранения и загрузки фотографии");
  await page.getByLabel("Цена за час, ₽").fill("4100");
  await page.getByLabel("Минимальная смена, ч").fill("6");
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: 20, height: 20 },
  });
  await page
    .getByLabel("Фотография техники", { exact: true })
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page
    .getByRole("heading", { name: "Тестовая машина", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Тестовая машина", exact: true })
    .waitFor();
  check("Добавление с фото и сохранение после перезагрузки");
  const testCard = () =>
    page
      .locator(".owner-card")
      .filter({ has: page.getByRole("heading", { name: /Тестовая машина/ }) });
  await testCard().getByRole("button", { name: "Редактировать" }).click();
  await page.getByLabel("Цена за час, ₽").fill("4200");
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".owner-card")].some(
      (e) =>
        e.textContent.includes("Тестовая машина") &&
        e.textContent.includes("4 200"),
    ),
  );
  check("Редактирование цены");
  const second = await browser.newContext();
  const visitor = await second.newPage();
  await visitor.goto(base);
  await visibleVisitor(5);
  assert.match(
    await visitor
      .locator(".machine-card")
      .filter({ hasText: "Тестовая машина" })
      .innerText(),
    /4\s?200/,
  );
  check("Изменения доступны в независимом браузерном сеансе");
  await testCard()
    .getByRole("button", { name: "Скрыть: Тестовая машина", exact: true })
    .click();
  await testCard().getByText("Скрыта с сайта — видна только вам").waitFor();
  await visitor.reload();
  await visibleVisitor(4);
  assert.equal(
    await visitor
      .getByLabel("Выбранная техника", { exact: true })
      .locator("option")
      .count(),
    4,
  );
  check("Скрытая машина отсутствует в каталоге и калькуляторе");
  await testCard()
    .getByRole("button", { name: "Показать: Тестовая машина", exact: true })
    .click();
  await testCard()
    .getByRole("button", { name: "Скрыть: Тестовая машина", exact: true })
    .waitFor();
  await visitor.reload();
  await visibleVisitor(5);
  check("Восстановление скрытой карточки");
  await testCard()
    .getByRole("button", { name: "Удалить: Тестовая машина", exact: true })
    .click();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  assert.equal(await testCard().count(), 1);
  check("Отмена удаления");
  await testCard()
    .getByRole("button", { name: "Удалить: Тестовая машина", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Удалить карточку", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".owner-card").length === 4,
  );
  await visitor.reload();
  await visibleVisitor(4);
  await second.close();
  check("Удаление карточки с подтверждением");
  const forbidden = await page.request.post(base + "/api/machines", {
    data: {},
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(forbidden.status(), 403);
  check("Защита от запросов с постороннего сайта");
  assert.equal(
    (
      await page.request.post(base + "/api/machines", {
        data: { name: "" },
        headers: { origin: base },
      })
    ).status(),
    400,
  );
  check("Серверная валидация карточки");
  const badUpload = await page.request.post(base + "/api/upload", {
    headers: { origin: base },
    multipart: {
      file: {
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      },
    },
  });
  assert.equal(badUpload.status(), 400);
  check("Сервер отклоняет недопустимый формат фото");
  await page.route("**/api/machines?all=1", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Проверка ошибки загрузки" }),
    }),
  );
  await page.reload();
  await page
    .getByRole("alert")
    .filter({ hasText: "Проверка ошибки загрузки" })
    .waitFor();
  await page.unroute("**/api/machines?all=1");
  await page.getByRole("button", { name: "Повторить" }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".owner-card").length === 4,
  );
  check("Ошибка загрузки и повторная попытка");
  await page.getByRole("link", { name: "Выйти" }).click();
  await page.getByRole("link", { name: /Войти через ChatGPT/ }).waitFor();
  check("Выход из кабинета");
  // Deliberately injected 503 is expected; no unexpected server errors.
  assert.deepEqual(
    failed.filter((x) => !x.endsWith("/api/machines?all=1")),
    [],
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "outputs/qa/report.json",
    JSON.stringify(
      { checks, errors, failed, date: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(`\n${checks.length} checks passed`);
  async function visibleVisitor(n) {
    await visitor.waitForFunction(
      (n) =>
        document.querySelectorAll(".machine-card:not(.skeleton)").length === n,
      n,
    );
  }
} catch (e) {
  await page.screenshot({ path: "outputs/qa/failure.png", fullPage: true });
  await writeFile(
    "outputs/qa/failure.txt",
    `${e.stack}\nURL: ${page.url()}\n${errors.join("\n")}\n${failed.join("\n")}`,
  );
  throw e;
} finally {
  await browser.close();
}
