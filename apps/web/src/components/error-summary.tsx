import { forwardRef } from "react";

type ErrorSummaryProps = {
  errors: Array<{ fieldId: string; message: string }>;
};

const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(
  function ErrorSummary({ errors }, ref) {
    if (errors.length === 0) return null;

    return (
      <div
        aria-labelledby="error-summary-title"
        className="rounded-lg border-2 border-destructive bg-destructive/5 p-4"
        ref={ref}
        role="alert"
        tabIndex={-1}
      >
        <h2 className="font-semibold" id="error-summary-title">
          Correct the following before submitting
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {errors.map((error) => (
            <li key={`${error.fieldId}-${error.message}`}>
              <a
                className="font-medium text-destructive underline underline-offset-4"
                href={`#${error.fieldId}`}
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

export default ErrorSummary;
