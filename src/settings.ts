import { App, PluginSettingTab, Setting } from "obsidian";
import type GalaxyGraphPlugin from "./main";

export interface GalaxyGraphSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  backgroundColor: string;
  bloomStrength: number;
  excludedFolders: string;
  linkOpacity: number;
  maxLinks: number;
  nodeScale: number;
  showOrphans: boolean;
}

export const DEFAULT_SETTINGS: GalaxyGraphSettings = {
  autoRotate: true,
  autoRotateSpeed: 0.3,
  backgroundColor: "#03040b",
  bloomStrength: 1.15,
  excludedFolders: "",
  linkOpacity: 0.2,
  maxLinks: 12000,
  nodeScale: 1,
  showOrphans: true
};

export class GalaxyGraphSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: GalaxyGraphPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Tune the galaxy without changing Obsidian's built-in Graph view."
    });

    new Setting(containerEl)
      .setName("Auto-rotate")
      .setDesc("Slowly rotate the camera while the galaxy is idle.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoRotate).onChange(async (value) => {
          await this.plugin.updateSettings({ autoRotate: value });
        })
      );

    new Setting(containerEl)
      .setName("Rotation speed")
      .setDesc("Camera rotation speed while auto-rotate is enabled.")
      .addSlider((slider) =>
        slider
          .setLimits(0.05, 1, 0.05)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.autoRotateSpeed)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ autoRotateSpeed: value });
          })
      );

    new Setting(containerEl)
      .setName("Star scale")
      .setDesc("Scale star cores and their translucent halos.")
      .addSlider((slider) =>
        slider
          .setLimits(0.55, 2.2, 0.05)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.nodeScale)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ nodeScale: value });
          })
      );

    new Setting(containerEl)
      .setName("Glow strength")
      .setDesc("Bloom intensity around stars and bright links.")
      .addSlider((slider) =>
        slider
          .setLimits(0, 2.5, 0.05)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.bloomStrength)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ bloomStrength: value });
          })
      );

    new Setting(containerEl)
      .setName("Link opacity")
      .setDesc("Opacity of the lines connecting linked notes.")
      .addSlider((slider) =>
        slider
          .setLimits(0.03, 0.7, 0.01)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.linkOpacity)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ linkOpacity: value });
          })
      );

    new Setting(containerEl)
      .setName("Maximum rendered links")
      .setDesc("Caps 3D links in very large vaults. Strong links and broad node coverage are kept first.")
      .addSlider((slider) =>
        slider
          .setLimits(5000, 60000, 1000)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.maxLinks)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ maxLinks: value });
          })
      );

    new Setting(containerEl)
      .setName("Background")
      .setDesc("Deep-space background color in CSS hex format.")
      .addText((text) =>
        text
          .setPlaceholder("#03040b")
          .setValue(this.plugin.settings.backgroundColor)
          .onChange(async (value) => {
            if (/^#[0-9a-f]{6}$/iu.test(value.trim())) {
              await this.plugin.updateSettings({ backgroundColor: value.trim() });
            }
          })
      );

    new Setting(containerEl)
      .setName("Show unlinked notes")
      .setDesc("Include notes with no incoming or outgoing resolved links.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showOrphans).onChange(async (value) => {
          await this.plugin.updateSettings({ showOrphans: value });
        })
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated vault-relative folder paths. Their descendants are also excluded.")
      .addTextArea((text) => {
        text
          .setPlaceholder("Templates, Archive/Private")
          .setValue(this.plugin.settings.excludedFolders)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ excludedFolders: value });
          });
        text.inputEl.rows = 3;
        text.inputEl.addClass("galaxy-graph-settings-folders");
      });
  }
}
