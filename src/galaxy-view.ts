import { ItemView, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import ForceGraph3D, { type ForceGraph3DInstance } from "3d-force-graph";
import { FogExp2, Group, type Points, Vector2 } from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type GalaxyGraphPlugin from "./main";
import {
  buildGalaxyData,
  endpointId,
  type GalaxyData,
  type GalaxyLink,
  type GalaxyNode
} from "./graph-data";
import { createDustField, StarVisualFactory } from "./visuals";

export const GALAXY_GRAPH_VIEW_TYPE = "galaxy-graph-view";

interface OrbitControlsLike {
  autoRotate: boolean;
  autoRotateSpeed: number;
  dampingFactor: number;
  enableDamping: boolean;
}

export class GalaxyGraphView extends ItemView {
  private bloomPass: UnrealBloomPass | null = null;
  private data: GalaxyData = { isLarge: false, links: [], nodes: [], totalLinks: 0 };
  private dustField: Points | null = null;
  private graph: ForceGraph3DInstance<GalaxyNode, GalaxyLink> | null = null;
  private graphHost: HTMLDivElement | null = null;
  private highlightedIds = new Set<string>();
  private nodeById = new Map<string, GalaxyNode>();
  private readonly nodeObjects = new Map<string, Group>();
  private resizeObserver: ResizeObserver | null = null;
  private rotationButton: HTMLButtonElement | null = null;
  private rotationEnabled = true;
  private searchInput: HTMLInputElement | null = null;
  private shouldAutoFit = false;
  private starFactory: StarVisualFactory | null = null;
  private statusEl: HTMLDivElement | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: GalaxyGraphPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return GALAXY_GRAPH_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.plugin.i18n.viewTitle;
  }

  getIcon(): string {
    return "orbit";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("galaxy-graph-view");

    const shell = this.contentEl.createDiv({ cls: "galaxy-graph-shell" });
    this.graphHost = shell.createDiv({ cls: "galaxy-graph-canvas" });
    this.buildToolbar(shell);
    this.statusEl = shell.createDiv({ cls: "galaxy-graph-status" });
    shell.createDiv({
      cls: "galaxy-graph-hint",
      text: this.plugin.i18n.viewHint
    });

    this.starFactory = new StarVisualFactory();
    this.initializeGraph();
    await this.rebuildData();
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.disposeNodeObjects();

    if (this.graph && this.dustField) {
      this.graph.scene().remove(this.dustField);
      this.dustField.geometry.dispose();
      const dustMaterials = Array.isArray(this.dustField.material)
        ? this.dustField.material
        : [this.dustField.material];
      for (const material of dustMaterials) {
        material.dispose();
      }
    }
    this.dustField = null;
    this.bloomPass?.dispose();
    this.bloomPass = null;
    this.starFactory?.dispose();
    this.starFactory = null;
    this.graph?._destructor();
    this.graph = null;
    this.graphHost = null;
  }

  async rebuildData(): Promise<void> {
    if (!this.graph) {
      return;
    }

    this.disposeNodeObjects();
    this.data = buildGalaxyData(this.app, this.plugin.settings);
    this.nodeById = new Map(this.data.nodes.map((node) => [node.id, node]));
    this.highlightedIds = new Set(
      Array.from(this.highlightedIds).filter((id) => this.nodeById.has(id))
    );
    this.shouldAutoFit = true;
    if (this.bloomPass) {
      this.bloomPass.enabled = !this.data.isLarge;
      this.bloomPass.strength = this.plugin.settings.bloomStrength;
    }
    this.graph.scene().fog = new FogExp2(
      this.plugin.settings.backgroundColor,
      this.effectiveFogDensity()
    );
    this.graph
      .cooldownTicks(this.data.isLarge ? 72 : 180)
      .linkOpacity(this.effectiveLinkOpacity())
      .renderer()
      .setPixelRatio(this.data.isLarge ? 1 : Math.min(window.devicePixelRatio, 2));
    this.graph.graphData(this.data);
    this.updateStatus();

    window.requestAnimationFrame(() => this.updateEmphasis());
  }

  async applySettings(changedKeys: ReadonlySet<string>): Promise<void> {
    if (!this.graph) {
      return;
    }

    this.graph
      .backgroundColor(this.plugin.settings.backgroundColor)
      .linkOpacity(this.effectiveLinkOpacity());
    this.graph.scene().fog = new FogExp2(
      this.plugin.settings.backgroundColor,
      this.effectiveFogDensity()
    );
    if (this.bloomPass) {
      this.bloomPass.enabled = !this.data.isLarge;
      this.bloomPass.strength = this.plugin.settings.bloomStrength;
    }
    this.rotationEnabled = this.plugin.settings.autoRotate;
    this.applyRotationSettings();

    const needsRebuild = ["nodeScale", "showOrphans", "excludedFolders", "maxLinks"]
      .some((key) => changedKeys.has(key));
    if (needsRebuild) {
      await this.rebuildData();
    } else {
      this.graph.refresh();
    }
  }

  focusActiveNeighborhood(): void {
    const activePath = this.plugin.getLastMarkdownPath();
    if (!activePath) {
      this.setTemporaryStatus(this.plugin.i18n.statusOpenMarkdownFirst);
      return;
    }

    const node = this.nodeById.get(activePath);
    if (!node) {
      this.setTemporaryStatus(this.plugin.i18n.statusActiveNoteExcluded);
      return;
    }

    if (this.searchInput) {
      this.searchInput.value = "";
    }
    this.highlightedIds = new Set([node.id, ...node.neighbors]);
    this.updateEmphasis();
    this.frameHighlightedNodes();
  }

  private buildToolbar(shell: HTMLDivElement): void {
    const toolbar = shell.createDiv({ cls: "galaxy-graph-toolbar" });
    const brand = toolbar.createDiv({ cls: "galaxy-graph-brand" });
    const brandIcon = brand.createSpan({ cls: "galaxy-graph-brand-icon" });
    setIcon(brandIcon, "sparkles");
    brand.createSpan({ text: "Galaxy" });

    const search = toolbar.createDiv({ cls: "galaxy-graph-search" });
    const searchIcon = search.createSpan();
    setIcon(searchIcon, "search");
    this.searchInput = search.createEl("input", {
      attr: {
        "aria-label": this.plugin.i18n.searchAriaLabel,
        placeholder: this.plugin.i18n.searchPlaceholder,
        type: "search"
      }
    });
    this.registerDomEvent(this.searchInput, "input", () => {
      this.applySearch(this.searchInput?.value ?? "");
    });
    this.registerDomEvent(this.searchInput, "keydown", (event) => {
      if (event.key === "Enter") {
        this.focusBestSearchMatch();
      } else if (event.key === "Escape") {
        this.clearHighlight();
      }
    });

    const actions = toolbar.createDiv({ cls: "galaxy-graph-actions" });
    const activeButton = this.createToolbarButton(
      actions,
      "circle-dot",
      this.plugin.i18n.toolbarActive,
      this.plugin.i18n.toolbarActiveTitle
    );
    this.registerDomEvent(activeButton, "click", () => this.focusActiveNeighborhood());

    const fitButton = this.createToolbarButton(
      actions,
      "scan",
      this.plugin.i18n.toolbarFit,
      this.plugin.i18n.toolbarFitTitle
    );
    this.registerDomEvent(fitButton, "click", () => this.fitGalaxy());

    this.rotationButton = this.createToolbarButton(
      actions,
      "rotate-3d",
      this.plugin.i18n.toolbarRotate,
      this.plugin.i18n.toolbarRotateTitle
    );
    this.registerDomEvent(this.rotationButton, "click", () => {
      this.rotationEnabled = !this.rotationEnabled;
      this.applyRotationSettings();
    });
  }

  private createToolbarButton(
    parent: HTMLElement,
    icon: string,
    label: string,
    title: string
  ): HTMLButtonElement {
    const button = parent.createEl("button", {
      attr: { "aria-label": title, title },
      cls: "galaxy-graph-button"
    });
    const iconEl = button.createSpan();
    setIcon(iconEl, icon);
    button.createSpan({ cls: "galaxy-graph-button-label", text: label });
    return button;
  }

  private initializeGraph(): void {
    if (!this.graphHost || !this.starFactory) {
      return;
    }

    const host = this.graphHost;
    const graph = new ForceGraph3D(host, {
      controlType: "orbit",
      rendererConfig: {
        alpha: false,
        antialias: true,
        powerPreference: "high-performance"
      }
    }) as unknown as ForceGraph3DInstance<GalaxyNode, GalaxyLink>;
    this.graph = graph;

    graph
      .backgroundColor(this.plugin.settings.backgroundColor)
      .showNavInfo(false)
      .nodeId("id")
      .nodeThreeObject((node) => this.createStar(node))
      .nodeLabel((node) => this.createNodeLabel(node))
      .nodeVal((node) => Math.max(1, node.degree))
      .linkColor(() => "#6e96ca")
      .linkOpacity(this.effectiveLinkOpacity())
      .linkWidth((link) => this.data.isLarge
        ? 0
        : Math.min(0.24 + Math.log2(link.weight + 1) * 0.16, 0.95))
      .linkVisibility((link) => this.isLinkHighlighted(link))
      .linkDirectionalParticles((link) => !this.data.isLarge && link.weight >= 4 ? 1 : 0)
      .linkDirectionalParticleColor(() => "#b9e7ff")
      .linkDirectionalParticleSpeed(0.0022)
      .linkDirectionalParticleWidth(0.42)
      .enableNodeDrag(true)
      .cooldownTicks(180)
      .d3VelocityDecay(0.28)
      .onNodeHover((node, previousNode) => this.handleNodeHover(node, previousNode))
      .onNodeClick((node, event) => {
        void this.openNode(node, event);
      })
      .onBackgroundClick(() => this.clearHighlight())
      .onEngineStop(() => {
        if (this.shouldAutoFit && this.data.nodes.length > 0) {
          this.shouldAutoFit = false;
          this.fitGalaxy();
        }
      });

    const scene = graph.scene();
    scene.fog = new FogExp2(this.plugin.settings.backgroundColor, 0.00048);
    this.dustField = createDustField();
    scene.add(this.dustField);

    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const bloomPass = new UnrealBloomPass(
      new Vector2(width, height),
      this.plugin.settings.bloomStrength,
      0.72,
      0.16
    );
    this.bloomPass = bloomPass;
    graph.postProcessingComposer().addPass(bloomPass);
    graph.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.rotationEnabled = this.plugin.settings.autoRotate;
    this.applyRotationSettings();
    this.resizeObserver = new ResizeObserver(() => this.resizeGraph());
    this.resizeObserver.observe(host);
    this.resizeGraph();
  }

  private createStar(node: GalaxyNode): Group {
    if (!this.starFactory) {
      return new Group();
    }
    const star = this.starFactory.create(node, this.plugin.settings, this.data.isLarge);
    this.nodeObjects.set(node.id, star);
    return star;
  }

  private createNodeLabel(node: GalaxyNode): HTMLElement {
    const label = document.createElement("div");
    label.className = "galaxy-graph-tooltip";
    const title = label.createDiv({ cls: "galaxy-graph-tooltip-title", text: node.name });
    title.setAttribute("aria-hidden", "true");
    label.createDiv({ cls: "galaxy-graph-tooltip-path", text: node.path });
    label.createDiv({
      cls: "galaxy-graph-tooltip-meta",
      text: this.plugin.i18n.nodeConnections(node.degree, node.folder)
    });
    return label;
  }

  private handleNodeHover(node: GalaxyNode | null, previousNode: GalaxyNode | null): void {
    if (previousNode) {
      this.nodeObjects.get(previousNode.id)?.scale.setScalar(1);
    }
    if (node) {
      this.nodeObjects.get(node.id)?.scale.setScalar(1.34);
    }
  }

  private async openNode(node: GalaxyNode, event: MouseEvent): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(node.path);
    if (!(file instanceof TFile)) {
      return;
    }
    const openInNewLeaf = event.metaKey || event.ctrlKey;
    await this.app.workspace.getLeaf(openInNewLeaf ? "tab" : false).openFile(file);
  }

  private applySearch(rawQuery: string): void {
    const query = rawQuery.trim().toLocaleLowerCase();
    if (!query) {
      this.highlightedIds.clear();
      this.updateEmphasis();
      this.updateStatus();
      return;
    }

    const matches = this.data.nodes.filter((node) =>
      node.name.toLocaleLowerCase().includes(query) || node.path.toLocaleLowerCase().includes(query)
    );
    const highlighted = new Set<string>();
    for (const node of matches) {
      highlighted.add(node.id);
      for (const neighbor of node.neighbors) {
        highlighted.add(neighbor);
      }
    }
    this.highlightedIds = highlighted;
    this.updateEmphasis();
    this.setStatus(this.plugin.i18n.searchResults(matches.length, highlighted.size));
  }

  private focusBestSearchMatch(): void {
    const query = this.searchInput?.value.trim().toLocaleLowerCase() ?? "";
    if (!query) {
      return;
    }
    const best = this.data.nodes.find((node) => node.name.toLocaleLowerCase() === query)
      ?? this.data.nodes.find((node) => node.name.toLocaleLowerCase().startsWith(query))
      ?? this.data.nodes.find((node) => node.path.toLocaleLowerCase().includes(query));
    if (best) {
      this.focusNode(best);
    }
  }

  private focusNode(node: GalaxyNode): void {
    if (!this.graph || node.x === undefined || node.y === undefined || node.z === undefined) {
      return;
    }
    const current = this.graph.cameraPosition();
    const delta = {
      x: current.x - node.x,
      y: current.y - node.y,
      z: current.z - node.z
    };
    const magnitude = Math.hypot(delta.x, delta.y, delta.z) || 1;
    const distance = 105 + Math.min(node.degree * 2.5, 70);
    const lookAt = { x: node.x, y: node.y, z: node.z };
    this.graph.cameraPosition(
      {
        x: node.x + delta.x / magnitude * distance,
        y: node.y + delta.y / magnitude * distance,
        z: node.z + delta.z / magnitude * distance
      },
      lookAt,
      900
    );
  }

  private frameHighlightedNodes(): void {
    if (!this.graph || this.highlightedIds.size === 0) {
      return;
    }
    this.graph.zoomToFit(900, 90, (node) => this.highlightedIds.has(node.id));
  }

  private updateEmphasis(): void {
    if (!this.graph || !this.starFactory) {
      return;
    }
    const hasHighlight = this.highlightedIds.size > 0;
    for (const [id, object] of this.nodeObjects) {
      const factor = !hasHighlight || this.highlightedIds.has(id) ? 1 : 0.075;
      this.starFactory.setEmphasis(object, factor);
    }
    this.graph.refresh();
  }

  private isLinkHighlighted(link: GalaxyLink): boolean {
    if (this.highlightedIds.size === 0) {
      return true;
    }
    return this.highlightedIds.has(endpointId(link.source))
      && this.highlightedIds.has(endpointId(link.target));
  }

  private clearHighlight(): void {
    if (this.searchInput) {
      this.searchInput.value = "";
    }
    this.highlightedIds.clear();
    this.updateEmphasis();
    this.updateStatus();
  }

  private fitGalaxy(): void {
    if (this.graph && this.data.nodes.length > 0) {
      this.graph.zoomToFit(900, 75);
    }
  }

  private applyRotationSettings(): void {
    if (!this.graph) {
      return;
    }
    const controls = this.graph.controls() as OrbitControlsLike;
    controls.autoRotate = this.rotationEnabled;
    controls.autoRotateSpeed = this.plugin.settings.autoRotateSpeed;
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    this.rotationButton?.toggleClass("is-active", this.rotationEnabled);
    this.rotationButton?.setAttribute("aria-pressed", String(this.rotationEnabled));
  }

  private resizeGraph(): void {
    if (!this.graph || !this.graphHost) {
      return;
    }
    const width = Math.max(1, this.graphHost.clientWidth);
    const height = Math.max(1, this.graphHost.clientHeight);
    this.graph.width(width).height(height);
    this.bloomPass?.setSize(width, height);
  }

  private disposeNodeObjects(): void {
    if (this.starFactory) {
      for (const object of this.nodeObjects.values()) {
        this.starFactory.disposeGroup(object);
      }
    }
    this.nodeObjects.clear();
  }

  private updateStatus(): void {
    const linkText = this.data.totalLinks > this.data.links.length
      ? this.plugin.i18n.linkCount(this.data.links.length, this.data.totalLinks)
      : this.plugin.i18n.linkCount(this.data.links.length);
    this.setStatus(this.plugin.i18n.graphStatus(this.data.nodes.length, linkText));
  }

  private effectiveLinkOpacity(): number {
    return this.data.isLarge
      ? Math.min(this.plugin.settings.linkOpacity, 0.18)
      : this.plugin.settings.linkOpacity;
  }

  private effectiveFogDensity(): number {
    return this.data.isLarge ? 0.000035 : 0.00048;
  }

  private setStatus(text: string): void {
    this.statusEl?.setText(text);
  }

  private setTemporaryStatus(text: string): void {
    this.setStatus(text);
    window.setTimeout(() => this.updateStatus(), 2200);
  }
}
