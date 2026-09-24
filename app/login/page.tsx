import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In | FileNova",
  description: "Log in to your FileNova account to access your documents and personalized tools.",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to access your FileNova workspace and saved preferences."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-line/20" />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
