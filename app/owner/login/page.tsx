import { redirect } from "next/navigation";
import { isOwner } from "../../../src/server";
import { supabaseConfig } from "../../../src/supabase/config";
import { Brand } from "../../../src/components";
import LoginForm from "../../../src/login-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await isOwner()) redirect("/owner");
  const configured = !!supabaseConfig();
  return (
    <main className="access-page">
      <Brand />
      <div className="access-card">
        <span className="section-kicker">ПАНЕЛЬ ВЛАДЕЛЬЦА</span>
        <h1>
          {configured ? "Управление вашим парком" : "Кабинет ещё не подключён"}
        </h1>
        <p>
          {configured
            ? "Войдите с email и паролем владельца, чтобы добавлять технику и менять стоимость аренды."
            : "Сайт работает в режиме просмотра. Управление карточками станет доступно после подключения кабинета."}
        </p>
        {configured && <LoginForm />}
        <a className="back-link" href="/">
          ← Открыть клиентскую страницу
        </a>
      </div>
    </main>
  );
}
