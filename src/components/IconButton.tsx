import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { title?: string };

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { title, children, className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`iconbtn inline-flex items-center justify-center w-9 h-9 rounded-xl border ${className ?? ''}`}
      style={{ background: 'var(--panel2)', borderColor: 'var(--border)' }}
      title={title}
      {...rest}
    >
      {children}
    </button>
  );
});
