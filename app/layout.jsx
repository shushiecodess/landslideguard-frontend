import 'leaflet/dist/leaflet.css'
import '../src/index.css'
import { GeistSans } from 'geist/font/sans'
export const metadata = {
  title: 'LandslideGuard AI — Landslide Risk Monitoring for Northeast India',
  description: 'AI-powered early warning and landslide risk monitoring for Northeast India.',
}

export default function RootLayout({ children }) {
  return <html lang="en" className={`${GeistSans.variable} dark`}><body>{children}</body></html>
}
