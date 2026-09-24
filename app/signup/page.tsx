import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account | FileNova",
  description: "Create your free FileNova account to access powerful PDF and AI file tools.",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Start free with FileNova. Convert, compress, and converse with documents."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-line/20" />}>
        <SignupForm />
      </Suspense>
    </AuthCard>
  );
}
