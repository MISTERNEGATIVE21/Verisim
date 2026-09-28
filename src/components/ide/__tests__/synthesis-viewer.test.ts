import { describe, it, expect } from "bun:test";
import { categorizeCells } from "../SynthesisViewer";

describe("Synthesis Gate Categorization", () => {
  it("correctly distinguishes XOR/XNOR from OR/NOR cells", () => {
    const cells = {
      "$_XOR_": 5,
      "$_XNOR_": 2,
      "$_OR_": 4,
      "$_NOR_": 1,
      "$_AND_": 8,
      "$_NAND_": 3,
      "$_DFF_P_": 6,
      "$_NOT_": 7,
    };

    const result = categorizeCells(cells);
    expect(result.xorCount).toBe(7); // 5 + 2
    expect(result.orCount).toBe(5);  // 4 + 1
    expect(result.andCount).toBe(11); // 8 + 3
    expect(result.dffCount).toBe(6);
    expect(result.notCount).toBe(7);
  });
});
