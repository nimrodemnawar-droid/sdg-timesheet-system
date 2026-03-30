import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Mobile-optimized input field with:
 * - 44px minimum height for touch targets
 * - 16px font size to prevent iOS zoom
 * - Better spacing for fat fingers
 */
export const MobileInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileInput.displayName = "MobileInput";

/**
 * Mobile-optimized textarea with:
 * - Better touch targeting
 * - Larger font to prevent zoom
 * - Mobile-friendly padding
 */
export const MobileTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-24 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "resize-none",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileTextarea.displayName = "MobileTextarea";

/**
 * Mobile-optimized select with:
 * - Touch-friendly sizing
 * - Better visual feedback
 * - Native mobile select on small screens
 */
export const MobileSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "appearance-none",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
  </select>
));
MobileSelect.displayName = "MobileSelect";

/**
 * Mobile-optimized label
 */
export function MobileLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  );
}

/**
 * Mobile-optimized form group with consistent spacing
 */
export function MobileFormGroup({
  label,
  error,
  children,
  className,
}: {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <MobileLabel>{label}</MobileLabel>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Mobile-optimized form with safe area support
 */
export function MobileForm({
  children,
  onSubmit,
  className,
}: {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "space-y-4 rounded-lg border border-border bg-card p-4",
        "sm:space-y-6 sm:p-6",
        className
      )}
    >
      {children}
    </form>
  );
}

/**
 * Mobile-optimized time picker
 */
export const MobileTimePicker = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="time"
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileTimePicker.displayName = "MobileTimePicker";

/**
 * Mobile-optimized date picker
 */
export const MobileDatePicker = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="date"
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileDatePicker.displayName = "MobileDatePicker";

/**
 * Mobile-optimized file input with touch-friendly area
 */
export const MobileFileInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="file"
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
MobileFileInput.displayName = "MobileFileInput";
