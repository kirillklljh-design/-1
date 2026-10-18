import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import { isOwner } from "../../src/server";
import OwnerPanel from "../../src/owner-panel";
import { Brand } from "../../src/components";
export const dynamic = "force-dynamic";
export default async function OwnerPage() {
  const user = await getChatGPTUser();
  if (!user)
    return (
      <main className="access-page">
        <Brand />
        <div className="access-card">
          <span className="section-kicker">ПАНЕЛЬ ВЛАДЕЛЬЦА</span>
          <h1>Управление вашим парком</h1>
          <p>
            Войдите через ChatGPT, чтобы добавлять технику и менять стоимость
            аренды.
          </p>
          <a
            className="btn btn-primary"
            href={chatGPTSignInPath("/owner")}
            target="_top"
          >
            Войти через ChatGPT →
          </a>
          <a className="back-link" href="/">
            ← Открыть клиентскую страницу
          </a>
        </div>
      </main>
    );
  if (!(await isOwner()))
    return (
      <main className="access-page">
        <Brand />
        <div className="access-card">
          <h1>Нет доступа к кабинету</h1>
          <p>Эта учётная запись не назначена владельцем сайта.</p>
          <a
            className="btn btn-primary"
            href="/signout-with-chatgpt?return_to=%2Fowner"
            target="_top"
          >
            Сменить аккаунт
          </a>
          <a className="back-link" href="/">
            ← На главную
          </a>
        </div>
      </main>
    );
  return <OwnerPanel />;
}
