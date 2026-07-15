import { Notice, Plugin, type TFile, type WorkspaceLeaf } from "obsidian";
import { GalaxyGraphView, GALAXY_GRAPH_VIEW_TYPE } from "./galaxy-view";
import {
  DEFAULT_SETTINGS,
  GalaxyGraphSettingTab,
  type GalaxyGraphSettings
} from "./settings";

export default class GalaxyGraphPlugin extends Plugin {
  settings: GalaxyGraphSettings = DEFAULT_SETTINGS;
  private lastMarkdownPath: string | null = null;
  private refreshTimer: number | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.lastMarkdownPath = this.app.workspace.getActiveFile()?.path ?? null;

    this.registerView(
      GALAXY_GRAPH_VIEW_TYPE,
      (leaf) => new GalaxyGraphView(leaf, this)
    );

    this.addRibbonIcon("orbit", "Open Galaxy Graph", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-galaxy-graph",
      name: "Open galaxy graph",
      callback: () => {
        void this.activateView();
      }
    });

    this.addCommand({
      id: "focus-active-note",
      name: "Focus active note in galaxy graph",
      callback: () => {
        void this.activateView(true);
      }
    });

    this.addSettingTab(new GalaxyGraphSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on("file-open", (file: TFile | null) => {
      if (file?.extension === "md") {
        this.lastMarkdownPath = file.path;
      }
    }));
    this.registerEvent(this.app.metadataCache.on("resolved", () => this.scheduleRefresh()));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
  }

  onunload(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.app.workspace.detachLeavesOfType(GALAXY_GRAPH_VIEW_TYPE);
  }

  getLastMarkdownPath(): string | null {
    return this.lastMarkdownPath ?? this.app.workspace.getActiveFile()?.path ?? null;
  }

  async updateSettings(patch: Partial<GalaxyGraphSettings>): Promise<void> {
    this.settings = { ...this.settings, ...patch };
    await this.saveData(this.settings);
    const changedKeys = new Set(Object.keys(patch));
    await Promise.all(this.getViews().map((view) => view.applySettings(changedKeys)));
  }

  private async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() as Partial<GalaxyGraphSettings> };
  }

  private async activateView(focusActive = false): Promise<void> {
    let leaf: WorkspaceLeaf | undefined = this.app.workspace.getLeavesOfType(GALAXY_GRAPH_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ active: true, type: GALAXY_GRAPH_VIEW_TYPE });
    }
    await this.app.workspace.revealLeaf(leaf);

    if (leaf.view instanceof GalaxyGraphView) {
      if (focusActive) {
        leaf.view.focusActiveNeighborhood();
      }
      return;
    }
    new Notice("Galaxy Graph view could not be opened.");
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      for (const view of this.getViews()) {
        void view.rebuildData();
      }
    }, 650);
  }

  private getViews(): GalaxyGraphView[] {
    return this.app.workspace
      .getLeavesOfType(GALAXY_GRAPH_VIEW_TYPE)
      .map((leaf) => leaf.view)
      .filter((view): view is GalaxyGraphView => view instanceof GalaxyGraphView);
  }
}
