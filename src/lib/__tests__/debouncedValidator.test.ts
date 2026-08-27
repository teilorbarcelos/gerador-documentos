import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDebouncedValidator } from "../debouncedValidator";

describe("createDebouncedValidator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("só executa a verificação após o debounce", async () => {
    const compute = vi.fn((x: number) => x * 2);
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(21, onResult);
    await vi.advanceTimersByTimeAsync(2999);
    expect(compute).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute).toHaveBeenCalledWith(21);
    expect(onResult).toHaveBeenCalledWith(42);
  });

  it("alterações antes do debounce cancelam a execução anterior", async () => {
    const compute = vi.fn((x: number) => x);
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(1, onResult);
    await vi.advanceTimersByTimeAsync(1000);
    v.schedule(2, onResult);
    await vi.advanceTimersByTimeAsync(3000);

    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute).toHaveBeenCalledWith(2);
    expect(onResult).toHaveBeenCalledWith(2);
    expect(onResult).not.toHaveBeenCalledWith(1);
  });

  it("descarta resultado obsoleto de verificação em andamento quando o input muda", async () => {
    let resolveNext!: (v: number) => void;
    const compute = vi.fn(
      (_x: number) =>
        new Promise<number>((res) => {
          resolveNext = res;
        })
    );
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(1, onResult);
    await vi.advanceTimersByTimeAsync(3000); // inicia verificação de 1 (ainda em andamento)
    expect(onResult).not.toHaveBeenCalled();

    v.schedule(2, onResult); // alteração antes do fim da verificação
    resolveNext(1); // verificação antiga termina
    await Promise.resolve(); // descarta o resultado obsoleto

    expect(onResult).not.toHaveBeenCalledWith(1); // obsoleta, descartada

    await vi.advanceTimersByTimeAsync(3000); // novo debounce revalida o estado atual
    expect(compute).toHaveBeenLastCalledWith(2);
    resolveNext(2);
    await Promise.resolve();
    expect(onResult).toHaveBeenCalledWith(2);
  });

  it("não inicia nova verificação enquanto outra está em andamento; revalida depois", async () => {
    let resolveNext!: (v: number) => void;
    const compute = vi.fn(
      (_x: number) =>
        new Promise<number>((res) => {
          resolveNext = res;
        })
    );
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(1, onResult);
    await vi.advanceTimersByTimeAsync(3000);
    expect(compute).toHaveBeenCalledTimes(1);

    // nova entrada chega com a primeira verificação ainda em andamento
    v.schedule(2, onResult);
    await vi.advanceTimersByTimeAsync(3000);
    expect(compute).toHaveBeenCalledTimes(1); // não iniciou segunda verificação

    resolveNext(1);
    await Promise.resolve(); // agenda a revalidação após novo debounce

    await vi.advanceTimersByTimeAsync(3000); // revalida o estado atual
    expect(compute).toHaveBeenCalledTimes(2);
    expect(compute).toHaveBeenLastCalledWith(2);
    resolveNext(2);
    await Promise.resolve();
    expect(onResult).toHaveBeenLastCalledWith(2);
  });

  it("dispose cancela verificação pendente e descarta verificação em andamento", async () => {
    let resolveNext!: (v: number) => void;
    const compute = vi.fn(
      (_x: number) =>
        new Promise<number>((res) => {
          resolveNext = res;
        })
    );
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(1, onResult);
    await vi.advanceTimersByTimeAsync(3000);
    v.dispose();
    resolveNext(1);
    await Promise.resolve();
    expect(onResult).not.toHaveBeenCalled();
  });

  it("dispose cancelamento de timer pendente", async () => {
    const compute = vi.fn((x: number) => x);
    const v = createDebouncedValidator(compute, 3000);
    const onResult = vi.fn();

    v.schedule(1, onResult);
    v.dispose();
    await vi.advanceTimersByTimeAsync(3000);
    expect(compute).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });
});