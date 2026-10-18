"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  X,
  Upload,
  CheckCircle2,
  LogOut,
  Truck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Brand, MachineImage } from "./components";
import { Machine, money, validateMachine } from "./rental";
import { photoUrl, photoExtension, MAX_PHOTO_SIZE } from "./photo";
import { browserSupabase } from "./supabase/client";
import { PHOTO_BUCKET } from "./supabase/config";

export default function OwnerPanel() {
  const [machines, setMachines] = useState<Machine[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [editing, setEditing] = useState<Machine | null>(null),
    [deleting, setDeleting] = useState<Machine | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [formError, setFormError] = useState(""),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    confirm = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/machines?all=1", { cache: "no-store" });
      const data = (await r.json()) as Machine[] & { error?: string };
      if (!r.ok) throw Error(data.error);
      setMachines(data);
    } catch (e) {
      setError((e as Error).message || "Не удалось загрузить технику.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (editing) {
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      returnFocus.current?.focus();
    }
  }, [editing]);
  useEffect(() => {
    if (deleting) confirm.current?.showModal();
    else {
      confirm.current?.close();
      returnFocus.current?.focus();
    }
  }, [deleting]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  function edit(m?: Machine) {
    returnFocus.current = document.activeElement as HTMLElement;
    setFormError("");
    setFile(null);
    setEditing(
      m
        ? { ...m }
        : {
            id: "",
            name: "",
            description: "",
            rate: 2500,
            minHours: 4,
            imageKey: null,
            visible: true,
            sortOrder: 0,
          },
    );
  }
  async function mutate(method: string, data: unknown) {
    const r = await fetch("/api/machines", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = (await r.json()) as { error?: string; key: string };
    if (!r.ok) throw Error(result.error || "Не удалось сохранить изменения.");
  }
  async function save() {
    if (!editing) return;
    setFormError("");
    try {
      validateMachine(editing);
    } catch (e) {
      setFormError((e as Error).message);
      return;
    }
    setBusy(true);
    try {
      let imageKey = editing.imageKey;
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!photoExtension(bytes, file.type) || file.size > MAX_PHOTO_SIZE)
          throw Error("Выберите корректное фото JPG, PNG или WebP до 5 МБ.");
        const r = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: file.type, size: file.size }),
        });
        const result = (await r.json()) as {
          error?: string;
          key: string;
          token: string;
        };
        if (!r.ok) throw Error(result.error);
        const { error: uploadError } = await browserSupabase()
          .storage.from(PHOTO_BUCKET)
          .uploadToSignedUrl(result.key, result.token, file, {
            contentType: file.type,
          });
        if (uploadError)
          throw Error("Не удалось загрузить фото. Попробуйте ещё раз.");
        imageKey = result.key;
      }
      await mutate(editing.id ? "PUT" : "POST", { ...editing, imageKey });
      setEditing(null);
      setMessage("Карточка сохранена. Изменения уже на сайте.");
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(m: Machine) {
    setBusy(true);
    setMessage("");
    try {
      await mutate("PUT", { ...m, visible: !m.visible });
      setMessage(
        m.visible
          ? "Карточка скрыта с сайта."
          : "Карточка снова видна на сайте.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await mutate("DELETE", { id: deleting.id });
      setDeleting(null);
      setMessage("Карточка удалена.");
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const update = (data: Partial<Machine>) =>
    setEditing((prev) => (prev ? { ...prev, ...data } : prev));
  return (
    <>
      <header className="owner-header">
        <div className="container header-inner">
          <Brand />
          <div className="owner-header-actions">
            <a
              className="btn btn-outline"
              href="/"
              aria-label="Открыть клиентскую страницу"
            >
              <ArrowLeft size={16} />
              <span>Открыть клиентскую страницу</span>
            </a>
            <form action="/api/auth/logout" method="post">
              <button
                className="btn btn-outline logout"
                aria-label="Выйти"
                type="submit"
              >
                <LogOut size={16} />
                <span>Выйти</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="container owner-main">
        <span className="section-kicker">УПРАВЛЕНИЕ ПАРКОМ</span>
        <div className="owner-title">
          <div>
            <h1>Рабочий кабинет</h1>
            <p>
              Ваш парк техники, фотографии и стоимость аренды — в одном месте.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => edit()}>
            <Plus size={18} />
            Добавить технику
          </button>
        </div>
        <div className="owner-overview">
          <span className="overview-icon">
            <Truck size={26} />
          </span>
          <div>
            <strong>{machines.length}</strong>
            <span>единиц в вашем парке</span>
          </div>
          <div className="overview-divider" />
          <div>
            <strong>{machines.filter((m) => m.visible).length}</strong>
            <span>показываются на сайте</span>
          </div>
          <p>
            Цены указаны в рублях.
            <br />
            Изменения появляются после сохранения.
          </p>
        </div>
        <div className="owner-list-heading">
          <h2>Карточки техники</h2>
          <span>Управляйте тем, что видят ваши клиенты</span>
        </div>
        {message && (
          <div className="success-message" role="status">
            <CheckCircle2 size={18} />
            {message}
            <button
              className="icon-btn"
              aria-label="Закрыть уведомление"
              onClick={() => setMessage("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            {error}
            <button className="btn btn-outline" onClick={() => void load()}>
              <RefreshCw size={15} />
              Повторить
            </button>
          </div>
        )}
        {loading ? (
          <div className="owner-grid">
            {[0, 1].map((n) => (
              <div className="owner-card skeleton" key={n} />
            ))}
          </div>
        ) : machines.length === 0 && !error ? (
          <div className="empty-state">
            <Truck size={35} />
            <h3>Начните с первой машины</h3>
            <p>Добавьте фотографию, описание и стоимость аренды.</p>
            <button className="btn btn-primary" onClick={() => edit()}>
              <Plus size={17} />
              Добавить технику
            </button>
          </div>
        ) : (
          <div className="owner-grid">
            {machines.map((m) => (
              <article
                className={`owner-card ${!m.visible ? "is-hidden" : ""}`}
                key={m.id}
              >
                <div className="owner-card-top">
                  <MachineImage
                    imageKey={m.imageKey}
                    type={m.id}
                    name={m.name}
                  />
                  <div>
                    <span className="section-kicker">ТЕХНИКА</span>
                    <h3>{m.name}</h3>
                    <p>{m.description}</p>
                  </div>
                </div>
                <div className="owner-card-values">
                  <div>
                    <small>Цена за час</small>
                    <strong>
                      {money(m.rate)} <span>/ ч</span>
                    </strong>
                  </div>
                  <div>
                    <small>Минимальная смена</small>
                    <strong>
                      {m.minHours} <span>ч</span>
                    </strong>
                  </div>
                </div>
                <div className="owner-card-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => edit(m)}
                    disabled={busy}
                  >
                    <Pencil size={15} />
                    Редактировать
                  </button>
                  <button
                    className="btn btn-subtle"
                    onClick={() => void toggle(m)}
                    disabled={busy}
                    aria-label={`${m.visible ? "Скрыть" : "Показать"}: ${m.name}`}
                  >
                    {m.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{m.visible ? "Скрыть" : "Показать"}</span>
                  </button>
                  <button
                    className="icon-btn delete-btn"
                    aria-label={`Удалить: ${m.name}`}
                    disabled={busy}
                    onClick={() => {
                      returnFocus.current =
                        document.activeElement as HTMLElement;
                      setFormError("");
                      setDeleting(m);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                {!m.visible && (
                  <div className="hidden-label">
                    <EyeOff size={13} />
                    Скрыта с сайта — видна только вам
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="owner-bottom-note">
          Логотип, контакты и тарифы доставки настраиваются при подготовке сайта
          под компанию.
        </div>
      </main>
      <dialog
        ref={dialog}
        className="dialog editor-dialog"
        aria-labelledby="editor-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setEditing(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) setEditing(null);
        }}
      >
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="dialog-heading">
              <div>
                <span className="section-kicker">КАРТОЧКА ТЕХНИКИ</span>
                <h2 id="editor-title">
                  {editing.id ? "Редактировать технику" : "Добавить технику"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Закрыть редактор"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                <X size={22} />
              </button>
            </div>
            <fieldset disabled={busy}>
              <div className="upload-area">
                {preview ? (
                  <img src={preview} alt="Предпросмотр фотографии" />
                ) : editing.imageKey ? (
                  <img src={photoUrl(editing.imageKey)} alt={editing.name} />
                ) : (
                  <div className="upload-placeholder">
                    <Upload size={26} />
                    <strong>Фотография техники</strong>
                    <span>JPG, PNG или WebP · до 5 МБ</span>
                  </div>
                )}
                <label className="btn btn-outline upload-btn">
                  <Upload size={15} />
                  {file || editing.imageKey ? "Заменить фото" : "Выбрать фото"}
                  <input
                    className="file-input"
                    aria-label="Фотография техники"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        ) ||
                        f.size > 5 * 1024 * 1024
                      ) {
                        setFormError("Выберите JPG, PNG или WebP до 5 МБ.");
                        e.target.value = "";
                        return;
                      }
                      setFormError("");
                      setFile(f);
                    }}
                  />
                </label>
                {(file || editing.imageKey) && (
                  <button
                    className="btn btn-subtle"
                    type="button"
                    onClick={() => {
                      setFile(null);
                      update({ imageKey: null });
                    }}
                  >
                    Убрать фото
                  </button>
                )}
              </div>
              <label className="field">
                Название
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={editing.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Например, Мини-экскаватор"
                />
              </label>
              <label className="field">
                Описание
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={editing.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Для каких задач подходит техника"
                />
              </label>
              <div className="editor-pricing">
                <label className="field">
                  Цена за час, ₽
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    max="100000000"
                    value={Number.isNaN(editing.rate) ? "" : editing.rate}
                    onChange={(e) => update({ rate: e.target.valueAsNumber })}
                  />
                </label>
                <label className="field">
                  Минимальная смена, ч
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={
                      Number.isNaN(editing.minHours) ? "" : editing.minHours
                    }
                    onChange={(e) =>
                      update({ minHours: e.target.valueAsNumber })
                    }
                  />
                </label>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editing.visible}
                  onChange={(e) => update({ visible: e.target.checked })}
                />
                Показывать карточку на сайте
              </label>
            </fieldset>
            {formError && (
              <div className="error-message" role="alert">
                {formError}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="btn btn-outline"
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Отмена
              </button>
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? (
                  <Loader2 className="spinning" size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}{" "}
                {busy ? "Сохраняем…" : "Сохранить карточку"}
              </button>
            </div>
          </form>
        )}
      </dialog>
      <dialog
        ref={confirm}
        className="dialog confirm-dialog"
        aria-labelledby="delete-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setDeleting(null);
        }}
      >
        {deleting && (
          <>
            <span className="delete-circle">
              <Trash2 size={25} />
            </span>
            <h2 id="delete-title">Удалить карточку?</h2>
            <p>
              «{deleting.name}» будет удалена из кабинета и с сайта. Чтобы
              временно убрать технику, используйте скрытие.
            </p>
            {formError && (
              <div className="error-message" role="alert">
                {formError}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="btn btn-outline"
                disabled={busy}
                onClick={() => setDeleting(null)}
                autoFocus
              >
                Отмена
              </button>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Удаляем…" : "Удалить карточку"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
