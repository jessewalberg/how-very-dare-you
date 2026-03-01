import { Navbar } from "@/components/layout/Navbar";
import { ConnectionBanner } from "@/components/layout/ConnectionBanner";
import { Footer } from "@/components/layout/Footer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <ConnectionBanner />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
