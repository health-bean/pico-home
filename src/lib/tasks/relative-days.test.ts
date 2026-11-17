import { describe, it, expect } from "vitest";
import { spanInWords } from "./relative-days";

// Critique 2026-11-16: "Due in 206 days" next to "Due in 2 weeks".
describe("spanInWords", () => {
  it("days up to 13", () => {
    expect(spanInWords(1)).toBe("1 day");
    expect(spanInWords(9)).toBe("9 days");
  });
  it("weeks from 2 to 8", () => {
    expect(spanInWords(14)).toBe("2 weeks");
    expect(spanInWords(50)).toBe("7 weeks");
  });
  it("months after that, approximate", () => {
    expect(spanInWords(60)).toBe("about 2 months");
    expect(spanInWords(206)).toBe("about 7 months");
    expect(spanInWords(360)).toBe("about 12 months");
  });
  it("years beyond ~18 months", () => {
    expect(spanInWords(600)).toBe("about 2 years");
  });
});
