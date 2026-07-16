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
    const t = this.plugin.i18n;
    containerEl.empty();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t.settingsIntro
    });

    new Setting(containerEl)
      .setName(t.autoRotateName)
      .setDesc(t.autoRotateDescription)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoRotate).onChange(async (value) => {
          await this.plugin.updateSettings({ autoRotate: value });
        })
      );

    new Setting(containerEl)
      .setName(t.rotationSpeedName)
      .setDesc(t.rotationSpeedDescription)
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
      .setName(t.starScaleName)
      .setDesc(t.starScaleDescription)
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
      .setName(t.glowStrengthName)
      .setDesc(t.glowStrengthDescription)
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
      .setName(t.linkOpacityName)
      .setDesc(t.linkOpacityDescription)
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
      .setName(t.maxLinksName)
      .setDesc(t.maxLinksDescription)
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
      .setName(t.backgroundName)
      .setDesc(t.backgroundDescription)
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
      .setName(t.showOrphansName)
      .setDesc(t.showOrphansDescription)
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showOrphans).onChange(async (value) => {
          await this.plugin.updateSettings({ showOrphans: value });
        })
      );

    new Setting(containerEl)
      .setName(t.excludedFoldersName)
      .setDesc(t.excludedFoldersDescription)
      .addTextArea((text) => {
        text
          .setPlaceholder(t.excludedFoldersPlaceholder)
          .setValue(this.plugin.settings.excludedFolders)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ excludedFolders: value });
          });
        text.inputEl.rows = 3;
        text.inputEl.addClass("galaxy-graph-settings-folders");
      });
  }
}
