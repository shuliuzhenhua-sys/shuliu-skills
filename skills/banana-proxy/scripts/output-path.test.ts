import { describe, expect, test } from "bun:test";
import { normalizeOutputImagePath } from "./output-path";

describe("normalizeOutputImagePath", () => {
  test("defaults extensionless output paths to .jpg", () => {
    const outputPath = normalizeOutputImagePath("/tmp/banana-proxy-test");
    expect(outputPath).toBe("/tmp/banana-proxy-test.jpg");
  });

  test("preserves an explicit .jpg output path", () => {
    const outputPath = normalizeOutputImagePath("/tmp/banana-proxy-test.jpg");
    expect(outputPath).toBe("/tmp/banana-proxy-test.jpg");
  });
});
