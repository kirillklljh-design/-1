"use client";
import { useEffect, useRef, useState } from "react";
import { Truck, Send, ArrowUpRight, X, MapPin, Calculator } from "lucide-react";
import { siteConfig } from "./config";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      href="/"
      className={`brand ${small ? "brand-footer" : ""}`}
      aria-label="На главную"
    >
      <span className="brand-icon">
        <Truck size={21} />
      </span>
      <span>
        <strong>{siteConfig.logo}</strong>
        <small>Аренда спецтехники с подачей на объект</small>
      </span>
    </a>
  );
}
export function TelegramButton({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={`btn ${className}`}
        onClick={() =>
          siteConfig.telegram
            ? window.open(
                `https://t.me/${siteConfig.telegram}`,
                "_blank",
                "noopener,noreferrer",
              )
            : setOpen(true)
        }
      >
        <Send size={17} />
        {children || "Написать в Telegram"}
      </button>
      <dialog
        ref={dialog}
        className="dialog contact-dialog"
        aria-label="Контакт для заявок"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <button
          className="icon-btn dialog-close"
          aria-label="Закрыть"
          autoFocus
          onClick={() => setOpen(false)}
        >
          <X size={21} />
        </button>
        <span className="section-kicker">КОНТАКТ ДЛЯ ЗАЯВОК</span>
        <h2>Telegram пока не указан</h2>
        <p>
          Это первая версия сайта. Контакт владельца добавим при настройке под
          компанию. Пока можно рассчитать аренду и скопировать заявку.
        </p>
        <button className="btn btn-primary" onClick={() => setOpen(false)}>
          Понятно <ArrowUpRight size={18} />
        </button>
      </dialog>
    </>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <div className="header-details">
          <span>
            <MapPin size={15} />
            {siteConfig.city}
          </span>
          <span>
            <i className="green-dot" />
            Работаем ежедневно
          </span>
        </div>
        <div className="header-actions">
          <a className="btn btn-outline calculate-nav" href="#calculator">
            <Calculator size={16} />
            Рассчитать стоимость
          </a>
          <TelegramButton className="btn-primary" />
        </div>
      </div>
    </header>
  );
}

export function MachineArt({
  type = "excavator",
  hero = false,
}: {
  type?: string;
  hero?: boolean;
}) {
  const truck = type === "truck",
    loader = type === "loader";
  return (
    <svg
      className={`machine-art ${hero ? "hero-art" : ""}`}
      viewBox="0 0 640 380"
      role="img"
      aria-label="Временная иллюстрация техники"
    >
      <defs>
        <linearGradient
          id={`paint-${type}-${hero}`}
          x1="0"
          y1="0"
          x2="0.9"
          y2="1"
        >
          <stop stopColor="#f4cd73" />
          <stop offset="1" stopColor="#bc873c" />
        </linearGradient>
      </defs>
      <path d="M30 330H610M50 350H590" stroke="currentColor" opacity=".12" />
      <ellipse
        cx="338"
        cy="329"
        rx="245"
        ry="13"
        fill="#18251f"
        opacity=".12"
      />
      {truck ? (
        <g>
          <path
            d="M90 217h300v65H90zM390 160h100l59 74v48H390z"
            fill="#bc502f"
          />
          <path d="M407 176h72l38 51H407z" fill="#394b49" />
          <path d="M231 217V95l85 13 34 87-21 9-37-76-35-4v93" fill="#a64125" />
          <path d="M350 197v30" stroke="#283b32" strokeWidth="7" />
          <path d="M110 281h435" stroke="#29382f" strokeWidth="15" />
          <path d="M529 247h16" stroke="#eee4b9" strokeWidth="7" />
          {[160, 345, 475].map((x) => (
            <g key={x}>
              <circle cx={x} cy="292" r="35" fill="#28352d" />
              <circle cx={x} cy="292" r="17" fill="#acb0a0" />
            </g>
          ))}
        </g>
      ) : loader ? (
        <g>
          <path
            d="M125 258l72-83h34l57 90-20 12-58-73-66 72z"
            fill={`url(#paint-${type}-${hero})`}
          />
          <path d="M65 246l-25 54 117 14 36-44z" fill="#667267" />
          <path
            d="M270 146h113l20 109h122v35H260z"
            fill={`url(#paint-${type}-${hero})`}
          />
          <path d="M278 148l8-68h85l16 68z" fill="#344a44" />
          <path d="M298 92h59l10 49h-74z" fill="#91a6a0" />
          <path d="M275 77h107" stroke="#d5ab5d" strokeWidth="13" />
          {[290, 475].map((x) => (
            <g key={x}>
              <circle cx={x} cy="285" r="51" fill="#26382e" />
              <circle cx={x} cy="285" r="26" fill="#d5b365" />
              <circle cx={x} cy="285" r="11" fill="#797454" />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <rect
            x="272"
            y="268"
            width="265"
            height="59"
            rx="29"
            fill="#2e4034"
          />
          <rect
            x="290"
            y="282"
            width="228"
            height="30"
            rx="15"
            fill="#6a7160"
          />
          {[310, 354, 398, 442, 486].map((x) => (
            <circle key={x} cx={x} cy="297" r="10" fill="#394b3d" />
          ))}
          <path d="M280 243h251v31H280z" fill={`url(#paint-${type}-${hero})`} />
          <path d="M390 140h94l26 109H375z" fill="#354d42" />
          <path d="M402 151h70l18 74h-96z" fill="#9aada0" />
          <path d="M397 147v88M446 147v90" stroke="#354d42" strokeWidth="8" />
          <path d="M380 138h112" stroke="#d2ad60" strokeWidth="12" />
          <path
            d="M369 247l-64-136-132-56-39 27 140 58 47 107z"
            fill={`url(#paint-${type}-${hero})`}
          />
          <path
            d="M173 55L87 215l27 15 83-150z"
            fill={`url(#paint-${type}-${hero})`}
          />
          <path d="M91 213l-23 30-35 14 26 49 62-16 15-50z" fill="#657461" />
          <path
            d="M155 89l-41 83M287 150l30 63"
            stroke="#536653"
            strokeWidth="11"
          />
          <path
            d="M154 90l18-31M113 174l-17 34"
            stroke="#b7bdab"
            strokeWidth="7"
          />
          <circle cx="182" cy="73" r="9" fill="#8e753e" />
          <path d="M278 251h92" stroke="#dcb96b" strokeWidth="11" />
        </g>
      )}
    </svg>
  );
}
export function MachineImage({
  imageKey,
  type,
  name,
}: {
  imageKey: string | null;
  type: string;
  name: string;
}) {
  return (
    <div className={`machine-image art-${type}`}>
      {imageKey ? (
        <img
          src={`/media/${imageKey}`}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.hidden = true;
            e.currentTarget.parentElement?.classList.add("image-failed");
          }}
        />
      ) : (
        <>
          <MachineArt type={type} />
          <span className="placeholder-label">Фото техники — скоро</span>
        </>
      )}
      <span className="image-error">Не удалось загрузить фото</span>
    </div>
  );
}
