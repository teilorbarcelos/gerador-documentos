export interface DebouncedValidator<T, R> {
  /** Agenda uma validação após o debounce. Cancela qualquer verificação pendente/obsoleta. */
  schedule(input: T, onResult: (result: R) => void): void;
  /** Cancela timers e verificação em andamento. Seguro chamar várias vezes. */
  dispose(): void;
}

/**
 * Agendador de validação com debounce que:
 * - só executa após o intervalo de debounce;
 * - se uma alteração chegar durante uma verificação em andamento, descarta o
 *   resultado obsoleto e revalida após um novo debounce;
 * - nunca inicia duas verificações simultâneas (guarda de "verificação em andamento").
 */
export function createDebouncedValidator<T, R>(
  compute: (input: T) => R | Promise<R>,
  debounceMs: number
): DebouncedValidator<T, R> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { input: T; onResult: (r: R) => void } | null = null;
  let inFlight = false;
  let generation = 0;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule(input: T, onResult: (r: R) => void): void {
    generation += 1;
    pending = null; // a entrada mais recente torna pendências anteriores obsoletas
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      start(generation, input, onResult);
    }, debounceMs);
  }

  function start(gen: number, input: T, onResult: (r: R) => void): void {
    if (gen !== generation) return; // verificação obsoleta, ignora
    if (inFlight) {
      // já está ocorrendo uma verificação: guarda e revalida depois do debounce
      pending = { input, onResult };
      return;
    }
    inFlight = true;
    Promise.resolve(compute(input)).then((result) => {
      inFlight = false;
      if (gen === generation) onResult(result);
      if (pending) {
        const p = pending;
        pending = null;
        schedule(p.input, p.onResult);
      }
    });
  }

  return {
    schedule,
    dispose() {
      generation += 1;
      clearTimer();
      pending = null;
      inFlight = false;
    },
  };
}