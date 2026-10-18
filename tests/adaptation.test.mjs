import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sameOrigin } from "../src/request-security.ts";
import {
  isReferencePhoto,
  photoUrl,
  photoExtension,
  MAX_PHOTO_SIZE,
} from "../src/photo.ts";
test("Проверка Origin не доверяет постороннему сайту и отсутствующему заголовку", () => {
  assert.equal(
    sameOrigin(
      new Request("https://example.com/api/machines", {
        headers: { origin: "https://example.com" },
      }),
    ),
    true,
  );
  for (const origin of [
    "https://evil.com",
    "https://example.com.evil.com",
    "http://example.com",
  ])
    assert.equal(
      sameOrigin(
        new Request("https://example.com/api/machines", {
          headers: { origin },
        }),
      ),
      false,
    );
  assert.equal(
    sameOrigin(new Request("https://example.com/api/machines")),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3000/api/machines", {
        headers: {
          host: "rental.vercel.app",
          "x-forwarded-proto": "https",
          origin: "https://rental.vercel.app",
        },
      }),
    ),
    true,
  );
});
test("Фотографии из слайдов используют статические ресурсы, загрузки — media", () => {
  assert.equal(isReferencePhoto("reference-truck"), true);
  assert.equal(isReferencePhoto("reference-arbitrary"), false);
  assert.equal(photoUrl("reference-loader"), "/assets/photos/loader.svg");
  assert.equal(photoUrl("abc.png"), "/media/abc.png");
});
test("Формат фото определяется по сигнатуре и совпадающему MIME", () => {
  assert.equal(
    photoExtension(new Uint8Array([255, 216, 255]), "image/jpeg"),
    "jpg",
  );
  assert.equal(
    photoExtension(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    ),
    "png",
  );
  assert.equal(
    photoExtension(new TextEncoder().encode("RIFFxxxxWEBP"), "image/webp"),
    "webp",
  );
  assert.equal(
    photoExtension(new Uint8Array([255, 216, 255]), "image/png"),
    null,
  );
  assert.equal(
    photoExtension(new TextEncoder().encode("<svg/>"), "image/svg+xml"),
    null,
  );
  assert.equal(MAX_PHOTO_SIZE, 5242880);
});
test("Пять фотографий содержат исходный PNG и заданную область отображения", async () => {
  for (const name of ["hero", "mini", "excavator", "loader", "truck"]) {
    const text = await readFile(`public/assets/photos/${name}.svg`, "utf8");
    assert.match(text, /viewBox="\d+ \d+ \d+ \d+"/);
    assert.match(text, /data:image\/png;base64,iVBOR/);
  }
});
