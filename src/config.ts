// Эти настройки меняет разработчик при подготовке сайта для нового клиента.
export const siteConfig = {
  logo: "Ваш логотип",
  company: "Аренда спецтехники",
  city: "Ваш город",
  cityDative: "вашему городу",
  telegram: "", // username без @; пустая строка = контакт ещё не настроен
  telegramPlaceholder: "Здесь мы укажем ваш Телеграм",
  delivery: [
    { id: "city", label: "В пределах города", price: 0 as number | null },
    {
      id: "suburb",
      label: "За городом — до 100 км",
      price: 3000 as number | null,
    },
    {
      id: "remote",
      label: "Дальше 100 км от города",
      price: 5000 as number | null,
    },
  ],
};
