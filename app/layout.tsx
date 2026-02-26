import type { Metadata } from "next";
import { Inter, Oswald, Poppins, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { ReelProvider } from "./providers";
import Navigation from "@/components/Navigation";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clipt — AI-Powered Recruiting Highlight Reels",
  description:
    "Clipt uses AI to automatically generate recruiting highlight reels for high school basketball and football players. Your Game. Your Reel. Your Future.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${oswald.variable} ${poppins.variable} ${bebasNeue.variable} antialiased`}
      >
        <ReelProvider>
          <Navigation />
          {children}
        </ReelProvider>
      </body>
    </html>
  );
}
