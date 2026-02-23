import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/layout/ConvexClientProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://woke-rater.com";

export const metadata: Metadata = {
  title: {
    default: "Woke Rater — Content Advisory Ratings for Parents",
    template: "%s | Woke Rater",
  },
  description:
    "AI-powered content advisory ratings for movies and TV shows. See cultural and ideological theme breakdowns so you can make informed decisions for your family.",
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: "website",
    siteName: "Woke Rater",
    title: "Woke Rater — Content Advisory Ratings for Parents",
    description:
      "AI-powered content advisory ratings for movies and TV shows. Cultural theme breakdowns for parents.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Woke Rater",
    description:
      "AI-powered content advisory ratings for movies and TV shows.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
