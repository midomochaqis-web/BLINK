import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLINK AI — Build with structure",
  description: "An AI application builder designed around architecture, security, and verified changes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
