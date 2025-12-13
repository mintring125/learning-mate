import type { Metadata } from "next";
import { Geist, Geist_Mono, Varela_Round } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const varelaRound = Varela_Round({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varela-round",
});

export const metadata: Metadata = {
  title: "Learning Mate - Self-Directed Learning",
  description: "Track your video learning progress and challenge yourself with AI quizzes.",
};

import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${varelaRound.variable} antialiased`}
      >
        <div
          className="mx-auto max-w-6xl 2xl:max-w-[1600px] w-full min-h-screen shadow-2xl relative"
          style={{
            backgroundImage: "url('/assets/theme/background_scene.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
