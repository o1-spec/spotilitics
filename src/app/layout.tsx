import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RouteTransition } from "@/components/route-transition";
const display = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
  fallback: ["Arial"],
});
export const metadata: Metadata = {
  title: "Spotlytics — Your music. Your universe.",
  description:
    "Discover the patterns, people, and moments that make your listening story yours.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
