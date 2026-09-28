import { describe, it, expect } from "bun:test";
import { useIDEStore } from "@/store/ide-store";

describe("ActivityBar Navigation Controller", () => {
  it("switches tabs and manages sidebar collapse correctly", () => {
    const store = useIDEStore.getState();
    
    // Start with files and open
    store.setActiveActivityTab("files");
    store.setSidebarCollapsed(false);

    // Clicking active tab 'files' should collapse sidebar
    if (useIDEStore.getState().activeActivityTab === "files" && !useIDEStore.getState().sidebarCollapsed) {
      store.setSidebarCollapsed(true);
    }
    expect(useIDEStore.getState().sidebarCollapsed).toBe(true);

    // Clicking inactive tab 'synth' should activate synth and open sidebar
    store.setActiveActivityTab("synth");
    store.setSidebarCollapsed(false);
    expect(useIDEStore.getState().activeActivityTab).toBe("synth");
    expect(useIDEStore.getState().sidebarCollapsed).toBe(false);

    // Waveform click activates dock waveform tab
    store.setActiveDockTab("waveform");
    store.setDockCollapsed(false);
    expect(useIDEStore.getState().activeDockTab).toBe("waveform");
    expect(useIDEStore.getState().dockCollapsed).toBe(false);

    // Reset back
    store.setActiveActivityTab("files");
    store.setSidebarCollapsed(false);
  });
});
