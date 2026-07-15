import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Material,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace
} from "three";
import type { GalaxyNode } from "./graph-data";
import type { GalaxyGraphSettings } from "./settings";

function makeRadialTexture(withRays: boolean): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Galaxy Graph could not create a 2D canvas context.");
  }

  const center = canvas.width / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.08, "rgba(255,255,255,0.96)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.09)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (withRays) {
    context.save();
    context.translate(center, center);
    context.globalCompositeOperation = "lighter";
    const ray = context.createLinearGradient(-center, 0, center, 0);
    ray.addColorStop(0, "rgba(255,255,255,0)");
    ray.addColorStop(0.44, "rgba(255,255,255,0.04)");
    ray.addColorStop(0.5, "rgba(255,255,255,0.7)");
    ray.addColorStop(0.56, "rgba(255,255,255,0.04)");
    ray.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = ray;
    context.fillRect(-center, -1.25, canvas.width, 2.5);
    context.rotate(Math.PI / 2);
    context.fillRect(-center, -1.25, canvas.width, 2.5);
    context.rotate(Math.PI / 4);
    context.globalAlpha = 0.34;
    context.fillRect(-center * 0.72, -0.7, canvas.width * 0.72, 1.4);
    context.rotate(Math.PI / 2);
    context.fillRect(-center * 0.72, -0.7, canvas.width * 0.72, 1.4);
    context.restore();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setBaseOpacity(material: Material, opacity: number): void {
  material.userData.galaxyBaseOpacity = opacity;
}

export class StarVisualFactory {
  private readonly coreGeometry = new IcosahedronGeometry(1, 1);
  private readonly glowTexture = makeRadialTexture(false);
  private readonly starTexture = makeRadialTexture(true);

  create(node: GalaxyNode, settings: GalaxyGraphSettings, compact: boolean): Group {
    const group = new Group();
    const size = settings.nodeScale * (1.2 + Math.min(Math.log2(node.degree + 1) * 0.62, 3.4));
    const color = new Color(node.color);

    if (compact) {
      const compactMaterial = new SpriteMaterial({
        blending: AdditiveBlending,
        color,
        depthWrite: false,
        map: this.starTexture,
        opacity: 0.76,
        transparent: true
      });
      setBaseOpacity(compactMaterial, 0.76);
      const compactStar = new Sprite(compactMaterial);
      compactStar.scale.setScalar(size * 18);
      group.add(compactStar);
      group.userData.galaxyNodeId = node.id;
      return group;
    }

    const haloMaterial = new SpriteMaterial({
      blending: AdditiveBlending,
      color,
      depthWrite: false,
      map: this.glowTexture,
      opacity: 0.34,
      transparent: true
    });
    setBaseOpacity(haloMaterial, 0.34);
    const halo = new Sprite(haloMaterial);
    halo.scale.setScalar(size * 7.2);
    halo.renderOrder = 1;
    group.add(halo);

    const rayMaterial = new SpriteMaterial({
      blending: AdditiveBlending,
      color,
      depthWrite: false,
      map: this.starTexture,
      opacity: 0.82,
      transparent: true
    });
    setBaseOpacity(rayMaterial, 0.82);
    const rays = new Sprite(rayMaterial);
    rays.scale.setScalar(size * 4.15);
    rays.renderOrder = 2;
    group.add(rays);

    const coreMaterial = new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: color.clone().lerp(new Color("#ffffff"), 0.52),
      depthWrite: false,
      opacity: 0.88,
      transparent: true
    });
    setBaseOpacity(coreMaterial, 0.88);
    const core = new Mesh(this.coreGeometry, coreMaterial);
    core.scale.setScalar(size * 0.54);
    core.renderOrder = 3;
    group.add(core);

    group.userData.galaxyNodeId = node.id;
    return group;
  }

  setEmphasis(group: Group, factor: number): void {
    group.traverse((object) => {
      const candidate = object as { material?: Material | Material[] };
      const materials = candidate.material
        ? Array.isArray(candidate.material) ? candidate.material : [candidate.material]
        : [];
      for (const material of materials) {
        const base = material.userData.galaxyBaseOpacity;
        if (typeof base === "number" && "opacity" in material) {
          material.opacity = base * factor;
          material.needsUpdate = true;
        }
      }
    });
  }

  disposeGroup(group: Group): void {
    group.traverse((object) => {
      const candidate = object as { material?: Material | Material[] };
      const materials = candidate.material
        ? Array.isArray(candidate.material) ? candidate.material : [candidate.material]
        : [];
      for (const material of materials) {
        material.dispose();
      }
    });
  }

  dispose(): void {
    this.coreGeometry.dispose();
    this.glowTexture.dispose();
    this.starTexture.dispose();
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDustField(count = 1800): Points<BufferGeometry, PointsMaterial> {
  const random = seededRandom(0xdecafbad);
  const positions: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const radius = 420 + random() * 980;
    const theta = random() * Math.PI * 2;
    const cosinePhi = random() * 2 - 1;
    const sinePhi = Math.sqrt(1 - cosinePhi * cosinePhi);
    positions.push(
      radius * sinePhi * Math.cos(theta),
      radius * sinePhi * Math.sin(theta),
      radius * cosinePhi
    );
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const material = new PointsMaterial({
    blending: AdditiveBlending,
    color: "#7898ca",
    depthWrite: false,
    opacity: 0.55,
    size: 1.15,
    sizeAttenuation: true,
    transparent: true
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
