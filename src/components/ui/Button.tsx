import { ButtonHTMLAttributes, ReactElement, ReactNode, cloneElement, isValidElement } from "react";

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-950";

const variantClasses: Record<string, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary/90 active:bg-primary/95 dark:hover:bg-primary/90",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
};

const sizeClasses = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: keyof typeof sizeClasses;
  asChild?: boolean;
  className?: string;
};

const classNames = (...classes: Array<string | null | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export function Button({
  children,
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  const combinedClasses = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (asChild && isValidElement(children)) {
    const childElement = children as ReactElement<{ className?: string }>;

    return cloneElement(childElement, {
      ...props,
      className: classNames(combinedClasses, childElement.props.className),
    });
  }

  return (
    <button className={combinedClasses} type={type} {...props}>
      {children}
    </button>
  );
}
