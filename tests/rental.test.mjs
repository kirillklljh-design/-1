import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRental,
  validateMachine,
  seedMachines,
} from "../src/rental.ts";

test("Аренда складывается с заданной доставкой, включая бесплатную", () => {
  assert.deepEqual(calculateRental(3200, 8, 4, 5000), {
    rent: 25600,
    total: 30600,
  });
  assert.deepEqual(calculateRental(2500, 4, 4, 0), {
    rent: 10000,
    total: 10000,
  });
});
test("Неуказанная доставка не выдаётся за бесплатную", () =>
  assert.deepEqual(calculateRental(2500, 4, 4, null), {
    rent: 10000,
    total: null,
  }));
test("Часы меньше минимума, дробные и нечисловые значения отклоняются", () => {
  for (const hours of [0, -1, 3, 4.5, NaN, Infinity])
    assert.throws(() => calculateRental(2500, hours, 4, null));
  assert.equal(calculateRental(2500, 1000, 4, null).rent, 2500000);
});
test("Данные карточки проверяются до записи", () => {
  const input = { ...seedMachines[0], name: "  Машина  " };
  assert.equal(validateMachine(input).name, "Машина");
  for (const change of [
    { name: "" },
    { description: "" },
    { rate: 0 },
    { rate: NaN },
    { rate: 2.555 },
    { minHours: 0 },
    { minHours: 1.5 },
    { visible: "yes" },
    { imageKey: "../../secret" },
    { imageKey: "image.svg" },
  ])
    assert.throws(() => validateMachine({ ...input, ...change }));
});
test("Граничные корректные цены и минимальная смена принимаются", () => {
  assert.equal(
    validateMachine({ ...seedMachines[0], rate: 0.01, minHours: 1 }).rate,
    0.01,
  );
});
