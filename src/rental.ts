import { isReferencePhoto } from "./photo.ts";
export type Machine = {
  id: string;
  name: string;
  description: string;
  rate: number;
  minHours: number;
  imageKey: string | null;
  visible: boolean;
  sortOrder: number;
};
export const seedMachines: Machine[] = [
  {
    id: "mini",
    name: "Мини-экскаватор",
    description: "Траншеи, фундамент и работы в ограниченном пространстве",
    rate: 2500,
    minHours: 4,
    imageKey: "reference-mini",
    visible: true,
    sortOrder: 0,
  },
  {
    id: "excavator",
    name: "Гусеничный экскаватор",
    description: "Котлованы, демонтаж и большие объёмы грунта",
    rate: 3800,
    minHours: 8,
    imageKey: "reference-excavator",
    visible: true,
    sortOrder: 1,
  },
  {
    id: "loader",
    name: "Фронтальный погрузчик",
    description: "Погрузка грунта, планировка и уборка территории",
    rate: 3200,
    minHours: 4,
    imageKey: "reference-loader",
    visible: true,
    sortOrder: 2,
  },
  {
    id: "truck",
    name: "Манипулятор",
    description: "Перевозка материалов и погрузочные работы",
    rate: 2800,
    minHours: 4,
    imageKey: "reference-truck",
    visible: true,
    sortOrder: 3,
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n) + " ₽";
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function calculateRental(
  rate: number,
  hours: number,
  minimum: number,
  delivery: number | null,
) {
  if (
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isSafeInteger(hours) ||
    hours < minimum ||
    !Number.isSafeInteger(minimum) ||
    minimum < 1
  )
    throw new Error(
      "Укажите целое количество часов не меньше минимальной смены.",
    );
  const rent = rate * hours;
  if (
    !Number.isSafeInteger(Math.round(rent * 100)) ||
    (delivery !== null && (!Number.isFinite(delivery) || delivery < 0))
  )
    throw new Error("Проверьте стоимость и длительность аренды.");
  return { rent, total: delivery === null ? null : rent + delivery };
}
export function validateMachine(
  value: unknown,
): Omit<Machine, "id" | "sortOrder"> {
  if (!value || typeof value !== "object")
    throw new Error("Некорректные данные карточки.");
  const v = value as Record<string, unknown>;
  if (
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.trim().length > 100
  )
    throw new Error("Название: от 1 до 100 символов.");
  if (
    typeof v.description !== "string" ||
    !v.description.trim() ||
    v.description.trim().length > 500
  )
    throw new Error("Описание: от 1 до 500 символов.");
  if (
    typeof v.rate !== "number" ||
    !Number.isFinite(v.rate) ||
    v.rate <= 0 ||
    v.rate > 100000000 ||
    Math.abs(Math.round(v.rate * 100) - v.rate * 100) > 0.00001
  )
    throw new Error(
      "Укажите положительную цену, не более двух знаков после запятой.",
    );
  if (
    typeof v.minHours !== "number" ||
    !Number.isSafeInteger(v.minHours) ||
    v.minHours < 1 ||
    v.minHours > 2147483647
  )
    throw new Error("Минимальная смена — целое число от 1 часа.");
  if (typeof v.visible !== "boolean")
    throw new Error("Некорректная видимость карточки.");
  if (
    v.imageKey !== null &&
    (typeof v.imageKey !== "string" ||
      (!isReferencePhoto(v.imageKey) &&
        !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(v.imageKey)))
  )
    throw new Error("Некорректное фото.");
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    rate: v.rate,
    minHours: v.minHours,
    visible: v.visible,
    imageKey: v.imageKey as string | null,
  };
}
