import './globals.css'

export const metadata = {
  title: 'AEO Tracker - AI Search Visibility Monitor',
  description: 'Track your brand visibility across AI search engines',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}