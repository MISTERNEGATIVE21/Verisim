import { describe, it, expect } from "bun:test";
import { useIDEStore, type ToolchainHealth } from "../ide-store";

describe("Toolchain Configuration and Health Management", () => {
  it("defaults to system path auto-detection", () => {
    const store = useIDEStore.getState();
    expect(store.toolchainConfig.use_custom_paths).toBe(false);
  });

  it("updates toolchain configuration and persists custom paths", () => {
    const store = useIDEStore.getState();
    store.setToolchainConfig({
      use_custom_paths: true,
      verilator_path: "/opt/eda/verilator",
      yosys_path: "/home/mister/tools/yosys",
    });

    const updated = useIDEStore.getState().toolchainConfig;
    expect(updated.use_custom_paths).toBe(true);
    expect(updated.verilator_path).toBe("/opt/eda/verilator");
    expect(updated.yosys_path).toBe("/home/mister/tools/yosys");

    // Reset back to defaults
    store.setToolchainConfig({ use_custom_paths: false });
    expect(useIDEStore.getState().toolchainConfig.use_custom_paths).toBe(false);
  });

  it("manages toolchain modal open state", () => {
    const store = useIDEStore.getState();
    expect(store.isToolchainModalOpen).toBe(false);

    store.setIsToolchainModalOpen(true);
    expect(useIDEStore.getState().isToolchainModalOpen).toBe(true);

    store.setIsToolchainModalOpen(false);
    expect(useIDEStore.getState().isToolchainModalOpen).toBe(false);
  });

  it("manages toolchain health reporting", () => {
    const store = useIDEStore.getState();
    expect(store.toolchainHealth).toBe(null);

    const mockHealth: ToolchainHealth = {
      iverilog: { name: "Icarus", found: true, resolved_path: "/usr/bin/iverilog", version: "13.0" },
      vvp: { name: "VVP", found: true, resolved_path: "/usr/bin/vvp", version: "13.0" },
      verilator: { name: "Verilator", found: true, resolved_path: "/usr/bin/verilator", version: "5.052" },
      yosys: { name: "Yosys", found: false, resolved_path: "", version: "", error: "Not found" },
      python: { name: "Python 3", found: true, resolved_path: "/usr/bin/python3", version: "3.14.7" },
    };

    store.setToolchainHealth(mockHealth);
    const health = useIDEStore.getState().toolchainHealth;
    expect(health).not.toBeNull();
    expect(health?.verilator.found).toBe(true);
    expect(health?.yosys.found).toBe(false);
  });
});
