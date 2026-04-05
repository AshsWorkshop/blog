/**
 * An Expressive Code Plugin for resolving dynamic content from
 * some remote.
 * 
 * Resolvers are defined within code blocks using the following format:
 * - '~>[](<path-elements>)'
 * - '~>[][<options>](<path-elements>)'
 * - '~>[<resolver>](<path-elements>)'
 * - '~>[<resolver>][<options>](<path-elements>)'
 * - '~>[@<remote>](<path-elements>)'
 * - '~>[@<remote>][<options>](<path-elements>)'
 * - '~>[<resolver>@<remote>](<path-elements>)'
 * - '~>[<resolver>@<remote>][<options>](<path-elements>)'
 */
import * as chp from 'node:child_process';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { definePlugin, ExpressiveCodeHookContext, type ExpressiveCodePlugin } from 'rehype-expressive-code';

const DEFAULT_SEPARATOR = ' ';
const RESOLVER_REGEX: RegExp = /^~>\[([^\[\]\(\)@ ]*)(?:@([^\[\]\(\)@ ]+))?\](?:\[((?:[^\[\]\(\)= ]+=[^\[\]\(\)= ]+ ?)*)\])?\(([^\[\]\(\)]+)\)$/;

/**
 * The settings for a resolver.
 */
export interface ResolverSettings {
    /**
     * The path(s) to search through relative to the remote.
     * Any dynamic components are defined with the '{<index>}'
     * format.
     */
    locations: string[];
    /**
     * If the location(s) define multiple path elements to resolve,
     * this is used as the separator between the elements. If not
     * specified and used, it defaults to whitespace.
     */
    separator?: string;
    /**
     * Strings to remap to their corresponding values within the
     * path elements.
     */
    remap?: {[key: string]: string};
}

/**
 * The type of the remote to pull the content from. Takes in the
 * location from the remote settings and returns a local path
 * to access the content from.
 */
export type RemoteType = {
    /**
     * Sets up the remote on the local file system to access
     * the content from.
     * 
     * @param remote A string to be parsed.
     * @returns The path of the remote on the local file system.
     */
    setup: (remote: string) => string;
    /**
     * Cleans up any lingering files from the remote on the
     * local file system. This should validate that any files
     * have not already been cleaned up by a separate thread
     * before attempting to operate.
     * 
     * @param path The path on the local file system.
     */
    teardown: (path: string) => void;
}

/**
 * The settings for a remote.
 */
export interface RemoteSettings {
    /**
     * The type of the remote to pull the content from.
     */
    type: RemoteType;
    /**
     * The location of the remote formatted for the remote
     * type.
     */
    location: string;
    /**
     * A map of resolver keys to their settings. If the
     * resolver key is not specified, then the path
     * elements will be treated as the path.
     */
    resolvers?: {[key: string]: ResolverSettings};
}

/**
 * The resolved settings for a remote.
 */
interface ResolvedRemoteSettings extends Required<RemoteSettings> {
    /**
     * The resolved location of the remote on the local filesystem.
     */
    resolvedLocation: string;
    resolvers: {[key: string]: Required<ResolverSettings>};
}

/**
 * The options for the resolver plugin.
 */
export interface ResolverPluginOptions {
    /**
     * A map of remote names to their settings. If a
     * remote name is not specified, then the path
     * elements will be treated as the path from
     * where the process was executed.
     */
    remotes?: {[name: string]: RemoteSettings};
}

/**
 * The resolved options for the resolver plugin.
 */
interface ResolvedPluginOptions extends ResolverPluginOptions {
    remotes: {[name: string]: ResolvedRemoteSettings};
}

/**
 * A remote from the local filesystem.
 */
export const REMOTE_LOCAL: RemoteType = {
    setup: (remote: string) => {
        // Validate that location exists and is directory
        if (!fs.statSync(remote).isDirectory()) {
            throw new TypeError(`Location "${remote}" is not a directory`);
        }
        return remote;
    },
    // Nothing to do
    teardown: (location) => {}
};

/**
 * A remote from a git repository.
 */
export const REMOTE_GIT: RemoteType = {
    setup: (remote: string) => {
        // Create tmp directory to write to
        const tmpDir: string = fs.mkdtempSync(path.join(tmpdir(), 'remote-git-'))

        // Pull repository
        chp.execSync(`git clone ${remote} ${tmpDir}`);

        return tmpDir;
    },
    teardown: (path: string) => {
        // Validate path exists before attempting to delete
        if (fs.existsSync(path)) {
            // Delete tmp directory
            fs.rmSync(path, { recursive: true, force: true });
        }
    }
};

const DEFAULT_REMOTE: ResolvedRemoteSettings = {
    type: REMOTE_LOCAL,
    location: process.cwd(),
    resolvedLocation: process.cwd(),
    resolvers: {}
};

/**
 * Creates the Expressive Code plugin for resolving dynamic
 * content from some remote. This plugin should always be
 * registered first to avoid processing issues on the placeholder.
 * 
 * @param options The options for the plugin.
 * @returns The constructed plugin.
 */
export function expressiveCodePluginResolver(options: ResolverPluginOptions): ExpressiveCodePlugin {
    // Resolve unset properties in options
    if (options.remotes == null) options.remotes = {};
    for (const remoteSettings of Object.values(options.remotes)) {
        // Resolve remote to filesystem
        (remoteSettings as ResolvedRemoteSettings).resolvedLocation = remoteSettings.type.setup(remoteSettings.location);

        // Resolve unset resolvers in remote
        if (remoteSettings.resolvers == null) remoteSettings.resolvers = {};
        for (const resolverSettings of Object.values(remoteSettings.resolvers)) {
            if (resolverSettings.separator == null) resolverSettings.separator = DEFAULT_SEPARATOR;
            if (resolverSettings.remap == null) resolverSettings.remap = {};
        }
    }
    const opts: ResolvedPluginOptions = options as ResolvedPluginOptions;

    function teardown() {
        for (const remoteSettings of Object.values(opts.remotes)) {
            // Make sure we're only doing this once, though this may not
            // always be the case depending on how many threads are working
            if (remoteSettings.resolvedLocation) {
                remoteSettings.type.teardown(remoteSettings.resolvedLocation);
                remoteSettings.resolvedLocation = null;
            }
        }
    }

    // Handle teardown
    process.on('exit', teardown);

    return definePlugin({
        name: 'Resolves code blocks from some remote, e.g. ~>[resolver@remote][options](path)',
        hooks: {
            preprocessCode: (context: ExpressiveCodeHookContext) => {
                const toResolve: {[index: number]: string[]} = {};

                // Find entries to replace
                for (const [lineIdx, line] of context.codeBlock.getLines().entries()) {
                    // Check for match
                    const match: RegExpMatchArray = line.text.match(RESOLVER_REGEX);
                    if (!match) continue;

                    // Extract config (TODO: Figure out what to do with it)
                    const config: {[key: string]: string[]} = {};
                    if (match[3]) {
                        match[3].split(' ').forEach((pair: string) => {
                            const [key, value] = pair.split('=');
                            if (!(key in config)) config[key] = [];
                            config[key].push(value);
                        });
                    }

                    // Get remote
                    const remote: ResolvedRemoteSettings = match[2] && match[2] in opts.remotes ? opts[match[2]] : DEFAULT_REMOTE;

                    // Resolve locations
                    const locations: string[] = [];

                    if (match[1] && match[1] in remote.resolvers) {
                        const resolver: Required<ResolverSettings> = remote.resolvers[match[1]];
                        let resolverPath: string = match[4];

                        // Remap strings
                        for (const [key, value] of Object.entries(resolver.remap)) {
                            resolverPath = resolverPath.replaceAll(key, value);
                        }

                        // Apply resolver
                        const pathElements: string[] = resolverPath.split(resolver.separator);
                        for (const location of resolver.locations) {
                            let resolved: string = location;
                            // Replace location references
                            for (const [refIdx, value] of pathElements.entries()) {
                                resolved = resolved.replaceAll(`{${refIdx}}`, value);
                            }
                            locations.push(path.join(remote.resolvedLocation, resolved));
                        }
                    } else {
                        // Add path elements to locations
                        locations.push(path.join(remote.resolvedLocation, match[4]));
                    }


                    // Check locations for file
                    let foundFile: boolean = false;
                    for (const location of locations) {
                        if (!(fs.existsSync(location) && fs.statSync(location).isFile())) continue;
                        foundFile = true;
                        
                        // Read file
                        const data: string[] = fs.readFileSync(
                            location, { encoding: 'utf-8' }
                        ).trim().split('\n');

                        // Replace title if not set
                        if (!context.codeBlock.props.title) {
                            context.codeBlock.props.title = path.basename(location);
                        }

                        // Add file to resolve
                        toResolve[lineIdx] = data;
                        break;
                    }

                    // Display warning message if no file found
                    if (!foundFile) {
                        const warningMessage: string[] = [];
                        warningMessage.push(`No file was found for '${line.text}'`);
                        warningMessage.push('Searched:');
                        locations.forEach((location: string) => warningMessage.push(`- ${location}`));
                        warningMessage.push('The reference will be skipped.');

                        process.emitWarning(warningMessage.join('\n'), 'MissingFileReference');
                    }
                }

                // Replace references 
                let idxOffset: number = 0;
                for (const [lineIdx, data] of Object.entries(toResolve)) {
                    const actualIdx: number = parseInt(lineIdx) + idxOffset;
                    
                    // Delete then insert
                    context.codeBlock.deleteLine(actualIdx);
                    context.codeBlock.insertLines(actualIdx, data);

                    // Compute new index
                    idxOffset += data.length - 1;
                }
            }
        }
    })
}
