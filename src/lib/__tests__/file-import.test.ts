import { describe, it, expect } from "bun:test";
import { useIDEStore, VerilogFile } from "@/store/ide-store";

describe("Verilog & SystemVerilog File Loading into Project", () => {
  it("imports and merges new Verilog and SV files into the active project", () => {
    const store = useIDEStore.getState();

    // Create baseline project
    const initialProject = {
      id: "proj_test_1",
      name: "TestProject",
      description: "Test project for import",
      files: [
        {
          id: "f1",
          name: "top.v",
          content: "module top(); endmodule",
          type: "verilog",
          project_id: "proj_test_1",
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.setCurrentProject(initialProject);
    expect(useIDEStore.getState().currentProject?.files.length).toBe(1);

    // Simulate importing a new .sv file
    const newSvFile: VerilogFile = {
      id: "f2",
      name: "fifo_sync.sv",
      content: "module fifo_sync; endmodule",
      type: "systemverilog",
      project_id: "proj_test_1",
    };

    store.setProjectFiles([...useIDEStore.getState().currentProject!.files, newSvFile]);
    expect(useIDEStore.getState().currentProject?.files.length).toBe(2);

    // Open the imported file
    store.openFile(newSvFile);
    expect(useIDEStore.getState().activeFile?.name).toBe("fifo_sync.sv");
  });
});
