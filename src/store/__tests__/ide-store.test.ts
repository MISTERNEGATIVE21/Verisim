import { describe, it, expect } from "bun:test";
import { useIDEStore } from "../ide-store";

describe("IDEStore Activity & Synthesis State", () => {
  it("manages activeActivityTab", () => {
    const store = useIDEStore.getState();
    expect(store.activeActivityTab).toBe("files");

    store.setActiveActivityTab("synth");
    expect(useIDEStore.getState().activeActivityTab).toBe("synth");

    store.setActiveActivityTab("waveform");
    expect(useIDEStore.getState().activeActivityTab).toBe("waveform");

    store.setActiveActivityTab("ai");
    expect(useIDEStore.getState().activeActivityTab).toBe("ai");

    // Reset back to files
    store.setActiveActivityTab("files");
  });

  it("manages synthesis state and result", () => {
    const store = useIDEStore.getState();
    expect(store.isSynthesizing).toBe(false);
    expect(store.synthesisResult).toBe(null);

    store.setSynthesizing(true);
    expect(useIDEStore.getState().isSynthesizing).toBe(true);

    const mockResult = {
      success: true,
      output: "Synthesis finished",
      gate_verilog: "module top(); endmodule",
      top_module: "top",
      cell_counts: { $_AND_: 4, $_OR_: 2 },
      wire_count: 8,
      bit_count: 8,
      public_wires: 6,
    };

    store.setSynthesisResult(mockResult);
    expect(useIDEStore.getState().synthesisResult).toEqual(mockResult);

    store.setSynthesizing(false);
    expect(useIDEStore.getState().isSynthesizing).toBe(false);
  });
});
