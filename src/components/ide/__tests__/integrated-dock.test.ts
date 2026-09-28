import { describe, it, expect } from "bun:test";
import { useIDEStore } from "@/store/ide-store";

describe("IntegratedDock Tab Management", () => {
  it("switches to synth tab and manages synthesis output", () => {
    const store = useIDEStore.getState();

    // Default tab check
    expect(store.activeDockTab).toBeDefined();

    // Switch to synth tab
    store.setActiveDockTab("synth");
    expect(useIDEStore.getState().activeDockTab).toBe("synth");

    // Setting result
    store.setSynthesisResult({
      success: true,
      output: "Done",
      gate_verilog: "module alu(); endmodule",
      top_module: "alu",
      cell_counts: { $_AND_: 5 },
      wire_count: 10,
      bit_count: 10,
      public_wires: 6,
    });
    expect(useIDEStore.getState().synthesisResult?.top_module).toBe("alu");

    // Clear result
    store.setSynthesisResult(null);
    expect(useIDEStore.getState().synthesisResult).toBe(null);

    // Reset back to console
    store.setActiveDockTab("console");
  });
});
