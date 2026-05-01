import { describe, it, expect } from "vitest";
import {
  canDeleteSheriffRow,
  getNextPromotionGrade,
  getNextDemotionGrade,
  canDemote,
  canEditFormation,
} from "./dashboardPermissions";

/**
 * Grade matrix (lower number = higher rank):
 *   0 Sheriff de comté
 *   1 Sheriff Adjoint
 *   2 Sheriff en chef
 *   3 Sheriff
 *   4 Sheriff Deputy
 *   5 Deputy
 *
 * Tests below mirror the backend authorization rules; any divergence likely
 * means the backend changed and this matrix must be updated together with it.
 */

describe("canDeleteSheriffRow", () => {
  it("rejects when actor has no grade or is not Comté/Adjoint", () => {
    expect(canDeleteSheriffRow(null, "Deputy", "alice", "bob")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff en chef", "Deputy", "alice", "bob")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff", "Deputy", "alice", "bob")).toBe(false);
    expect(canDeleteSheriffRow("Deputy", "Deputy", "alice", "bob")).toBe(false);
  });

  it("rejects when target has no grade", () => {
    expect(canDeleteSheriffRow("Sheriff de comté", null, "alice", "bob")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff Adjoint", undefined, "alice", "bob")).toBe(false);
  });

  it("rejects when actor tries to delete itself (case-insensitive)", () => {
    expect(canDeleteSheriffRow("Sheriff de comté", "Sheriff de comté", "Alice", "alice")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff Adjoint", "Sheriff Adjoint", "BOB", "bob")).toBe(false);
  });

  it("Comté can delete every other rank", () => {
    for (const target of [
      "Sheriff Adjoint",
      "Sheriff en chef",
      "Sheriff",
      "Sheriff Deputy",
      "Deputy",
    ]) {
      expect(canDeleteSheriffRow("Sheriff de comté", target, "comte", "target")).toBe(true);
    }
  });

  it("Adjoint can delete strictly lower ranks but not Comté or peers", () => {
    expect(canDeleteSheriffRow("Sheriff Adjoint", "Sheriff de comté", "adj", "comte")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff Adjoint", "Sheriff Adjoint", "adj", "peer")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff Adjoint", "Sheriff en chef", "adj", "chef")).toBe(true);
    expect(canDeleteSheriffRow("Sheriff Adjoint", "Deputy", "adj", "dep")).toBe(true);
  });

  it("rejects when current username is missing", () => {
    expect(canDeleteSheriffRow("Sheriff de comté", "Deputy", null, "bob")).toBe(false);
    expect(canDeleteSheriffRow("Sheriff de comté", "Deputy", undefined, "bob")).toBe(false);
  });
});

describe("getNextPromotionGrade", () => {
  it("returns null when actor or target is missing", () => {
    expect(getNextPromotionGrade(null, "Deputy")).toBeNull();
    expect(getNextPromotionGrade("Sheriff de comté", null)).toBeNull();
  });

  it("returns null when actor has no admin order (>2)", () => {
    expect(getNextPromotionGrade("Sheriff", "Deputy")).toBeNull();
    expect(getNextPromotionGrade("Sheriff Deputy", "Deputy")).toBeNull();
    expect(getNextPromotionGrade("Deputy", "Deputy")).toBeNull();
  });

  it("returns null when target is already at or above the actor's level", () => {
    expect(getNextPromotionGrade("Sheriff Adjoint", "Sheriff Adjoint")).toBeNull();
    expect(getNextPromotionGrade("Sheriff Adjoint", "Sheriff de comté")).toBeNull();
    expect(getNextPromotionGrade("Sheriff en chef", "Sheriff en chef")).toBeNull();
  });

  it("Comté promotes one step up (next grade just above the target)", () => {
    expect(getNextPromotionGrade("Sheriff de comté", "Deputy")).toBe("Sheriff Deputy");
    expect(getNextPromotionGrade("Sheriff de comté", "Sheriff Deputy")).toBe("Sheriff");
    expect(getNextPromotionGrade("Sheriff de comté", "Sheriff")).toBe("Sheriff en chef");
    expect(getNextPromotionGrade("Sheriff de comté", "Sheriff en chef")).toBe("Sheriff Adjoint");
  });

  it("Adjoint can promote up to and including peer rank, but not above", () => {
    // Adjoint (1) promoting Sheriff (3) → next slot is "Sheriff en chef" (2)
    expect(getNextPromotionGrade("Sheriff Adjoint", "Sheriff")).toBe("Sheriff en chef");
    // Adjoint (1) promoting Sheriff en chef (2) → next slot is peer "Sheriff Adjoint" (1)
    expect(getNextPromotionGrade("Sheriff Adjoint", "Sheriff en chef")).toBe("Sheriff Adjoint");
    // ...but never above (Comté = 0)
    expect(getNextPromotionGrade("Sheriff Adjoint", "Sheriff Adjoint")).toBeNull();
  });

  it("En chef promotes lower ranks, including up to peer level", () => {
    expect(getNextPromotionGrade("Sheriff en chef", "Deputy")).toBe("Sheriff Deputy");
    // En chef (2) promoting Sheriff (3) → "Sheriff en chef" (2) peer slot
    expect(getNextPromotionGrade("Sheriff en chef", "Sheriff")).toBe("Sheriff en chef");
    // ...but never above its own rank
    expect(getNextPromotionGrade("Sheriff en chef", "Sheriff en chef")).toBeNull();
    expect(getNextPromotionGrade("Sheriff en chef", "Sheriff Adjoint")).toBeNull();
  });
});

describe("getNextDemotionGrade", () => {
  it("returns null on missing or unknown grade", () => {
    expect(getNextDemotionGrade(null)).toBeNull();
    expect(getNextDemotionGrade("Inconnu")).toBeNull();
  });

  it("returns the immediate lower grade", () => {
    expect(getNextDemotionGrade("Sheriff de comté")).toBe("Sheriff Adjoint");
    expect(getNextDemotionGrade("Sheriff Adjoint")).toBe("Sheriff en chef");
    expect(getNextDemotionGrade("Sheriff en chef")).toBe("Sheriff");
    expect(getNextDemotionGrade("Sheriff")).toBe("Sheriff Deputy");
    expect(getNextDemotionGrade("Sheriff Deputy")).toBe("Deputy");
  });

  it("returns null at the bottom of the hierarchy", () => {
    expect(getNextDemotionGrade("Deputy")).toBeNull();
  });
});

describe("canDemote", () => {
  it("rejects when grades are missing or unknown", () => {
    expect(canDemote(null, "Deputy")).toBe(false);
    expect(canDemote("Sheriff de comté", null)).toBe(false);
  });

  it("rejects when actor's order > 2 (i.e. not admin tier)", () => {
    expect(canDemote("Sheriff", "Deputy")).toBe(false);
    expect(canDemote("Sheriff Deputy", "Deputy")).toBe(false);
  });

  it("requires actor strictly above target", () => {
    expect(canDemote("Sheriff Adjoint", "Sheriff Adjoint")).toBe(false);
    expect(canDemote("Sheriff Adjoint", "Sheriff de comté")).toBe(false);
    expect(canDemote("Sheriff Adjoint", "Sheriff en chef")).toBe(true);
    expect(canDemote("Sheriff de comté", "Deputy")).toBe(true);
  });
});

describe("canEditFormation", () => {
  it("rejects when actor grade is missing or unknown", () => {
    expect(canEditFormation(null, "Deputy", 5, false)).toBe(false);
    expect(canEditFormation("Inconnu", "Deputy", 5, false)).toBe(false);
  });

  it("locks formations reserved to higher tiers", () => {
    // formationMaxGradeOrder = 1 means "only Comté + Adjoint can validate"
    expect(canEditFormation("Sheriff en chef", "Sheriff", 1, false)).toBe(false);
    expect(canEditFormation("Sheriff Adjoint", "Sheriff", 1, false)).toBe(true);
  });

  it("only Sheriff de comté can validate their own row", () => {
    expect(canEditFormation("Sheriff de comté", "Sheriff de comté", 5, true)).toBe(true);
    expect(canEditFormation("Sheriff Adjoint", "Sheriff Adjoint", 5, true)).toBe(false);
    expect(canEditFormation("Sheriff en chef", "Sheriff en chef", 5, true)).toBe(false);
  });

  it("requires actor with admin order (≤2) to validate other rows", () => {
    expect(canEditFormation("Sheriff", "Deputy", 5, false)).toBe(false);
    expect(canEditFormation("Sheriff Deputy", "Deputy", 5, false)).toBe(false);
  });

  it("requires actor strictly above target on other rows", () => {
    expect(canEditFormation("Sheriff Adjoint", "Sheriff Adjoint", 5, false)).toBe(false);
    expect(canEditFormation("Sheriff Adjoint", "Sheriff de comté", 5, false)).toBe(false);
    expect(canEditFormation("Sheriff Adjoint", "Sheriff", 5, false)).toBe(true);
    expect(canEditFormation("Sheriff de comté", "Deputy", 5, false)).toBe(true);
  });
});
