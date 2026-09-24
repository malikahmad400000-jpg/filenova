import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function NovaMark(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M11 10.5h7.2L21 13.2V22H11z"
        fill="none"
        stroke="#fffaf3"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 10.5V13H21"
        fill="none"
        stroke="#fffaf3"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 16.2h5.2M13.2 18.8h3.6"
        fill="none"
        stroke="#fffaf3"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="23.6" cy="8.6" r="1.4" fill="#f3c77a" />
    </svg>
  );
}

export function MergeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M7 4h5l3 3v13H7z" />
      <path {...stroke} d="M12 4v3h3" />
      <path {...stroke} d="M15 9h4l2 2v9h-9" />
      <path {...stroke} d="M10 14h6M13 11v6" />
    </svg>
  );
}

export function SplitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M8 5h8v14H8z" />
      <path {...stroke} d="M12 5v14" />
      <path {...stroke} d="M5 10H3v8h5M19 10h2v8h-5" />
    </svg>
  );
}

export function CompressIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M8 4h8v4H8zM8 16h8v4H8z" />
      <path {...stroke} d="M12 8v8M9 11l3-3 3 3M9 13l3 3 3-3" />
    </svg>
  );
}

export function JpgIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M5 7h14v12H5z" />
      <path {...stroke} d="M8 12.5 10.5 10l3 3.5 1.5-1.5L19 16" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <path {...stroke} d="M8 4h5l3 3" />
    </svg>
  );
}

export function ImageToPdfIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M4 8h9v11H4z" />
      <path {...stroke} d="M7 13.5 8.8 11l2.4 3 1.1-1L13 15" />
      <path {...stroke} d="M14 7h5l1 1v11h-7" />
    </svg>
  );
}

export function WordIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M7 4h7l4 4v12H7z" />
      <path {...stroke} d="M14 4v4h4" />
      <path {...stroke} d="M9.5 10.5 11 16l1.4-3.6L13.8 16l1.5-5.5" />
    </svg>
  );
}

export function ExcelIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M5 6h14v13H5z" />
      <path {...stroke} d="M5 10h14M5 14h14M10 6v13" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M5 6h14v9H9l-4 3z" />
      <path {...stroke} d="M8.5 10.5h7M8.5 13h4.5" />
    </svg>
  );
}

export function SummarizeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M7 5h10v14H7z" />
      <path {...stroke} d="M10 9h4M10 12h6M10 15h3" />
    </svg>
  );
}

export function OcrIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path {...stroke} d="M8.5 15V9h2.2a2.3 2.3 0 0 1 0 4.6H8.5M14 15l2.2-6 2.2 6M14.7 13h3" />
    </svg>
  );
}

export function TranslateIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M4 7h10M9 7c0 5-3 8-7 10M6.5 11.5h5" />
      <path {...stroke} d="M14 13h6l-3 7-3-7z" />
    </svg>
  );
}

export function ExtractIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M6 5h12v14H6z" />
      <path {...stroke} d="M9 9h6M9 12h6M9 15h3.5" />
      <path {...stroke} d="M16 17.5 18.5 15 16 12.5" />
    </svg>
  );
}

export function QaIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path {...stroke} d="m15.5 15.5 4 4" />
      <path {...stroke} d="M11 8.6a2 2 0 0 1 1.1 3.6c-.5.3-.9.8-.9 1.4M11 15.2h.01" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function WritingIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path {...stroke} d="M12 20h9" />
      <path {...stroke} d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
