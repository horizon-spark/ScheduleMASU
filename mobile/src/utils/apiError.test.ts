import { describe, expect, it } from "vitest";
import { describeRequestError, getErrorSummary } from "./apiError";

function axiosError(overrides: Record<string, unknown> = {}) {
  return Object.assign(new Error("request failed"), {
    isAxiosError: true,
    ...overrides,
  });
}

describe("describeRequestError", () => {
  it("reports a timeout", () => {
    const message = describeRequestError(
      axiosError({ code: "ECONNABORTED" }),
      "Не удалось загрузить",
    );

    expect(message).toContain("сервер не ответил вовремя");
  });

  it("reports a network failure", () => {
    const message = describeRequestError(
      axiosError({ code: "ERR_NETWORK" }),
      "Не удалось загрузить",
    );

    expect(message).toContain("нет связи с прокси");
  });

  it("explains common HTTP statuses", () => {
    expect(
      describeRequestError(
        axiosError({ response: { status: 404 } }),
        "Ошибка",
      ),
    ).toContain("404");
    expect(
      describeRequestError(
        axiosError({ response: { status: 401 } }),
        "Ошибка",
      ),
    ).toContain("сессия истекла");
    expect(
      describeRequestError(
        axiosError({ response: { status: 503 } }),
        "Ошибка",
      ),
    ).toContain("503");
    expect(
      describeRequestError(
        axiosError({ response: { status: 504 } }),
        "Ошибка",
      ),
    ).toContain("не ответил вовремя");
  });

  it("uses the server message for other errors", () => {
    const message = describeRequestError(
      axiosError({
        response: { status: 400, data: { message: "Некорректный запрос" } },
      }),
      "Ошибка",
    );

    expect(message).toBe("Ошибка: Некорректный запрос");
  });

  it("falls back for non-axios errors", () => {
    expect(describeRequestError(new Error("boom"), "Ошибка")).toBe("Ошибка");
  });
});

describe("getErrorSummary", () => {
  it("does not include headers or tokens", () => {
    expect(
      getErrorSummary(
        axiosError({
          code: "ERR_BAD_RESPONSE",
          response: { status: 502, headers: { authorization: "secret" } },
        }),
      ),
    ).toBe("ERR_BAD_RESPONSE | HTTP 502 | request failed");
  });
});
