import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Аренда спецтехники — подача на объект",
  description:
    "Подберите спецтехнику, рассчитайте аренду и подготовьте заявку владельцу.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
