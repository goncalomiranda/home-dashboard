import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Material Dashboard 3 - Next.js",
  description: "Material Dashboard 3 converted to Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="76x76" href="/assets/img/apple-icon.png" />
        <link rel="icon" type="image/png" href="/assets/img/favicon.png" />
        {/* Google Fonts */}
        <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Inter:300,400,500,600,700,900&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
        {/* Font Awesome */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
        {/* Material Dashboard CSS */}
        <link href="/assets/css/nucleo-icons.css" rel="stylesheet" />
        <link href="/assets/css/nucleo-svg.css" rel="stylesheet" />
        <link id="pagestyle" href="/assets/css/material-dashboard.css?v=3.2.0" rel="stylesheet" />
      </head>
      <body className={inter.variable} suppressHydrationWarning>
        {children}
        
        {/* Bootstrap Bundle - load before interactive */}
        <Script 
          src="/assets/js/core/bootstrap.bundle.min.js"
          strategy="beforeInteractive"
        />
        
        {/* Material Dashboard - load after Bootstrap */}
        <Script 
          src="/assets/js/material-dashboard.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
