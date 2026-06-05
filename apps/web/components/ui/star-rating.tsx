"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current value (1..max). Pass `null` to mean "no rating yet". */
  value: number | null;
  /** Click handler — pass new value (or null to clear when clicking the active star again). */
  onChange?: (next: number | null) => void;
  /** Total stars. Defaults to 5. */
  max?: number;
  /** Disable interaction (still shows the value). */
  disabled?: boolean;
  /** Hide the "n / max" label suffix. */
  hideLabel?: boolean;
  /** Optional name for hidden input — lets the component participate in plain <form> submission. */
  name?: string;
  /** Accessible label. */
  ariaLabel?: string;
  className?: string;
  /** Pixel size of each star. Defaults to 22. */
  size?: number;
}

/**
 * Five-star clickable rating with hover preview. Pure CSS triangles via SVG path so we don't
 * pull in another icon set for one shape. Clicking the currently active star clears the rating
 * when `onChange` accepts null.
 */
export function StarRating({
  value,
  onChange,
  max = 5,
  disabled = false,
  hideLabel = false,
  name,
  ariaLabel = "Rating",
  className,
  size = 22,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  const handleClick = (n: number) => {
    if (disabled || !onChange) return;
    onChange(value === n ? null : n);
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)} role="radiogroup" aria-label={ariaLabel}>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const active = n <= display;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of ${max} stars`}
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => !disabled && setHover(null)}
            onFocus={() => !disabled && setHover(n)}
            onBlur={() => !disabled && setHover(null)}
            onClick={() => handleClick(n)}
            className={cn(
              "rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled ? "cursor-default" : "cursor-pointer"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className={cn(active ? "text-amber-400" : "text-muted-foreground/40")}
              aria-hidden="true"
            >
              <path d="M12 2.5l2.94 5.95 6.56.96-4.75 4.63 1.12 6.53L12 17.5l-5.87 3.08 1.12-6.53-4.75-4.63 6.56-.96L12 2.5z" />
            </svg>
          </button>
        );
      })}
      {hideLabel ? null : (
        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
          {value ? `${value} / ${max}` : "—"}
        </span>
      )}
    </div>
  );
}
