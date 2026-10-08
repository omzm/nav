'use client';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

/** 开关（替代 Semi Switch） */
export default function Switch({ checked, onChange, disabled = false, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-[#2563eb33] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px] ml-0.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
