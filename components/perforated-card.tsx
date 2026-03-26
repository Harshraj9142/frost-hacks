import * as React from "react";
import { cn } from "@/lib/utils";

interface PerforatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  holes?: "left" | "right" | "both" | "none";
}

export function PerforatedCard({
  className,
  holes = "left",
  children,
  ...props
}: PerforatedCardProps) {
  return (
    <div
      className={cn(
        "relative border-2 border-border bg-card p-6",
        className
      )}
      {...props}
    >
      {/* Perforated holes */}
      {(holes === "left" || holes === "both") && (
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`left-${i}`}
              className="w-3 h-3 -ml-1.5 rounded-full border-2 border-border bg-background"
            />
          ))}
        </div>
      )}
      {(holes === "right" || holes === "both") && (
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-around py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`right-${i}`}
              className="w-3 h-3 -mr-1.5 rounded-full border-2 border-border bg-background"
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger";
}

export function RetroButton({
  className,
  variant = "primary",
  children,
  ...props
}: RetroButtonProps) {
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-500",
    danger: "bg-red-500 text-white hover:bg-red-600 border-red-500",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 border-2 font-mono uppercase text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface RetroInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function RetroInput({ className, ...props }: RetroInputProps) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 border-2 border-border bg-background font-mono text-sm uppercase placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors",
        className
      )}
      {...props}
    />
  );
}

interface RetroLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function RetroLabel({ className, ...props }: RetroLabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-mono uppercase font-bold text-foreground mb-1",
        className
      )}
      {...props}
    />
  );
}

interface RetroBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "danger";
}

export function RetroBadge({
  className,
  variant = "primary",
  children,
  ...props
}: RetroBadgeProps) {
  const variants = {
    primary: "bg-primary/10 text-primary border-primary",
    secondary: "bg-secondary text-secondary-foreground border-border",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500",
    danger: "bg-red-500/10 text-red-400 border-red-500",
  };

  return (
    <div
      className={cn(
        "inline-block px-3 py-1 border-2 font-mono uppercase text-xs font-bold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
