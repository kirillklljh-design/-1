import test from "node:test";
import assert from "node:assert/strict";
import { telegramDraftUrl } from "../src/telegram.ts";
import { seedMachines, calculateRental } from "../src/rental.ts";
import { readFile } from "node:fs/promises";
import { photoUrl } from "../src/photo.ts";
test("Фото мини-экскаватора заменено восстановленным изображением высокого разрешения", async () => {
  assert.equal(photoUrl("reference-mini"), "/assets/photos/mini-restored.png");
  const png = await readFile(`public${photoUrl("reference-mini")}`);
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.ok(png.readUInt32BE(16) >= 1200);
  assert.ok(png.readUInt32BE(20) >= 700);
});
test("Все исходные машины доступны от двух часов", () => {
  for (const machine of seedMachines) {
    assert.equal(machine.minHours, 2);
    assert.equal(
      calculateRental(machine.rate, 2, machine.minHours, null).rent,
      machine.rate * 2,
    );
  }
});
test("Telegram получает адресата и полный текст без потери спецсимволов", () => {
  const text = "Заявка\nАдрес: улица & дом + 2\nКомментарий: #1 ?";
  const url = new URL(telegramDraftUrl("@aktiiin", text));
  assert.equal(url.origin + url.pathname, "https://t.me/aktiiin");
  assert.equal(url.searchParams.get("text"), text);
  assert.equal(telegramDraftUrl("", text), null);
  assert.equal(telegramDraftUrl("evil.test/path", text), null);
});
