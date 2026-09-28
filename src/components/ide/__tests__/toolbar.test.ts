import { describe, it, expect } from "bun:test";
import { useIDEStore } from "@/store/ide-store";

describe("Toolbar EDA Action Hub State", () => {
  it("manages synthesis trigger and active dock tab", () => {
    const store = useIDEStore.getState();

    // Trigger synthesis state
    store.setSynthesizing(true);
    store.setActiveDockTab("synth");
    store.setDockCollapsed(false);

    expect(useIDEStore.getState().isSynthesizing).toBe(true);
    expect(useIDEStore.getState().activeDockTab).toBe("synth");
    expect(useIDEStore.getState().dockCollapsed).toBe(false);

    // End synthesis state
    store.setSynthesizing(false);
    expect(useIDEStore.getState().isSynthesizing).toBe(false);

    // Reset back
    store.setActiveDockTab("console");
  });

  it("handles sidebar toggle shortcut logic", () => {
    const store = useIDEStore.getState();
    store.setSidebarCollapsed(false);
    expect(useIDEStore.getState().sidebarCollapsed).toBe(false);

    store.setSidebarCollapsed(true);
    expect(useIDEStore.getState().sidebarCollapsed).toBe(true);

    store.setSidebarCollapsed(false);
    expect(useIDEStore.getState().sidebarCollapsed).toBe(false);
  });
});
