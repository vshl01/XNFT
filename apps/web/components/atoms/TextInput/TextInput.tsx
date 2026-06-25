import { forwardRef, type InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const BASE =
  "w-full rounded-lg border bg-bg-elevated px-3.5 py-2.5 text-sm text-text outline-none transition placeholder:text-white/25 focus:ring-2 focus:ring-accent/25";

/** Atom: Tailwind text input. `invalid` toggles the danger border. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ invalid, className = "", ...props }, ref) {
    const border = invalid
      ? "border-danger focus:border-danger"
      : "border-white/10 focus:border-accent";
    return <input ref={ref} className={`${BASE} ${border} ${className}`} {...props} />;
  },
);
