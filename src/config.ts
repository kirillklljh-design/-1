// Эти настройки меняет разработчик при подготовке сайта для нового клиента.
export const siteConfig = {
  logo: "Укажите логотип",
  company: "Аренда спецтехники",
  city: "Екатеринбург",
  telegram: "", // username без @; пустая строка = контакт ещё не настроен
  delivery: [
    { id: "city", label: "В пределах города", price: null as number | null },
    {
      id: "suburb",
      label: "За городом — до 100 км",
      price: null as number | null,
    },
    {
      id: "remote",
      label: "Дальше 100 км от города",
      price: null as number | null,
    },
  ],
};
