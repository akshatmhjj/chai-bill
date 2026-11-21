import { describe, expect, it } from "vitest";
import { flatSizeLabel, namesList } from "./people";

describe("namesList", () => {
  it("reads naturally for a few people", () => {
    expect(namesList([])).toBe("");
    expect(namesList(["Priya"])).toBe("Priya");
    expect(namesList(["Priya", "Arjun"])).toBe("Priya and Arjun");
    expect(namesList(["Priya", "Arjun", "Meera"])).toBe("Priya, Arjun and Meera");
  });

  it("shortens large flats instead of listing everyone", () => {
    expect(namesList(["Priya", "Arjun", "Meera", "Ravi"])).toBe("Priya, Arjun and 2 more");
    expect(namesList(Array.from({ length: 14 }, (_, i) => `P${i}`))).toBe("P0, P1 and 12 more");
  });
});

describe("flatSizeLabel", () => {
  it("labels the flat by how many people are in it", () => {
    expect(flatSizeLabel(1)).toBe("Just you");
    expect(flatSizeLabel(2)).toBe("2 people");
    expect(flatSizeLabel(15)).toBe("15 people");
  });
});
