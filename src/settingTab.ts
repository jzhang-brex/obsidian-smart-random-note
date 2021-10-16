import SmartRandomNotePlugin from './main';
import { PluginSettingTab, Setting } from 'obsidian';

export class SmartRandomNoteSettingTab extends PluginSettingTab {
    plugin: SmartRandomNotePlugin;

    constructor(plugin: SmartRandomNotePlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Smart Random Note Settings ' });

        new Setting(containerEl)
            .setName('Open in New Leaf')
            .setDesc('Default setting for opening random notes')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.openInNewLeaf);
                toggle.onChange(this.plugin.setOpenInNewLeaf);
            });

        new Setting(containerEl)
            .setName('Enable Ribbon Icon')
            .setDesc('Place an icon on the ribbon to open a random note from search')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.enableRibbonIcon);
                toggle.onChange(this.plugin.setEnableRibbonIcon);
            });

        new Setting(containerEl)
            .setName('Excluding Tags')
            .setDesc(
                'Notes contains any of these tags will be excluded by the "Open Random Note Excluding Certain Tags" command. ' +
                    'A tag should starts with #. Multiple tags should be separated by a comma.',
            )
            .addText((text) => {
                text.setValue(this.plugin.settings.excludedTags).onChange(async (value) => {
                    await this.plugin.setExcludedTags(value)
                });
            });
    }
}
