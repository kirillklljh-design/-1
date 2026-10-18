import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
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
const base = "http://127.0.0.1:5173";
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const checks = [];
const pass = (s) => {
  checks.push(s);
  console.log("PASS", s);
};
try {
  await page.goto(base);
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".machine-card:not(.skeleton)").length === 4,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: async () => {
        throw Error("Denied");
      },
      configurable: true,
    });
  });
  await page.getByLabel("Адрес объекта").fill("Тестовый адрес");
  await page.getByRole("button", { name: "Скопировать заявку" }).click();
  await page.getByLabel("Текст заявки для ручного копирования").waitFor();
  assert.match(
    await page.getByLabel("Текст заявки для ручного копирования").inputValue(),
    /Тестовый адрес/,
  );
  pass("Ручное копирование при отказе Clipboard API");
  await page.route("**/api/machines", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Парк техники обновляется" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Скопировать заявку" }).isDisabled(),
    true,
  );
  await page.unroute("**/api/machines");
  pass("Пустой каталог без неработающего расчёта");
  await page.goto(base + "/signin-with-chatgpt?return_to=%2Fowner");
  await page.getByRole("heading", { name: "Рабочий кабинет" }).waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".owner-card").length === 4,
  );
  await page
    .locator(".owner-card")
    .first()
    .getByRole("button", { name: "Редактировать" })
    .click();
  await page.route("**/api/machines", (r) =>
    r.request().method() === "PUT"
      ? r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Не удалось сохранить изменения. Попробуйте ещё раз.",
          }),
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
  pass("Ошибка сохранения сохраняет заполненную форму");
  await page
    .locator(".owner-card")
    .first()
    .getByRole("button", { name: "Редактировать" })
    .click();
  const png = await page.screenshot({
    clip: { x: 0, y: 0, width: 20, height: 20 },
  });
  await page
    .getByLabel("Фотография техники", { exact: true })
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: png });
  await page.route("**/api/upload", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Не удалось загрузить фото. Попробуйте ещё раз.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Сохранить карточку" }).click();
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "Не удалось загрузить фото" })
    .waitFor();
  await page.unroute("**/api/upload");
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  pass("Ошибка загрузки фото не закрывает редактор");
  await page
    .locator(".owner-card")
    .first()
    .getByRole("button", { name: "Редактировать" })
    .click();
  await page
    .getByLabel("Фотография техники", { exact: true })
    .setInputFiles({
      name: "large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    });
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "до 5 МБ" })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  pass("Ограничение размера фото и закрытие редактора Escape");
  await page
    .getByRole("link", { name: "Открыть клиентскую страницу", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".machine-card:not(.skeleton)").length === 4,
  );
  pass("Возврат из кабинета на клиентскую страницу");
  await page.goto(base + "/owner");
  await page.getByRole("link", { name: "Выйти", exact: true }).click();
  await page.getByRole("link", { name: /Войти через ChatGPT/ }).waitFor();
  pass("Выход из кабинета на мобильном экране");
  await writeFile(
    "outputs/qa/errors-report.json",
    JSON.stringify({ checks, date: new Date().toISOString() }, null, 2),
  );
} finally {
  await browser.close();
}
