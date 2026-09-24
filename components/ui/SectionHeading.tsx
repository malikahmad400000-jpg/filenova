type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "warm" | "night";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "warm",
}: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-left";
  const isNight = tone === "night";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow ? (
        <p
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.22em] ${isNight ? "text-gold" : "text-ember"}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-sans text-3xl font-semibold tracking-tight sm:text-4xl ${isNight ? "text-white" : "text-ink"}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-3 text-base leading-7 ${isNight ? "text-white/65" : "text-slate"}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
