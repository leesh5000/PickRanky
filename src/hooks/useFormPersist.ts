"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseFormPersistOptions<T> {
  key: string;
  initialValue: T;
  debounceMs?: number;
}

export function useFormPersist<T>({
  key,
  initialValue,
  debounceMs = 500,
}: UseFormPersistOptions<T>): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [isInitialized, setIsInitialized] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setValue(parsed);
      }
    } catch (e) {
      console.error(`Failed to load form data for key "${key}":`, e);
    }
    setIsInitialized(true);
  }, [key]);

  // Save to localStorage with debounce
  useEffect(() => {
    if (!isInitialized) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to save form data for key "${key}":`, e);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, debounceMs, isInitialized]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Failed to clear form data for key "${key}":`, e);
    }
  }, [key]);

  return [value, setValue, clearSavedData];
}

// Simpler version for multiple states
export function useMultiFormPersist<T extends Record<string, any>>(
  key: string,
  initialValues: T,
  debounceMs = 500
): {
  values: T;
  setValues: (updates: Partial<T> | ((prev: T) => T)) => void;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  clearSavedData: () => void;
  isInitialized: boolean;
} {
  const [isInitialized, setIsInitialized] = useState(false);
  const [values, setValuesState] = useState<T>(initialValues);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setValuesState({ ...initialValues, ...parsed });
      }
    } catch (e) {
      console.error(`Failed to load form data for key "${key}":`, e);
    }
    setIsInitialized(true);
  }, [key]);

  // Save to localStorage with debounce
  useEffect(() => {
    if (!isInitialized) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(values));
      } catch (e) {
        console.error(`Failed to save form data for key "${key}":`, e);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, values, debounceMs, isInitialized]);

  const setValues = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setValuesState((prev) => {
      if (typeof updates === "function") {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setValuesState(initialValues);
    } catch (e) {
      console.error(`Failed to clear form data for key "${key}":`, e);
    }
  }, [key, initialValues]);

  return { values, setValues, setValue, clearSavedData, isInitialized };
}
