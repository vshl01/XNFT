import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const BASE =
  "w-full appearance-none rounded-lg border bg-bg-elevated px-3.5 py-2.5 pr-9 text-sm text-text outline-none transition focus:ring-2 focus:ring-accent/25";

/** Atom: Tailwind select with a custom chevron. */
export function Select({ invalid, className = "", children, ...props }: SelectProps) {
  const border = invalid
    ? "border-danger focus:border-danger"
    : "border-white/10 focus:border-accent";
  return (
    <div className="relative">
      <select className={`${BASE} ${border} ${className}`} {...props}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
        ▾
      </span>
    </div>
  );
}
