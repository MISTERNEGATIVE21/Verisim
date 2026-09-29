import { describe, it, expect, beforeEach } from "bun:test";
import { useIDEStore, VerilogFile } from "@/store/ide-store";

describe("VSCodium Titlebar & Command Palette State", () => {
  beforeEach(() => {
    const store = useIDEStore.getState();
    store.setCurrentProject(null);
    store.setSelectedEngine("iverilog");
    store.setWaveformLayout("dock");
    store.setSidebarCollapsed(false);
    store.setDockCollapsed(false);
    store.setIsToolchainModalOpen(false);
    store.setIsNewProjectDialogOpen(false);
  });

  it("handles engine switching between Icarus and Verilator", () => {
    const store = useIDEStore.getState();
    expect(store.selectedEngine).toBe("iverilog");

    store.setSelectedEngine("verilator");
    expect(useIDEStore.getState().selectedEngine).toBe("verilator");

    store.setSelectedEngine("iverilog");
    expect(useIDEStore.getState().selectedEngine).toBe("iverilog");
  });

  it("toggles waveform split layout", () => {
    const store = useIDEStore.getState();
    expect(store.waveformLayout).toBe("dock");

    store.toggleWaveformLayout();
    expect(useIDEStore.getState().waveformLayout).toBe("side-by-side");

    store.toggleWaveformLayout();
    expect(useIDEStore.getState().waveformLayout).toBe("dock");
  });

  it("manages toolchain modal open/close trigger", () => {
    const store = useIDEStore.getState();
    expect(store.isToolchainModalOpen).toBe(false);

    store.setIsToolchainModalOpen(true);
    expect(useIDEStore.getState().isToolchainModalOpen).toBe(true);

    store.setIsToolchainModalOpen(false);
    expect(useIDEStore.getState().isToolchainModalOpen).toBe(false);
  });

  it("manages new project dialog trigger", () => {
    const store = useIDEStore.getState();
    expect(store.isNewProjectDialogOpen).toBe(false);

    store.setIsNewProjectDialogOpen(true);
    expect(useIDEStore.getState().isNewProjectDialogOpen).toBe(true);

    store.setIsNewProjectDialogOpen(false);
    expect(useIDEStore.getState().isNewProjectDialogOpen).toBe(false);
  });

  it("manages quick file open and active file selection in project", () => {
    const store = useIDEStore.getState();

    const sampleFiles: VerilogFile[] = [
      {
        id: "p1:top.sv",
        name: "top.sv",
        content: "module top(); endmodule",
        type: "systemverilog",
        project_id: "p1",
      },
      {
        id: "p1:alu.v",
        name: "alu.v",
        content: "module alu(); endmodule",
        type: "verilog",
        project_id: "p1",
      },
      {
        id: "p1:test.py",
        name: "test.py",
        content: "print('test')",
        type: "python",
        project_id: "p1",
      },
    ];

    store.setCurrentProject({
      id: "p1",
      name: "Test_Project",
      description: "Sample project for VSCodium testing",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      files: sampleFiles,
    });

    const current = useIDEStore.getState().currentProject;
    expect(current).not.toBeNull();
    expect(current?.files.length).toBe(3);

    // Initial active file is first file
    expect(useIDEStore.getState().activeFile?.name).toBe("top.sv");

    // Command palette jumps to alu.v
    store.openFile(sampleFiles[1]);
    expect(useIDEStore.getState().activeFile?.name).toBe("alu.v");

    // Command palette jumps to test.py
    store.openFile(sampleFiles[2]);
    expect(useIDEStore.getState().activeFile?.name).toBe("test.py");
  });
});
