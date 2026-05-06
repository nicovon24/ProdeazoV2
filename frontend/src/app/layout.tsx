import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Prodeazo - World Cup 2026",
  description: "Pronósticos y estadísticas del Mundial 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
