import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spur AI Live Chat",
  description: "A mini AI support agent for a live chat widget."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
