import type { Metadata, Viewport } from "next";
import { Libre_Caslon_Display, Libre_Caslon_Text, Public_Sans, Mrs_Saint_Delafield } from "next/font/google";
import { notary } from "@/lib/site";
import "./globals.css";

const display = Libre_Caslon_Display({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const text = Libre_Caslon_Text({ weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-text" });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const hand = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], variable: "--font-hand" });

export const metadata: Metadata = {
  title: "Ann Sharon Bacchus, Notary Public in Brooklyn",
  description:
    "Notary services for individuals, families and businesses in Brooklyn, at 1493 Fulton Street or at your home, office or hospital. Call or text 347-564-5172.",
  openGraph: {
    title: "Ann Sharon Bacchus, Notary Public in Brooklyn",
    description: "Notary services at 1493 Fulton Street, or wherever you need me. Call or text 347-564-5172.",
    images: ["/media/seal-wide-0239.webp"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e1626",
};

// Motion is opt-in: the page is complete and readable without this class, so
// no-JS and reduced-motion visitors get the static version by default.
// `intro-on` additionally opts a fresh, top-of-page visit into the seal intro, so
// it can start drawing at first paint instead of waiting for hydration.
const motionGate = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var c=document.documentElement.classList;c.add('motion');var n=performance.getEntriesByType('navigation')[0];if(!location.hash&&(!n||n.type==='navigate'))c.add('intro-on')}}catch(e){}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: `${notary.name}, ${notary.title}`,
  telephone: "+1-347-564-5172",
  email: notary.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: notary.street,
    addressLocality: notary.locality,
    addressRegion: notary.region,
    postalCode: notary.postalCode,
    addressCountry: "US",
  },
  areaServed: "Brooklyn, NY",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${sans.variable} ${hand.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionGate }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
