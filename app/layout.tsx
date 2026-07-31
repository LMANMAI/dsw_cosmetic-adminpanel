import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGate } from "@/components/AuthGate";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "YOFI Admin",
  description: "Panel administrativo de YOFI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AuthGate>
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
