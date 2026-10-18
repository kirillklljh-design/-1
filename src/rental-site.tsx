"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Copy,
  HardHat,
  CalendarDays,
  MapPin,
  Calculator,
  Truck,
  ShieldCheck,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  Brand,
  Header,
  MachineArt,
  MachineImage,
  TelegramButton,
} from "./components";
import { siteConfig } from "./config";
import { calculateRental, Machine, money, todayLocal } from "./rental";

export default function RentalSite() {
  const [machines, setMachines] = useState<Machine[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [selected, setSelected] = useState(""),
    [hours, setHours] = useState("4"),
    [address, setAddress] = useState(""),
    [date, setDate] = useState(""),
    [time, setTime] = useState("09:00"),
    [zone, setZone] = useState("city"),
    [comment, setComment] = useState("");
  const [notice, setNotice] = useState(""),
    [copying, setCopying] = useState(false),
    [manualCopy, setManualCopy] = useState(false);
  const [minimumDate, setMinimumDate] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/machines", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: Machine[] = await res.json();
      setMachines(data);
      setSelected((prev) =>
        data.some((m) => m.id === prev) ? prev : data[0]?.id || "",
      );
      setHours((prev) =>
        String(Math.max(Number(prev) || 0, data[0]?.minHours || 1)),
      );
    } catch {
      setError("Не удалось загрузить парк техники. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setDate(todayLocal());
    setMinimumDate(todayLocal());
    void load();
    const refreshDate = () => setMinimumDate(todayLocal());
    window.addEventListener("focus", refreshDate);
    return () => window.removeEventListener("focus", refreshDate);
  }, []);
  const machine = machines.find((m) => m.id === selected);
  const delivery = siteConfig.delivery.find((d) => d.id === zone)!;
  let cost: { rent: number; total: number | null } | null = null;
  try {
    if (machine)
      cost = calculateRental(
        machine.rate,
        Number(hours),
        machine.minHours,
        delivery.price,
      );
  } catch {}
  const choose = (id: string) => {
    const target = machines.find((m) => m.id === id);
    setSelected(id);
    if (target) setHours(String(Math.max(Number(hours) || 0, target.minHours)));
    setNotice("");
  };
  const requestText =
    machine && cost
      ? `Заявка на аренду спецтехники\nТехника: ${machine.name}\nАдрес: ${address}\nДата: ${date.split("-").reverse().join(".")}\nПодача: ${time}\nПродолжительность: ${hours} ч\nСтавка: ${money(machine.rate)}/ч\nДоставка: ${delivery.label}${delivery.price === null ? " — уточняется отдельно" : ` — ${money(delivery.price)}`}\nАренда: ${money(cost.rent)}\n${cost.total === null ? "Предварительная стоимость аренды" : "Предварительный итог"}: ${money(cost.total ?? cost.rent)}${cost.total === null ? " + доставка" : ""}\nКомментарий: ${comment || "Без комментария"}`
      : "";
  async function copyRequest() {
    setCopying(true);
    setManualCopy(false);
    try {
      await navigator.clipboard.writeText(requestText);
      setNotice("Заявка скопирована. Отправьте её владельцу в Telegram.");
    } catch {
      setManualCopy(true);
      setNotice(
        "Не удалось скопировать автоматически. Выделите и скопируйте текст ниже.",
      );
    } finally {
      setCopying(false);
    }
  }
  return (
    <>
      <Header />
      <main>
        <section className="container hero-wrap">
          <div className="hero">
            <div className="hero-copy">
              <div className="hero-location">
                <MapPin size={14} />
                Спецтехника в городе {siteConfig.city}
              </div>
              <h1>
                Спецтехника на
                <br />
                вашем объекте
                <br />
                <em>точно в срок</em>
              </h1>
              <p>
                Выберите технику, укажите адрес и получите предварительный
                расчёт аренды
              </p>
              <div className="hero-buttons">
                <a className="btn btn-primary" href="#fleet">
                  Подобрать технику <ArrowDown size={17} />
                </a>
                <TelegramButton className="btn-dark-outline" />
              </div>
              <div className="hero-stats">
                <div>
                  <strong>{loading ? "—" : machines.length}</strong>
                  <span>единиц техники</span>
                </div>
                <div>
                  <strong>от 2 ч</strong>
                  <span>подача на объект</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-grid" />
              <span className="hero-art-label">МЕСТО ДЛЯ ВАШЕЙ ФОТОГРАФИИ</span>
              <MachineArt hero />
              <div className="hero-badge">
                <ShieldCheck size={25} />
                <div>
                  <span>ГОТОВЫ К РАБОТЕ</span>
                  <strong>Проверенная техника</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="benefits">
            <div>
              <span className="benefit-icon">
                <ShieldCheck size={21} />
              </span>
              <p>
                <strong>Техника под вашу задачу</strong>
                <small>Для частных и крупных объектов</small>
              </p>
            </div>
            <div>
              <span className="benefit-icon">
                <Clock3 size={21} />
              </span>
              <p>
                <strong>Подача от 2 часов</strong>
                <small>
                  По{" "}
                  {siteConfig.city === "Екатеринбург"
                    ? "Екатеринбургу"
                    : siteConfig.city}
                </small>
              </p>
            </div>
            <div>
              <span className="benefit-icon">
                <HardHat size={21} />
              </span>
              <p>
                <strong>Техника с оператором</strong>
                <small>Опытные машинисты</small>
              </p>
            </div>
            <div>
              <span className="benefit-icon">
                <CalendarDays size={21} />
              </span>
              <p>
                <strong>Работаем без выходных</strong>
                <small>Согласуем удобное время</small>
              </p>
            </div>
          </div>
        </section>
        <section id="fleet" className="container fleet-section">
          <div className="section-top">
            <div>
              <span className="section-kicker">НАШ ПАРК</span>
              <h2>Выберите технику под задачу</h2>
            </div>
            <p>
              Вся техника обслужена, укомплектована и подаётся на объект с
              опытным оператором.
            </p>
          </div>
          {loading ? (
            <div className="fleet-grid" aria-label="Загрузка техники">
              {[0, 1, 2, 3].map((n) => (
                <div className="machine-card skeleton" key={n} />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state" role="alert">
              <p>{error}</p>
              <button className="btn btn-outline" onClick={() => void load()}>
                <RefreshCw size={16} />
                Повторить
              </button>
            </div>
          ) : machines.length === 0 ? (
            <div className="empty-state">
              <Truck size={30} />
              <h3>Парк техники обновляется</h3>
              <p>Карточки появятся здесь после добавления владельцем.</p>
            </div>
          ) : (
            <div className="fleet-grid">
              {machines.map((m, i) => (
                <article
                  className={`machine-card ${m.id === selected ? "selected" : ""}`}
                  key={m.id}
                >
                  <div className="card-photo">
                    <MachineImage
                      imageKey={m.imageKey}
                      type={m.id}
                      name={m.name}
                    />
                    <span className="card-number">0{i + 1}</span>
                    {m.id === selected && (
                      <span className="selected-badge">
                        <Check size={13} />
                        Выбрано
                      </span>
                    )}
                  </div>
                  <div className="card-body">
                    <h3>{m.name}</h3>
                    <p>{m.description}</p>
                    <div className="rate">
                      <strong>{money(m.rate)}</strong>
                      <span>/ час</span>
                    </div>
                    <div className="min-shift">
                      <Clock3 size={13} />
                      Минимальная смена — {m.minHours} ч
                    </div>
                    <a
                      className={`btn ${m.id === selected ? "btn-green" : "btn-primary"}`}
                      href="#calculator"
                      onClick={() => choose(m.id)}
                    >
                      {m.id === selected ? "Техника выбрана" : "Выбрать"}
                      <Check size={17} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section id="calculator" className="calculator-section">
          <div className="container">
            <span className="section-kicker">РАСЧЁТ АРЕНДЫ</span>
            <h2>Укажите детали работы</h2>
            <p className="section-subtitle">
              Заполните параметры объекта — стоимость аренды пересчитается
              автоматически.
            </p>
            <div className="calculator-grid">
              <form
                id="rental-form"
                className="rental-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (date < todayLocal()) {
                    setNotice("Выберите сегодняшнюю или будущую дату.");
                    return;
                  }
                  if (!cost) {
                    setNotice("Проверьте количество часов.");
                    return;
                  }
                  void copyRequest();
                }}
              >
                <label className="field full">
                  Выбранная техника
                  <div className="input-icon">
                    <Truck size={17} />
                    <select
                      value={selected}
                      onChange={(e) => choose(e.target.value)}
                      disabled={!machines.length}
                      required
                      aria-label="Выбранная техника"
                    >
                      {!machines.length && (
                        <option value="">
                          {loading
                            ? "Загружаем технику…"
                            : "Нет доступной техники"}
                        </option>
                      )}
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} · {money(m.rate)}/ч
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="field full">
                  Адрес объекта
                  <div className="input-icon">
                    <MapPin size={17} />
                    <input
                      required
                      maxLength={300}
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setNotice("");
                      }}
                      onBlur={() => setAddress((v) => v.trim())}
                      placeholder={`${siteConfig.city}, улица, дом`}
                      autoComplete="street-address"
                    />
                  </div>
                </label>
                <label className="field">
                  Дата начала работ
                  <div className="input-icon">
                    <CalendarDays size={17} />
                    <input
                      type="date"
                      required
                      min={minimumDate}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setNotice("");
                      }}
                    />
                  </div>
                </label>
                <label className="field">
                  Желаемое время подачи
                  <div className="input-icon">
                    <Clock3 size={17} />
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => {
                        setTime(e.target.value);
                        setNotice("");
                      }}
                    />
                  </div>
                </label>
                <label className="field">
                  Количество часов
                  <div className="input-icon">
                    <Clock3 size={17} />
                    <input
                      type="number"
                      required
                      min={machine?.minHours || 1}
                      step="1"
                      value={hours}
                      onChange={(e) => {
                        setHours(e.target.value);
                        setNotice("");
                      }}
                      aria-describedby="hours-hint"
                    />
                  </div>
                  <small id="hours-hint">
                    Минимальная смена — {machine?.minHours ?? "—"} ч
                  </small>
                </label>
                <label className="field">
                  Зона доставки
                  <select
                    value={zone}
                    onChange={(e) => {
                      setZone(e.target.value);
                      setNotice("");
                    }}
                  >
                    {siteConfig.delivery.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.label}
                        {z.price !== null ? ` — ${money(z.price)}` : ""}
                      </option>
                    ))}
                  </select>
                  <small>Стоимость доставки уточняется по адресу</small>
                </label>
                <label className="field full">
                  Комментарий <span className="optional">необязательно</span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    placeholder="Расскажите о задаче, подъезде и особенностях объекта"
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setNotice("");
                    }}
                  />
                </label>
              </form>
              <aside className="order-summary">
                <div className="summary-title">
                  <span>
                    <Calculator size={24} />
                  </span>
                  <div>
                    <small>РАСЧЁТ ЗАКАЗА</small>
                    <h3>Итоговая стоимость</h3>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Техника</dt>
                    <dd>{machine?.name || "Не выбрана"}</dd>
                  </div>
                  <div>
                    <dt>Продолжительность</dt>
                    <dd>{hours || "—"} ч</dd>
                  </div>
                  <div>
                    <dt>Стоимость аренды</dt>
                    <dd>{cost ? money(cost.rent) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Доставка</dt>
                    <dd>
                      {delivery.price === null
                        ? "Уточняется"
                        : money(delivery.price)}
                    </dd>
                  </div>
                </dl>
                <div className="summary-total">
                  <span>{delivery.price === null ? "Аренда от" : "Итого"}</span>
                  <strong>{cost ? money(cost.total ?? cost.rent) : "—"}</strong>
                </div>
                {delivery.price === null && (
                  <p className="delivery-note">
                    + доставка. Её стоимость согласуем отдельно по адресу
                    объекта.
                  </p>
                )}
                <button
                  type="submit"
                  form="rental-form"
                  className="btn btn-primary"
                  disabled={!machine || !cost || copying}
                >
                  <Copy size={17} />
                  {copying ? "Копируем…" : "Скопировать заявку"}
                  <ArrowRight size={17} />
                </button>
                <TelegramButton className="btn-dark-outline">
                  Открыть Telegram <ArrowUpRight size={16} />
                </TelegramButton>
                <p className="summary-help">
                  Скопируйте заявку и отправьте владельцу.
                  <br />
                  Расчёт предварительный, без бронирования.
                </p>
                <div
                  className={`copy-notice ${notice ? "has-notice" : ""}`}
                  role="status"
                >
                  {notice}
                </div>
                {manualCopy && (
                  <textarea
                    className="manual-copy"
                    aria-label="Текст заявки для ручного копирования"
                    readOnly
                    value={requestText}
                    rows={10}
                    onFocus={(e) => e.target.select()}
                  />
                )}
              </aside>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <Brand small />
            <p>Аренда спецтехники с подачей на объект</p>
            <span className="footer-city">
              <MapPin size={15} />
              {siteConfig.city}
            </span>
          </div>
          <div className="footer-links">
            <TelegramButton className="telegram-text" />
            <a href="/owner">
              Панель владельца <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} · {siteConfig.company}
          </span>
          <span>Условия и стоимость уточняются при согласовании заявки</span>
        </div>
      </footer>
    </>
  );
}
