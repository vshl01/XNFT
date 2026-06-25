import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const BASE =
  "w-full resize-y rounded-lg border bg-bg-elevated px-3.5 py-2.5 text-sm text-text outline-none transition placeholder:text-white/25 focus:ring-2 focus:ring-accent/25";

/** Atom: Tailwind multiline text area. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ invalid, className = "", ...props }, ref) {
    const border = invalid
      ? "border-danger focus:border-danger"
      : "border-white/10 focus:border-accent";
    return (
      <textarea ref={ref} className={`${BASE} ${border} ${className}`} {...props} />
    );
  },
);
