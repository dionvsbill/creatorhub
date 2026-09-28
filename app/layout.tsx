import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata = {
  title: "CreatorHub",
  description: "Campaigns, creators and advertising management",
  applicationName: "CreatorHub",
  metadataBase: new URL("https://creatorhub-8bd5.onrender.com"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "CreatorHub",
    description: "Campaigns, creators and advertising management",
    type: "website",
    images: [{ url: "/icon.svg", width: 128, height: 128, alt: "CreatorHub" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
