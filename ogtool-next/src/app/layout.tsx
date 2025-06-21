import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserSessionProvider } from "@/features/userSession/provider/UserSessionProvider";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aline's AI Extraction Tool",
  description: "Knowledge base builder for technical authors",
};

const IconHome = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-5 h-5"
  >
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.026.026.05.054.07.084v6.101a2.25 2.25 0 01-2.25 2.25H16.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75H8.25a2.25 2.25 0 01-2.25-2.25v-6.101c.02-.03.044-.058.07-.084L12 5.432z" />
  </svg>
);
  
const IconList = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm3.75 3.75a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zm0 3a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zm0 3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z" clipRule="evenodd" />
    </svg>  
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <UserSessionProvider>
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen w-full bg-[#f5f5f5] dark:bg-black font-[family-name:var(--font-geist-sans)]">
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-white dark:bg-black sm:flex">
              <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                <Link
                  href="/"
                  className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-black dark:bg-white text-white dark:text-black text-lg font-semibold md:h-8 md:w-8 md:text-base"
                >
                  <IconHome />
                  <span className="sr-only">Home</span>
                </Link>
                <Link
                  href="/extraction-requests"
                  className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full text-gray-500 transition-colors hover:text-gray-900 md:h-8 md:w-8 dark:text-gray-400 dark:hover:text-gray-50"
                >
                  <IconList />
                  <span className="sr-only">Extraction Requests</span>
                </Link>
              </nav>
            </aside>
            <div className="flex flex-1 flex-col sm:pl-14">
                {children}
            </div>
        </div>
      </body>
    </html>
    </UserSessionProvider>
  );
}
