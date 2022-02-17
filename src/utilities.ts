import { TFile, App, CachedMetadata } from 'obsidian';
import { TagFilesMap } from './types';

export function getTagFilesMap(app: App): TagFilesMap {
    const metadataCache = app.metadataCache;
    const markdownFiles = app.vault.getMarkdownFiles();

    const tagFilesMap: TagFilesMap = {};

    for (const markdownFile of markdownFiles) {
        const cachedMetadata = metadataCache.getFileCache(markdownFile);

        if (cachedMetadata) {
            const cachedTags = getCachedTags(cachedMetadata);
            if (cachedTags.length) {
                for (const cachedTag of cachedTags) {
                    if (tagFilesMap[cachedTag]) {
                        tagFilesMap[cachedTag].push(markdownFile);
                    } else {
                        tagFilesMap[cachedTag] = [markdownFile];
                    }
                }
            }
        }
    }

    return tagFilesMap;
}

/*
 * splitFrontmatterTags('foo, bar,buz') => ['foo', 'bar', 'buz']
 */
function splitFrontmatterTags(tagsStr: string | string[]) : string[] {
	if (typeof tagsStr == 'string') {
		return tagsStr.split(/,[ ]*/);
	}
	return tagsStr;
}

function containsTemplaterToken(tag: string) : boolean {
	return tag.startsWith("<%") && tag.endsWith("%>");
}

function getCachedTags(cachedMetadata: CachedMetadata): string[] {
    const bodyTags: string[] = cachedMetadata.tags?.map((x) => x.tag) || [];
    const frontMatterTags: string[] = 
		splitFrontmatterTags(cachedMetadata.frontmatter?.tags || cachedMetadata.frontmatter?.tag || [])
			.filter(tag => !containsTemplaterToken(tag));

    // frontmatter tags might not have a hashtag in front of them
    const cachedTags = bodyTags.concat(frontMatterTags).map((x) => (x.startsWith('#') ? x : '#' + x));

    return cachedTags;
}

export function randomElement<T>(array: T[]): T {
    return array[(array.length * Math.random()) << 0];
}

// If selectedTags = "foo" and allTags = ["foo", "bar", "foo/bar"], returns ["foo", "foo/bar"]
function getChildrenTagsAndItself(selectedTag: string, allTags: string[]): string[] {
	return allTags.filter(tag => tag == selectedTag || tag.startsWith(selectedTag + "/"));
}

export function getFilesByTag(selectedTag: string, tagFilesMap: TagFilesMap):  TFile[] {
	const tags = Object.keys(tagFilesMap);
	// If selectedTags = "foo" and there are tags "foo", "bar", "foo/bar", expandedTags is ["foo", "foo/bar"]
	const expandedTags = getChildrenTagsAndItself(selectedTag, tags);
	return expandedTags.map(t => tagFilesMap[t]).flat();
}

export function findSetIntersection(filesGroups: TFile[][]): TFile[] {
	if  (filesGroups.length == 0) {
		return [];
	}

	if  (filesGroups.length == 1) {
		return filesGroups[0];
	}

	// Sort filesGroup in place using length in asc  order
	const sortedFilesGroups = [...filesGroups];
	sortedFilesGroups.sort((a,b) => (a.length < b.length ? -1 : 1));

	const sets = filesGroups.slice(1).map(files => {
		return new Set(files.map(f => f.path));
	});

	return sortedFilesGroups[0].filter(f => sets.every(s => s.has(f.path)));
}
