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
// Inspect outbound Telegram URLs without contacting the account or sending messages.
await context.route("https://t.me/**", (r) =>
  r.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<title>Telegram test</title>",
  }),
);
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
  // Start lazy image loading before checking all photos at each screen width.
  await page.locator(".fleet-section").scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".machine-image img,.hero-photo")].every(
      i => i.complete && i.naturalWidth > 0,
    ),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
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
    await page.locator(".header-actions").getByRole("button", {name:/Telegram/}).click();
    const contact = page.getByRole("dialog", {name:"Контакт для заявок"});
    await contact.getByRole("heading", {name:"Здесь мы укажем ваш Телеграм",exact:true}).waitFor();
    assert.equal(await contact.evaluate(e=>e.scrollWidth<=e.clientWidth), true);
    await contact.screenshot({path:`outputs/vercel-qa/telegram-${width}.png`});
    await contact.getByRole("button", {name:"Закрыть",exact:true}).click();
    pass(`Фотографии загружены, без горизонтальной прокрутки: ${width}px`);
  }
  await page.getByRole("link", { name: /Подобрать технику/ }).click();
  assert.equal(new URL(page.url()).hash, "#fleet");
  await page.getByRole("link", { name: /Рассчитать стоимость/ }).click();
  assert.equal(new URL(page.url()).hash, "#calculator");
  pass("Переходы к каталогу и калькулятору");
  assert.equal(await page.getByLabel("Количество часов").inputValue(), "2");
  assert.equal(
    await page.locator(".min-shift").filter({ hasText: "— 2 ч" }).count(),
    4,
  );
  await page.getByLabel("Количество часов").fill("1");
  assert.equal(
    await page
      .getByLabel("Количество часов")
      .evaluate((e) => e.validity.rangeUnderflow),
    true,
  );
  await page.getByLabel("Количество часов").fill("2");
  for (const id of ["mini", "excavator", "loader", "truck"]) {
    await page
      .getByLabel("Выбранная техника", { exact: true })
      .selectOption(id);
    assert.equal(
      await page.getByLabel("Количество часов").getAttribute("min"),
      "2",
    );
    assert.equal(await page.getByLabel("Количество часов").inputValue(), "2");
  }
  pass("Минимальная смена 2 часа у всех машин и в калькуляторе");
  const card = page.locator(".machine-card").first();
  await card.hover();
  await page.waitForFunction(() => {
    const t = getComputedStyle(
      document.querySelector(".machine-card"),
    ).transform;
    return t !== "none" && Number(t.split("(")[1].split(",")[0]) > 1.02;
  });
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => {
    const t = getComputedStyle(
      document.querySelector(".machine-card"),
    ).transform;
    return t === "none" || t === "matrix(1, 0, 0, 1, 0, 0)";
  });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    1440,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.hover();
  assert.equal(
    await card.evaluate((e) => getComputedStyle(e).transform),
    "none",
  );
  await page.mouse.move(1, 1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  pass(
    "Карточка увеличивается при наведении и возвращается без сдвигов; reduced motion соблюдён",
  );
  await page
    .locator(".fleet-section")
    .screenshot({ path: "outputs/vercel-qa/updated-fleet.png" });
  assert.equal(
    await page
      .getByRole("heading", { name: "Промежуточная стоимость", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Итоговая стоимость", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.locator(".order-summary").getByRole("button").count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Открыть Telegram", exact: true })
      .count(),
    0,
  );
  pass("Новый заголовок и единственная кнопка «Отправить заявку» в расчёте");
  assert.equal(await page.locator(".order-summary dt").filter({hasText:"Время работы"}).count(), 1);
  assert.equal(await page.locator(".order-summary dt").filter({hasText:"Продолжительность"}).count(), 0);
  await page
    .getByLabel("Выбранная техника", { exact: true })
    .selectOption("loader");
  await page.getByLabel("Количество часов").fill("8");
  assert.match(await page.locator(".summary-total").innerText(), /25\s?600/);
  pass("Расчёт 3200 × 8 = 25 600 ₽");
  await page.getByLabel("Адрес объекта").fill("Тестовый адрес");
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Здесь мы укажем ваш Телеграм" })
    .waitFor();
  pass(
    "Заявка без настроенного контакта показывает заглушку и не открывает чужой чат",
  );
  for (const [zone, expected] of [["city", "25 600 ₽"], ["suburb", "28 600 ₽"], ["remote", "30 600 ₽"]]) {
    await page.getByLabel("Зона доставки").selectOption(zone);
    assert.equal((await page.locator(".summary-total strong").innerText()).replace(/\s/g, " "), expected);
  }
  assert.equal(await page.getByText("Стоимость доставки уточняется по адресу", {exact:true}).count(), 0);
  assert.equal(await page.locator(".delivery-note").count(), 0);
  pass("Доставка 0 / 3000 / 5000 включена в итог, текст отдельного согласования удалён");
  for (const selector of [
    ".header-actions",
    ".hero-buttons",
    ".footer-links",
  ]) {
    await page.locator(selector).getByRole("button", { name: /Telegram/ }).click();
    const contact = page.getByRole("dialog", {name:"Контакт для заявок"});
    await contact.getByRole("heading", {name:"Здесь мы укажем ваш Телеграм", exact:true}).waitFor();
    await contact.getByRole("button", {name:"Понятно"}).click();
  }
  assert.equal(context.pages().length, 1);
  assert.equal(await page.getByText("Ваш логотип", {exact:true}).count(), 2);
  pass("Все три кнопки Telegram показывают заглушку, логотип в шапке и подвале заменён");
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
