"use client";

import {
  CoinsIcon,
  HandHelpingIcon,
  PoundSterlingIcon,
  type LucideIcon,
} from "lucide-react";
import type { ExchangeValueType } from "../lib/types";

const EXCHANGE_TYPE_OPTIONS: {
  type: ExchangeValueType;
  label: string;
  Icon: LucideIcon;
}[] = [
  { type: "credits", label: "Credits", Icon: CoinsIcon },
  { type: "asset", label: "Action", Icon: HandHelpingIcon },
  { type: "money", label: "Money", Icon: PoundSterlingIcon },
];

export function ExchangeTypeSelector({
  value,
  onChange,
  allowedTypes,
  ariaLabel,
}: {
  value: ExchangeValueType | null;
  onChange: (type: ExchangeValueType) => void;
  allowedTypes?: ExchangeValueType[];
  ariaLabel: string;
}) {
  const options = allowedTypes
    ? EXCHANGE_TYPE_OPTIONS.filter((option) =>
        allowedTypes.includes(option.type),
      )
    : EXCHANGE_TYPE_OPTIONS;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-3 gap-2"
    >
      {options.map(({ type, label, Icon }) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(type)}
            className={
              selected
                ? "flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-base)] border-2 border-[var(--color-primary-500)] px-2 py-3 text-center text-sm font-semibold preset-filled-brand"
                : "flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-base)] border-2 border-surface-500 px-2 py-3 text-center text-sm font-medium bg-transparent text-surface-800 hover:bg-surface-100 dark:border-surface-300 dark:text-surface-50 dark:hover:bg-surface-900"
            }
          >
            <Icon size={26} strokeWidth={selected ? 2.25 : 2} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
