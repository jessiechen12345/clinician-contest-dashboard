"use client";

import type { Lang } from "@/lib/i18n";

/** Two big side-by-side buttons. The selected language is filled in so it's obvious which one is active. */
export default function LanguageToggle({ lang, onChange, label }: { lang: Lang; onChange: (l: Lang) => void; label: string }) {
  const options: { value: Lang; text: string; code: string }[] = [
    { value: "en", text: "English", code: "EN" },
    { value: "fr", text: "Français", code: "FR" }
  ];
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 overflow-hidden rounded-lg border-2 border-teal-700 bg-white">
      {options.map((o) => {
        const on = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            lang={o.value}
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] px-3 text-base font-bold sm:px-4 ${on ? "bg-teal-700 text-white" : "bg-white text-teal-800 hover:bg-teal-50"}`}
          >
            <span className="sm:hidden">{o.code}</span>
            <span className="hidden sm:inline">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}
