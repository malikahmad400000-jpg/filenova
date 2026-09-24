import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | FileNova",
  description: "Manage your FileNova documents, tools, and account settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-ink">
      <div>
        <Navbar />
        <main id="main">
          <DashboardContent
            user={{
              id: user.id,
              email: user.email,
              createdAt: user.created_at,
            }}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}
