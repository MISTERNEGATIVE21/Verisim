import { describe, it, expect } from "bun:test";
import { useIDEStore } from "@/store/ide-store";

describe("VSCodium Editor Tabs, Breadcrumbs, Integrated Dock & Status Bar", () => {
  it("manages IntegratedDock tabs and dock collapse / maximize states", () => {
    const store = useIDEStore.getState();

    // Default tab check
    expect(store.activeDockTab).toBeDefined();

    // Switch between dock tabs
    store.setActiveDockTab("console");
    expect(useIDEStore.getState().activeDockTab).toBe("console");
    expect(useIDEStore.getState().dockCollapsed).toBe(false);

    store.setActiveDockTab("synth");
    expect(useIDEStore.getState().activeDockTab).toBe("synth");

    store.setActiveDockTab("python");
    expect(useIDEStore.getState().activeDockTab).toBe("python");

    store.setActiveDockTab("waveform");
    expect(useIDEStore.getState().activeDockTab).toBe("waveform");

    // Toggle dock collapsed
    store.setDockCollapsed(true);
    expect(useIDEStore.getState().dockCollapsed).toBe(true);

    store.setDockCollapsed(false);
    expect(useIDEStore.getState().dockCollapsed).toBe(false);

    // Toggle dock maximized
    store.setDockMaximized(true);
    expect(useIDEStore.getState().dockMaximized).toBe(true);

    store.setDockMaximized(false);
    expect(useIDEStore.getState().dockMaximized).toBe(false);
  });

  it("handles waveform layout splitting from tab actions", () => {
    const store = useIDEStore.getState();

    // Layout default is dock
    store.setWaveformLayout("dock");
    expect(useIDEStore.getState().waveformLayout).toBe("dock");

    // Toggle layout
    store.toggleWaveformLayout();
    expect(useIDEStore.getState().waveformLayout).toBe("side-by-side");

    store.toggleWaveformLayout();
    expect(useIDEStore.getState().waveformLayout).toBe("dock");
  });

  it("detects language modes accurately for status bar", () => {
    const getLanguageMode = (fileName: string) => {
      if (fileName.endsWith(".sv") || fileName.endsWith(".svh")) return "SystemVerilog";
      if (fileName.endsWith(".py")) return "Python";
      return "Verilog";
    };

    expect(getLanguageMode("counter.v")).toBe("Verilog");
    expect(getLanguageMode("fifo.sv")).toBe("SystemVerilog");
    expect(getLanguageMode("axi_pkg.svh")).toBe("SystemVerilog");
    expect(getLanguageMode("test_runner.py")).toBe("Python");
  });

  it("detects module, interface, and class symbols for breadcrumbs navigation", () => {
    const detectSymbol = (content: string, fileName: string) => {
      if (fileName.endsWith(".py")) {
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const classMatch = lines[i].match(/^\s*class\s+([a-zA-Z0-9_]+)/);
          if (classMatch) return { name: classMatch[1], kind: "class", line: i + 1 };
          const defMatch = lines[i].match(/^\s*def\s+([a-zA-Z0-9_]+)/);
          if (defMatch) return { name: `${defMatch[1]}()`, kind: "function", line: i + 1 };
        }
        return { name: fileName.replace(/\.[^/.]+$/, ""), kind: "file", line: 1 };
      }

      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const modMatch = lines[i].match(/^\s*(?:module|interface|package|class)\s+([a-zA-Z0-9_$]+)/);
        if (modMatch) return { name: modMatch[1], kind: "module", line: i + 1 };
      }
      return { name: fileName.replace(/\.[^/.]+$/, ""), kind: "module", line: 1 };
    };

    // Verilog test
    const verilogCode = `// Top module\nmodule counter #(\n  parameter WIDTH = 4\n) (\n  input clk\n);\nendmodule`;
    expect(detectSymbol(verilogCode, "counter.v")).toEqual({
      name: "counter",
      kind: "module",
      line: 2,
    });

    // SystemVerilog Interface test
    const svInterface = `interface mem_bus_if (\n  input logic clk\n);\nendinterface`;
    expect(detectSymbol(svInterface, "mem_bus.sv")).toEqual({
      name: "mem_bus_if",
      kind: "module",
      line: 1,
    });

    // Python verification test
    const pythonCode = `import sys\n\nclass TestALU:\n    def run(self):\n        pass`;
    expect(detectSymbol(pythonCode, "verify_alu.py")).toEqual({
      name: "TestALU",
      kind: "class",
      line: 3,
    });
  });

  it("calculates diagnostic error and warning counts for status bar and problems tab", () => {
    const parseDiagnostics = (simOutput: string) => {
      let errors = 0;
      let warnings = 0;
      const lines = simOutput.split('\n');
      for (const line of lines) {
        if (/\b(error|ERROR|fatal|FATAL)\b/.test(line)) errors++;
        else if (/\b(warning|WARNING)\b/.test(line)) warnings++;
      }
      return { errors, warnings };
    };

    const cleanOutput = "Compilation finished successfully.\nVCD info: dumpfile dump.vcd opened.";
    expect(parseDiagnostics(cleanOutput)).toEqual({ errors: 0, warnings: 0 });

    const errorOutput = "counter.v:15: error: syntax error\ncounter.v:22: warning: implicit wire declaration";
    expect(parseDiagnostics(errorOutput)).toEqual({ errors: 1, warnings: 1 });
  });
});
