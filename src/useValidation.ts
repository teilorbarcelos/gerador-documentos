import { useEffect, useState } from "react";
import type { DocumentState } from "./lib/types";
import { validateDoc, type ValidationResult } from "./lib/validation";
import {
  createDebouncedValidator,
  type DebouncedValidator,
} from "./lib/debouncedValidator";

export const DEFAULT_DEBOUNCE_MS = 3000;

const EMPTY_RESULT: ValidationResult = {
  duplicateIds: new Set<string>(),
  emptyAboveFilledIds: new Set<string>(),
};

/**
 * Valida o documento com debounce: cada alteração cancela a verificação anterior
 * (se ainda em andamento) e agenda uma nova após `debounceMs`.
 */
export function useValidation(
  doc: DocumentState,
  debounceMs: number = DEFAULT_DEBOUNCE_MS
): ValidationResult {
  const [validator] = useState<DebouncedValidator<DocumentState, ValidationResult>>(() =>
    createDebouncedValidator((d: DocumentState) => validateDoc(d), debounceMs)
  );
  const [result, setResult] = useState<ValidationResult>(EMPTY_RESULT);

  useEffect(() => {
    validator.schedule(doc, setResult);
  }, [doc, validator]);

  useEffect(() => () => validator.dispose(), [validator]);

  return result;
}