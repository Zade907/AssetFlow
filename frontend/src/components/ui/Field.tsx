import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { className, label, error, hint, id: providedId, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-[var(--ink)]" htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        className={cn(
          "min-h-11 w-full rounded-lg border bg-white px-3 text-base text-[var(--ink)] transition-colors duration-200 placeholder:text-[var(--muted)] disabled:bg-[var(--surface)] disabled:text-[var(--muted)] md:text-sm",
          error ? "border-[var(--danger)]" : "border-[var(--border)] hover:border-[color-mix(in_oklch,var(--border)_55%,var(--ink))]",
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...props}
      />
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
      {!error && hint ? <p id={`${id}-hint`} className="text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
});

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { className, label, error, id: providedId, children, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-[var(--ink)]" htmlFor={id}>{label}</label>
      <select
        ref={ref}
        id={id}
        className={cn("min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--ink)]", className)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
});
