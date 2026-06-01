import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: 'Sistema Disciplinario - RGR Selva',
  description: 'Sistema de Control Disciplinario y Gestión de Bonos para RGR Selva Vehículos y Maquinarias E.I.R.L.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#0a4a7a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
