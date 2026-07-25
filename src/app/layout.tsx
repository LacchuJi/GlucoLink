import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlucoLink | Connected diabetes care",
  description: "Remote diabetes monitoring for care teams and patients.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
