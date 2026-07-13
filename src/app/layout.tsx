import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Galeria de Defensores — RPG Online 3D&T",
  description: "Gerencie suas fichas de personagem, customize seus próprios sistemas de regras (Sandbox) e jogue RPG 3D&T online em tempo real com dados físicos e chat integrado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-[#070b19] font-sans text-slate-100">{children}</body>
    </html>
  );
}
