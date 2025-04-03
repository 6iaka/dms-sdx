import { ClerkProvider } from "@clerk/nextjs";
import { type Metadata } from "next";
import { Karla as FontSans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import QueryProvider from "~/components/QueryProvider";
import { Toaster } from "~/components/ui/toaster";
import "~/styles/globals.css";

export const metadata: Metadata = {
  title: "Sodexo Storage",
  description: "Sodexo Storage Management",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const fontSans = FontSans({
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-karla",
  subsets: ["latin"],
  style: "normal",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fontSans.variable} --font-karla dark w-screen select-none overflow-x-hidden`}
      >
        <body>
          <QueryProvider>
            <NextTopLoader />
            {children}
            <Toaster />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
