import { describe, expect, it, vi } from "vitest";
import { isRetryableError, withRetry } from "./retry";

function axiosError(overrides: Record<string, unknown> = {}) {
  return Object.assign(new Error("request failed"), {
    isAxiosError: true,
    ...overrides,
  });
}

const fastRetry = { attempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitterMs: 0 };

describe("isRetryableError", () => {
  it("retries network errors and temporary upstream responses", () => {
    expect(isRetryableError(axiosError({ code: "ECONNABORTED" }))).toBe(true);
    expect(isRetryableError(axiosError({ response: { status: 408 } }))).toBe(
      true,
    );
    expect(isRetryableError(axiosError({ response: { status: 502 } }))).toBe(
      true,
    );
    expect(isRetryableError(axiosError({ response: { status: 503 } }))).toBe(
      true,
    );
    expect(isRetryableError(axiosError({ response: { status: 504 } }))).toBe(
      true,
    );
  });

  it("does not retry client errors or cancellations", () => {
    expect(isRetryableError(axiosError({ response: { status: 401 } }))).toBe(
      false,
    );
    expect(isRetryableError(axiosError({ response: { status: 404 } }))).toBe(
      false,
    );
    expect(isRetryableError(axiosError({ response: { status: 429 } }))).toBe(
      false,
    );
    expect(isRetryableError(axiosError({ code: "ERR_CANCELED" }))).toBe(false);
    expect(isRetryableError(new Error("plain"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries a temporary failure and returns the next result", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(axiosError({ response: { status: 503 } }))
      .mockResolvedValueOnce("ok");

    await expect(withRetry(operation, fastRetry)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("stops after the configured number of attempts", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(axiosError({ response: { status: 502 } }));

    await expect(withRetry(operation, fastRetry)).rejects.toBeTruthy();
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-retryable error", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(axiosError({ response: { status: 404 } }));

    await expect(withRetry(operation, fastRetry)).rejects.toBeTruthy();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry with the failed attempt number", async () => {
    const onRetry = vi.fn();
    const operation = vi
      .fn()
      .mockRejectedValueOnce(axiosError({ response: { status: 503 } }))
      .mockResolvedValueOnce("ok");

    await withRetry(operation, { ...fastRetry, onRetry });

    expect(onRetry).toHaveBeenCalledWith(1, expect.anything());
  });

  it("does not start when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn();

    await expect(
      withRetry(operation, { ...fastRetry, signal: controller.signal }),
    ).rejects.toBeTruthy();
    expect(operation).not.toHaveBeenCalled();
  });
});
