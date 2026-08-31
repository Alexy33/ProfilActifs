import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("concatene les classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("laisse la derniere classe Tailwind gagner en cas de conflit", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignore les valeurs falsy", () => {
    expect(cn("px-2", false && "hidden", undefined, null)).toBe("px-2");
  });
});
