import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata = {
  title: "Growth Auditor",
  description:
    "Audit any page for SEO, conversion, trust, and design problems, with ready-to-use fixes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${newsreader.variable}`}>
      <body className="min-h-screen bg-chalk text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
