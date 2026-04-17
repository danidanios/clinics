import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dani Danios — Gestão',
  description: 'Dashboard de gestão interna da clínica Dani Danios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full bg-[#F4F4F8] antialiased`}>
        <TooltipProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  )
}
