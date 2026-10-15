import "./globals.css";

export const metadata = {
  title: "Eternia — Preserve the Ones You Love",
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
      <body>{children}</body>
    </html>
  );
}
