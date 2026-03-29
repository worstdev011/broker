"use client";

import { useState, useEffect } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Поиск…",
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value);

  // Sync if parent resets value externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce: call onChange 300ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, onChange]);

  return (
    <div className="relative w-full max-w-sm">
      {/* Search icon */}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-admin-secondary">
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-admin-border bg-admin-surface py-2.5 pl-9 pr-4 text-sm text-admin-primary placeholder-admin-secondary outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
      />

      {/* Clear button */}
      {inputValue && (
        <button
          onClick={() => setInputValue("")}
          className="absolute inset-y-0 right-3 flex items-center text-admin-secondary hover:text-admin-primary"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
