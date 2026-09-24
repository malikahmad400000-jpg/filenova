import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-ember text-white shadow-[0_10px_24px_-12px_rgba(196,92,38,0.85)] hover:bg-ember-deep disabled:hover:bg-ember",
  secondary:
    "border border-ink/15 bg-card/80 text-ink hover:border-ink/30 hover:bg-white",
  ghost: "text-ink/80 hover:bg-ink/5 hover:text-ink",
};

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
};

type ButtonAsLink = CommonProps & {
  href: string;
  type?: never;
  disabled?: never;
  onClick?: never;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps | "href"> & {
    href?: undefined;
  };

function isHash(href: string) {
  return href.startsWith("#");
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonAsLink | ButtonAsButton) {
  const classes = `inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${variants[variant]} ${className}`;

  if ("href" in props && props.href) {
    if (isHash(props.href)) {
      return (
        <a href={props.href} className={classes}>
          {children}
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type, ...buttonProps } = props as ButtonAsButton;

  return (
    <button type={type ?? "button"} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
