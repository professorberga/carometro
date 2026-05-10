import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carômetro Escolar",
  description: "Sistema de gestão e carômetro escolar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
