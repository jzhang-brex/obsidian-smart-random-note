import { MarkdownView, Plugin, TFile } from 'obsidian';
import { getTagFilesMap, getCachedTags, randomElement } from './utilities';
import { SmartRandomNoteSettingTab } from './settingTab';
import { SearchView, SmartRandomNoteSettings } from './types';
import { SmartRandomNoteNotice } from './smartRandomNoteNotice';
import { OpenRandomTaggedNoteModal } from './openRandomTaggedNoteModal';

export default class SmartRandomNotePlugin extends Plugin {
    settings: SmartRandomNoteSettings = { openInNewLeaf: true, enableRibbonIcon: true, excludedTags: "" };
    ribbonIconEl: HTMLElement | undefined = undefined;

    async onload(): Promise<void> {
        console.log('loading smart-random-note');

        await this.loadSettings();

        this.addSettingTab(new SmartRandomNoteSettingTab(this));

        this.addCommand({
            id: 'open-random-note',
            name: 'Open Random Note',
            callback: this.handleOpenRandomNote,
        });

        this.addCommand({
            id: 'open-tagged-random-note',
            name: 'Open Tagged Random Note',
            callback: this.handleOpenTaggedRandomNote,
        });

        this.addCommand({
            id: 'open-random-note-from-search',
            name: 'Open Random Note from Search',
            callback: this.handleOpenRandomNoteFromSearch,
        });

        this.addCommand({
            id: 'insert-link-to-random-note-at-cursor',
            name: 'Insert Link at Cursor to Random Note from Search',
            callback: this.handleInsertLinkFromSearch,
        });

        this.addCommand({
            id: 'open-random-note-excluding-tags',
            name: 'Open Random Note Excluding Certain Tags',
            callback: this.handleOpenRandomNoteExcludingTags,
        });
    }

    onunload = (): void => {
        console.log('unloading smart-random-note');
    };

    handleOpenRandomNote = async (): Promise<void> => {
        const markdownFiles = this.app.vault.getMarkdownFiles();

        this.openRandomNote(markdownFiles);
    };

    handleOpenTaggedRandomNote = (): void => {
        const tagFilesMap = getTagFilesMap(this.app);

        const tags = Object.keys(tagFilesMap);
        const modal = new OpenRandomTaggedNoteModal(this.app, tags);

        modal.submitCallback = async (selectedTag: string): Promise<void> => {
            const taggedFiles = tagFilesMap[selectedTag];
            await this.openRandomNote(taggedFiles);
        };

        modal.open();
    };

    handleOpenRandomNoteExcludingTags = (): void => {
        const metadataCache = this.app.metadataCache;
        const markdownFiles = this.app.vault.getMarkdownFiles();

        const candidateFiles = [];

        const excludedTags =
            this.settings.excludedTags
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v.startsWith('#') && v.length > 1);

        for (const markdownFile of markdownFiles) {
            // Skip empty files
            if (markdownFile.stat.size === 0) {
                continue;
            }

            const cachedMetadata = metadataCache.getFileCache(markdownFile);
            if (cachedMetadata) {
                const cachedTags = getCachedTags(cachedMetadata);
                if (cachedTags.length === 0 || cachedTags.every((tag) => excludedTags.indexOf(tag) < 0)) {
                    candidateFiles.push(markdownFile);
                }
            }
        }

        this.openRandomNote(candidateFiles);
    };

    handleOpenRandomNoteFromSearch = async (): Promise<void> => {
        const searchView = this.app.workspace.getLeavesOfType('search')[0]?.view as SearchView;

        if (!searchView) {
            new SmartRandomNoteNotice('The core search plugin is not enabled', 5000);
            return;
        }

        const searchResults = searchView.dom.getFiles();

        if (!searchResults.length) {
            new SmartRandomNoteNotice('No search results available', 5000);
            return;
        }

        await this.openRandomNote(searchResults);
    };

    handleInsertLinkFromSearch = async (): Promise<void> => {
        const searchView = this.app.workspace.getLeavesOfType('search')[0]?.view as SearchView;

        if (!searchView) {
            new SmartRandomNoteNotice('The core search plugin is not enabled', 5000);
            return;
        }

        const searchResults = searchView.dom.getFiles();

        if (!searchResults.length) {
            new SmartRandomNoteNotice('No search results available', 5000);
            return;
        }

        await this.insertRandomLinkAtCursor(searchResults);
    };

    openRandomNote = async (files: TFile[]): Promise<void> => {
        const markdownFiles = files.filter((file) => file.extension === 'md');

        if (!markdownFiles.length) {
            new SmartRandomNoteNotice("Can't open note. No markdown files available to open.", 5000);
            return;
        }

        const fileToOpen = randomElement(markdownFiles);
        await this.app.workspace.openLinkText(fileToOpen.basename, '', this.settings.openInNewLeaf, {
            active: true,
        });
    };

    insertRandomLinkAtCursor = async (files: TFile[]): Promise<void> => {
        const fileToLink = randomElement(files);
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) {
            new SmartRandomNoteNotice("Can't insert link. No active note to insert link into", 5000);
            return;
        }
        const viewState = activeLeaf.getViewState();
        const canEdit = viewState.type === 'markdown' && viewState.state && viewState.state.mode == 'source';

        if (!canEdit) {
            new SmartRandomNoteNotice("Can't insert link. The active file is not a markdown file in edit mode.", 5000);
            return;
        }

        const markdownView = activeLeaf.view as MarkdownView;
        const cursorPos = markdownView.editor.getCursor();
        const textToInsert = `[[${fileToLink.name}]]`;
        markdownView.editor.replaceRange(textToInsert, cursorPos);
    };

    loadSettings = async (): Promise<void> => {
        const loadedSettings = (await this.loadData()) as SmartRandomNoteSettings;
        if (loadedSettings) {
            this.setOpenInNewLeaf(loadedSettings.openInNewLeaf);
            this.setEnableRibbonIcon(loadedSettings.enableRibbonIcon);
            this.setExcludedTags(loadedSettings.excludedTags);
        } else {
            this.refreshRibbonIcon();
        }
    };

    setOpenInNewLeaf = (value: boolean): void => {
        this.settings.openInNewLeaf = value;
        this.saveData(this.settings);
    };

    setEnableRibbonIcon = (value: boolean): void => {
        this.settings.enableRibbonIcon = value;
        this.refreshRibbonIcon();
        this.saveData(this.settings);
    };

    refreshRibbonIcon = (): void => {
        this.ribbonIconEl?.remove();
        if (this.settings.enableRibbonIcon) {
            this.ribbonIconEl = this.addRibbonIcon(
                'dice',
                'Open Random Note from Search',
                this.handleOpenRandomNoteFromSearch,
            );
        }
    };

    async setExcludedTags(value: string): Promise<void> {
        this.settings.excludedTags = value;
        await this.saveData(this.settings);
    };
}
