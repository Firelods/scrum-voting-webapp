import React from "react";
import { cn } from "@/lib/utils";

interface LoaderProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    variant?: "spinner" | "dots" | "pulse";
}

export function Loader({
    className,
    size = "md",
    variant = "spinner",
}: LoaderProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    if (variant === "spinner") {
        return (
            <div
                className={cn(
                    "animate-spin rounded-full border-2 border-current border-t-transparent",
                    sizeClasses[size],
                    className
                )}
                role="status"
                aria-label="loading"
            >
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    if (variant === "dots") {
        return (
            <div
                className={cn(
                    "flex items-center justify-center gap-1",
                    className
                )}
                role="status"
                aria-label="loading"
            >
                <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    if (variant === "pulse") {
        return (
            <div
                className={cn(
                    "animate-pulse rounded-full bg-current",
                    sizeClasses[size],
                    className
                )}
                role="status"
            >
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    return null;
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
                className
            )}
        />
    );
}
