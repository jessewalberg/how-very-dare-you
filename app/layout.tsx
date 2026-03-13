import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { ConvexClientProvider } from "@/components/layout/ConvexClientProvider";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://howverydareyou.com";
const googleTagId = "G-Y07L29KY4Z";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "How Very Dare You — AI Content Advisories for Parents",
    template: "%s | How Very Dare You",
  },
  description:
    "AI-powered content advisory ratings for movies and TV shows. Cultural and ideological theme breakdowns across 8 categories for parents.",
  applicationName: "How Very Dare You",
  authors: [{ name: "How Very Dare You" }],
  creator: "How Very Dare You",
  publisher: "How Very Dare You",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-32x32-light.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon-16x16-light.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32x32.png"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: "How Very Dare You",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "How Very Dare You — AI Content Advisories",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
          strategy="afterInteractive"
        />
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleTagId}');
          `}
        </Script>
      </head>
      <body className="antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
