export function telegramDraftUrl(username: string, text: string) {
  const account = username.replace(/^@/, "");
  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(account)) return null;
  return `https://t.me/${account}?${new URLSearchParams({ text })}`;
}
