import * as React from "react";
import { cn } from "@/lib/utils";

function Card({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "accent";
  size?: "default" | "sm";
}) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(
        // Base
        "group/card flex flex-col gap-3 overflow-hidden rounded-[var(--radius-xl)] text-sm",
        "backdrop-blur-xl",
        // Inset shine en haut
        "shadow-[inset_0_1px_0_var(--glass-shine),inset_0_-1px_0_var(--glass-shadow),0_4px_24px_rgba(0,0,0,0.3)]",
        // Variantes
        variant === "default" && [
          "bg-[var(--glass-bg)]",
          "ring-1 ring-[var(--glass-border)]",
        ],
        variant === "accent" && [
          "bg-[var(--accent-subtle)]",
          "ring-1 ring-[var(--accent-border)]",
          "shadow-[inset_0_1px_0_rgba(196,181,253,0.2),0_4px_24px_rgba(109,40,217,0.2)]",
        ],
        // Tailles
        size === "default" && "py-5 px-5",
        size === "sm" && "py-4 px-4",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-lg font-medium leading-snug text-[var(--text-primary)]",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-xs leading-relaxed text-[var(--text-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("text-[var(--text-secondary)]", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-[var(--border-subtle)] pt-4 mt-2",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
