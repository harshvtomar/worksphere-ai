import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkSphere AI — Workspace preview",
  description: "Enterprise workflow automation and collaboration, built with clarity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
