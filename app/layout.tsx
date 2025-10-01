import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider, HeaderWallet, NetworkGuard } from "./wallet-provider";
import Link from "next/link";
import Image from "next/image";
import RelayerSetup from "./relayer-setup";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrivyGive",
  description: "PrivyGive - Private donation/crowdfunding/sponsorship/membership/tipping platform based on Zama FHE",
  icons: {
    icon: "/heart-pixel.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RelayerSetup />
        <WalletProvider>
          <NetworkGuard>
            <header className="w-full border-b border-black/15">
              <div className="mx-auto max-w-6xl px-4 h-14 grid grid-cols-[auto_1fr] items-center">
                <div className="flex items-center gap-6">
                  <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold hover:opacity-80">
                    <Image src="/heart-pixel.svg" alt="PrivyGive" width={20} height={20} priority />
                    PrivyGive
                  </Link>
                  <nav className="flex items-center gap-6 text-sm">
                    <Link className="hover:underline" href="/swap">Swap</Link>
                    <Link className="hover:underline" href="/projects">Discover</Link>
                    <Link className="hover:underline" href="/create">Create</Link>
                  </nav>
                </div>
                <div className="justify-self-end">
                  <HeaderWallet />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8 min-h-[calc(100dvh-56px)]">{children}</main>
          </NetworkGuard>
        </WalletProvider>
      </body>
    </html>
  );
}
