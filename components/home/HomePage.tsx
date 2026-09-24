import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AiTools } from "@/components/home/AiTools";
import { Cta } from "@/components/home/Cta";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PdfTools } from "@/components/home/PdfTools";

export function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <PdfTools />
        <AiTools />
        <HowItWorks />
        <Cta />
      </main>
      <Footer />
      <div id="login" className="sr-only" aria-hidden="true" />
      <div id="about" className="sr-only" aria-hidden="true" />
      <div id="contact" className="sr-only" aria-hidden="true" />
      <div id="privacy" className="sr-only" aria-hidden="true" />
      <div id="terms" className="sr-only" aria-hidden="true" />
    </>
  );
}
