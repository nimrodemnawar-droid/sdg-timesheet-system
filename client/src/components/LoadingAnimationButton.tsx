import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, MapPin, Navigation } from "lucide-react";

interface LoadingAnimationButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  disabled?: boolean;
  variant?: "check-in" | "check-out" | "default";
  loadingText?: string;
  successText?: string;
  errorText?: string;
  successMessage?: string;
  location?: string;
  accuracy?: number;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const LoadingAnimationButton = ({
  onClick,
  isLoading,
  isSuccess,
  isError,
  disabled,
  variant = "default",
  loadingText = "Processing...",
  successText = "Success!",
  errorText = "Error",
  successMessage,
  location,
  accuracy,
  children,
  className = "",
  title,
}: LoadingAnimationButtonProps) => {
  const getButtonStyles = () => {
    if (isError) {
      return "bg-red-600 hover:bg-red-700 border-red-700";
    }
    if (isSuccess) {
      return "bg-green-600 hover:bg-green-700 border-green-700";
    }
    if (isLoading) {
      return "bg-blue-600 hover:bg-blue-700 border-blue-700";
    }

    if (variant === "check-in") {
      return disabled ? "bg-gray-500 cursor-not-allowed opacity-50" : "bg-green-600 hover:bg-green-700";
    }
    if (variant === "check-out") {
      return disabled ? "bg-gray-500 cursor-not-allowed opacity-50" : "bg-red-600 hover:bg-red-700";
    }

    return "bg-blue-600 hover:bg-blue-700";
  };

  return (
    <div className="relative">
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`h-12 text-white border-0 font-semibold text-base transition-all duration-300 ${getButtonStyles()} ${className}`}
        title={title}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : isSuccess ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 animate-pulse" />
            <span>{successText}</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 animate-bounce" />
            <span>{errorText}</span>
          </div>
        ) : (
          children
        )}
      </Button>

      {/* Success message tooltip */}
      {isSuccess && successMessage && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 text-sm">{successMessage}</p>
              {location && (
                <div className="mt-2 space-y-1 text-xs text-green-700">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{location}</span>
                  </div>
                  {accuracy && (
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      <span>Accuracy: ±{accuracy.toFixed(1)}m</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error message tooltip */}
      {isError && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm">Operation failed</p>
              <p className="text-xs text-red-700 mt-1">Please try again or check your GPS connection</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact loading indicator for inline use
 */
export const LoadingIndicator = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{text}</span>
  </div>
);

/**
 * Success toast content component
 */
export const SuccessToastContent = ({
  title,
  location,
  accuracy,
  timestamp,
}: {
  title: string;
  location?: string;
  accuracy?: number;
  timestamp?: Date;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-5 h-5 text-green-600" />
      <span className="font-semibold">{title}</span>
    </div>
    {location && (
      <div className="ml-7 space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        {accuracy && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span>Accuracy: ±{accuracy.toFixed(1)}m</span>
          </div>
        )}
        {timestamp && (
          <div className="text-xs text-gray-500">
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    )}
  </div>
);

/**
 * Error toast content component
 */
export const ErrorToastContent = ({
  title,
  message,
  retryable = true,
}: {
  title: string;
  message?: string;
  retryable?: boolean;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-red-600" />
      <span className="font-semibold">{title}</span>
    </div>
    {message && <p className="text-sm text-gray-700">{message}</p>}
    {retryable && <p className="text-xs text-gray-500">Please try again</p>}
  </div>
);
