import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carlyzer - AI Vehicle Detection & Analysis",
  description:
    "Upload images or videos to detect and analyze vehicles using advanced AI technology",
  keywords: [
    "vehicle detection",
    "AI",
    "machine learning",
    "car recognition",
    "license plate detection",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
