"use client";
import { useState } from "react";
export default function LoginForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="login-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const form = new FormData(e.currentTarget);
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: form.get("email"),
              password: form.get("password"),
            }),
          });
          const data = await response.json();
          if (!response.ok) throw Error(data.error || "Не удалось войти.");
          window.location.assign("/owner");
        } catch (e) {
          setError((e as Error).message);
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          maxLength={254}
        />
      </label>
      <label className="field">
        Пароль
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
        />
      </label>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Входим…" : "Войти в кабинет"}
      </button>
    </form>
  );
}
