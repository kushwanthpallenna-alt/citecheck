import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CiteCheck | Automated Citation & Empirical Claim Verification",
  description: "Does the source really say that? Verify academic claims against indexed publications with AI-assisted provenance checks and exact contextual alignment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-surface">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="h-full flex flex-col font-ui-body text-on-surface bg-surface antialiased selection:bg-secondary-container selection:text-on-secondary-fixed">
        {children}
      </body>
    </html>
  );
}
