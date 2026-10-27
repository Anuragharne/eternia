import "./globals.css";
import { Providers } from "../components/providers/Providers";

export const metadata = {
  title: "Eternia — Where Memories Live Forever",
  description:
    "Create a conversational AI companion that looks, sounds, and remembers like your loved one. Built with empathy, privacy, and care.",
  keywords: [
    "AI companion",
    "memorial",
    "grief tech",
    "voice cloning",
    "AI avatar",
    "memory preservation",
  ],
  openGraph: {
    title: "Eternia — AI Companion Platform",
    description:
      "Preserve and interact with the likeness, voice, and memories of a loved one through a conversational AI avatar.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
