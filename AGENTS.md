# Работа с проектом

Сайт аренды спецтехники на обычном Next.js 16 / React для Vercel. Данные, фотографии и вход владельца — Supabase. Старые привязки Cloudflare/Sites удалены из исполняемого кода. Страницы/API — app/, интерфейс и расчёт — src/, SQL и RLS — supabase/, статические фото — public/assets/photos/, проверки — tests/.

Запуск: npm ci; npm run dev. Проверки: npm test; node node_modules/typescript/bin/tsc --noEmit; npm run build. Полная инструкция — README.md и DEPLOYMENT.md. Браузерные сценарии используют только изолированное локальное окружение.

Владелец управляет только карточками. Не добавляйте настройки Telegram, доставки, города и брендинга. Статусов доступности нет. Скрытые машины исключаются из публичного API и калькулятора. Запись требует проверки Origin, подтверждённого пользователя Auth и роли владельца; права дополнительно ограничены PostgreSQL RLS. Не используйте localStorage вместо базы и не доверяйте заголовкам Sites.

Без Supabase разрешён только публичный демонстрационный каталог. Не имитируйте успешную запись при отсутствии подключения. Фото до 5 МБ загружаются напрямую по подписанному URL, а не через тело функции Vercel.

Не публикуйте секреты, .env.local, зависимости, .next/, .wrangler/, .sites-runtime/ и outputs/. Реальные ключи не нужны для сборки. Применённые миграции не меняйте; drizzle/ — история прежней D1. Для каждого клиента отдельные проекты. При визуальных изменениях проверяйте 360, 390, 768, 1280, 1440 px и обновляйте QA.md.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
