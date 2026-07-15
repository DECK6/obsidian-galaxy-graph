import type { App, TFile } from "obsidian";
import type { LinkObject, NodeObject } from "3d-force-graph";
import type { GalaxyGraphSettings } from "./settings";

const GALAXY_PALETTE = [
  "#79dcff",
  "#a991ff",
  "#ff91d1",
  "#78f0cb",
  "#ffd27d",
  "#8caaff",
  "#ef9cff",
  "#8df5a8"
] as const;

export interface GalaxyNode extends NodeObject {
  color: string;
  degree: number;
  folder: string;
  id: string;
  name: string;
  neighbors: Set<string>;
  path: string;
}

export interface GalaxyLink extends LinkObject<GalaxyNode> {
  key: string;
  source: string | GalaxyNode;
  target: string | GalaxyNode;
  weight: number;
}

export interface GalaxyData {
  isLarge: boolean;
  links: GalaxyLink[];
  nodes: GalaxyNode[];
  totalLinks: number;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function topFolder(file: TFile): string {
  const slash = file.path.indexOf("/");
  return slash === -1 ? "/" : file.path.slice(0, slash);
}

function folderColor(folder: string): string {
  if (folder === "/") {
    return "#e5f6ff";
  }
  return GALAXY_PALETTE[hashString(folder) % GALAXY_PALETTE.length];
}

function excludedPrefixes(settings: GalaxyGraphSettings): string[] {
  return settings.excludedFolders
    .split(/[\n,]/u)
    .map((entry) => entry.trim().replace(/^\/+|\/+$/gu, ""))
    .filter(Boolean);
}

function isExcluded(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function buildGalaxyData(app: App, settings: GalaxyGraphSettings): GalaxyData {
  const prefixes = excludedPrefixes(settings);
  const files = app.vault.getMarkdownFiles().filter((file) => !isExcluded(file.path, prefixes));
  const nodesByPath = new Map<string, GalaxyNode>();

  for (const file of files) {
    const folder = topFolder(file);
    nodesByPath.set(file.path, {
      color: folderColor(folder),
      degree: 0,
      folder,
      id: file.path,
      name: file.basename,
      neighbors: new Set<string>(),
      path: file.path
    });
  }

  const linksByKey = new Map<string, GalaxyLink>();
  for (const [sourcePath, resolvedTargets] of Object.entries(app.metadataCache.resolvedLinks)) {
    if (!nodesByPath.has(sourcePath)) {
      continue;
    }

    for (const [targetPath, count] of Object.entries(resolvedTargets)) {
      if (!nodesByPath.has(targetPath) || sourcePath === targetPath) {
        continue;
      }

      const [first, second] = sourcePath < targetPath
        ? [sourcePath, targetPath]
        : [targetPath, sourcePath];
      const key = `${first}\u0000${second}`;
      const existing = linksByKey.get(key);
      if (existing) {
        existing.weight += count;
        continue;
      }

      linksByKey.set(key, {
        key,
        source: first,
        target: second,
        weight: count
      });
      nodesByPath.get(first)?.neighbors.add(second);
      nodesByPath.get(second)?.neighbors.add(first);
    }
  }

  for (const node of nodesByPath.values()) {
    node.degree = node.neighbors.size;
  }

  const nodes = settings.showOrphans
    ? Array.from(nodesByPath.values())
    : Array.from(nodesByPath.values()).filter((node) => node.degree > 0);
  const includedIds = new Set(nodes.map((node) => node.id));
  const allLinks = Array.from(linksByKey.values()).filter((link) =>
    includedIds.has(link.source as string) && includedIds.has(link.target as string)
  );
  const totalLinks = allLinks.length;
  const links = limitLinks(allLinks, settings.maxLinks);

  if (links.length < totalLinks) {
    for (const node of nodes) {
      node.neighbors.clear();
    }
    for (const link of links) {
      const source = link.source as string;
      const target = link.target as string;
      nodesByPath.get(source)?.neighbors.add(target);
      nodesByPath.get(target)?.neighbors.add(source);
    }
  }

  return {
    isLarge: nodes.length > 2500 || links.length > 15000,
    links,
    nodes,
    totalLinks
  };
}

function limitLinks(links: GalaxyLink[], maximum: number): GalaxyLink[] {
  if (links.length <= maximum) {
    return links;
  }

  const sorted = [...links].sort((left, right) =>
    right.weight - left.weight || left.key.localeCompare(right.key)
  );
  const selected: GalaxyLink[] = [];
  const selectedKeys = new Set<string>();
  const coveredNodes = new Set<string>();

  for (const link of sorted) {
    const source = link.source as string;
    const target = link.target as string;
    if (!coveredNodes.has(source) || !coveredNodes.has(target)) {
      selected.push(link);
      selectedKeys.add(link.key);
      coveredNodes.add(source);
      coveredNodes.add(target);
      if (selected.length >= maximum) {
        return selected;
      }
    }
  }

  for (const link of sorted) {
    if (!selectedKeys.has(link.key)) {
      selected.push(link);
      if (selected.length >= maximum) {
        break;
      }
    }
  }
  return selected;
}

export function endpointId(endpoint: string | GalaxyNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}
