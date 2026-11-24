import type { Metadata, Viewport } from 'next'
import { Anton, Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { SiteHeader } from '@/components/site/site-header'
import { BottomNav } from '@/components/site/bottom-nav'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
// Condensed poster display face (matches the club's schedule posters).
const anton = Anton({ variable: '--font-anton', subsets: ['latin'], weight: '400' })

export const metadata: Metadata = {
  title: { default: "Dinkin' Pirates — Claim a Court", template: "%s · Dinkin' Pirates" },
  description:
    'Book a pickleball court as a Private Charter or an Open Voyage — attach your Reclub open-play link and broadcast it to Facebook and Messenger.',
}

export const viewport: Viewport = {
  themeColor: '#2B1E1A',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="parchment flex min-h-full flex-col text-ink">
        <Providers>
          <SiteHeader />
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
          <BottomNav />
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
