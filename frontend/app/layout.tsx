import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = { title: "Wishcart — Smart finds, better buys", description: "Curated deals and products worth discovering." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Header /><main>{children}</main><footer>WISHCART · Curated finds. Trusted stores.</footer></body></html>;
}
