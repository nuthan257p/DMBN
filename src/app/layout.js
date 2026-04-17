import './globals.css';

export const metadata = {
  title: 'DMBN - Secure Notepad',
  description: 'Premium secure notepad for mobile and desktop.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
