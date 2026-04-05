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

type ErrorHandlerOption = 'ignore' | 'log' | 'warn' | 'throw';

const DEFAULT_SEPARATOR: string = ' ';
const DEFAULT_ERROR_HANDLER: ErrorHandlerOption = 'warn';
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
 * The type of the remote to pull the content from.
 */
export type RemoteType<RemoteConfiguration> = {
    /**
     * Sets up the remote on the local file system to access
     * the content from.
     * 
     * @param remote A string to be parsed.
     * @param config The configuration for the remote.
     * @returns The path of the remote on the local file system.
     */
    setup: (remote: string, config: RemoteConfiguration) => string;
    /**
     * Cleans up any lingering files from the remote on the
     * local file system. This should validate that any files
     * have not already been cleaned up by a separate thread
     * before attempting to operate.
     * 
     * @param path The path on the local file system.
     */
    teardown: (path: string) => void;
};

/**
 * A remote from the local filesystem.
 */
export const REMOTE_LOCAL: RemoteType<undefined> = {
    setup: (remote: string, _config: undefined) => {
        // Validate that location exists and is directory
        if (!fs.statSync(remote).isDirectory()) {
            throw new TypeError(`Location "${remote}" is not a directory`);
        }
        return remote;
    },
    // Nothing to do
    teardown: (_path: string) => {}
};

/**
 * Configuration for the git remote.
 */
export type RemoteGitConfiguration = {
    /**
     * The branch to checkout the git repository to.
     */
    branch?: string;
};

/**
 * A remote from a git repository.
 */
export const REMOTE_GIT: RemoteType<RemoteGitConfiguration> = {
    setup: (remote: string, config: RemoteGitConfiguration) => {
        // Create tmp directory to write to
        const tmpDir: string = fs.mkdtempSync(path.join(tmpdir(), 'remote-git-'))

        // Pull repository
        chp.execSync(`git clone ${remote} ${tmpDir}`);
        // Update branch appropriately
        if (config.branch != null) {
            chp.execSync(`cd ${tmpDir} && git checkout ${config.branch}`);
        } else {
            config.branch = chp.execSync(`cd ${tmpDir} && git rev-parse --abbrev-ref HEAD`, { encoding: 'utf-8' }).trim();
        }

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

/**
 * The settings for a remote.
 */
export interface RemoteSettings<RemoteConfiguration> {
    /**
     * The type of the remote to pull the content from.
     */
    type: RemoteType<RemoteConfiguration>;
    /**
     * The location of the remote formatted for the remote
     * type.
     */
    location: string;
    /**
     * The configuration of the remote type.
     */
    config?: RemoteConfiguration;
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
interface ResolvedRemoteSettings<RemoteConfiguration> extends RemoteSettings<RemoteConfiguration> {
    /**
     * The resolved location of the remote on the local filesystem.
     */
    resolvedLocation: string;
    resolvers: {[key: string]: Required<ResolverSettings>};
}

/**
 * The raw reference config obtained when parsing.
 */
export type RawReferenceConfig = {[key: string]: string[]};

/**
 * A plugin on what the resolver should do during its lifecycle.
 */
export type ResolverPlugin<ConfigData> = {

    /**
     * Builds the config from the options resolver reference. Otherwise,
     * returns null and will not attach its hooks to run.
     * 
     * @param config The parsed configuration from the resolver reference.
     * @returns The configuration data, or null.
     */
    build: (config: RawReferenceConfig) => ConfigData | null;

    /**
     * The listeners to apply during the resolver reference lifecycle.
     */
    hooks: {
        /**
         * Runs after the remote has been resolved.
         * 
         * @param config The resolver plugin config.
         * @param remote The remote settings.
         */
        afterRemote?: (config: ConfigData, remote: ResolvedRemoteSettings<unknown>) => void;
        /**
         * Modifies the data of the content.
         * 
         * @param config The resolver plugin config.
         * @param data The data to modify.
         * @returns The modified data.
         */
        modifyData?: (config: ConfigData, data: string[]) => string[];
    };
};

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
    remotes?: {[name: string]: RemoteSettings<unknown>};
    /**
     * Additional plugins to apply during the resolver lifecycle.
     */
    plugins?: ResolverPlugin<unknown>[];
    /**
     * The behavior of the plugin when it finds references it is
     * unable to resolve.
     */
    onUnresolvedReferences?: ErrorHandlerOption;
}

/**
 * The resolved options for the resolver plugin.
 */
interface ResolvedPluginOptions extends Required<ResolverPluginOptions> {
    remotes: {[name: string]: ResolvedRemoteSettings<unknown>};
}

const DEFAULT_PLUGINS: ResolverPlugin<unknown>[] = [
    // Git commit lock
    {
        build: (config: RawReferenceConfig) => 'git-commit' in config ? config['git-commit'][0] : '',
        hooks: {
            afterRemote: function (config: string, remote: ResolvedRemoteSettings<unknown>): void {
                if (typeof remote.config === 'object' && 'branch' in remote.config) {
                    // Get commit to checkout to
                    const commit: string = config ? config : (remote as ResolvedRemoteSettings<RemoteGitConfiguration>).config.branch;
                    
                    // Checkout commit
                    chp.execSync(`cd ${remote.resolvedLocation} && git checkout ${commit}`);
                }
            }
        }
    } satisfies ResolverPlugin<string>
];

const DEFAULT_REMOTE: ResolvedRemoteSettings<undefined> = {
    type: REMOTE_LOCAL,
    location: process.cwd(),
    resolvedLocation: process.cwd(),
    resolvers: {}
};

const ERROR_HANDLERS: {[key in ErrorHandlerOption]: (message: string, errorType: string) => void} = {
    ignore: (_message: string, _errorType: string) => {},
    log: (message: string, errorType: string) => console.log(`${errorType}: ${message}`),
    warn: (message: string, errorType: string) => process.emitWarning(message, errorType),
    throw: (message: string, errorType: string) => {
        throw new Error(`${errorType}: ${message}`);
    }
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
    if (options.onUnresolvedReferences == null) options.onUnresolvedReferences = DEFAULT_ERROR_HANDLER;
    if (options.plugins == null) options.plugins = [];
    options.plugins = DEFAULT_PLUGINS.concat(options.plugins);
    if (options.remotes == null) options.remotes = {};
    for (const remoteSettings of Object.values(options.remotes)) {
        // Resolve remote to filesystem
        (remoteSettings as ResolvedRemoteSettings<unknown>).resolvedLocation = remoteSettings.type.setup(remoteSettings.location, remoteSettings.config);

        // Resolve unset resolvers in remote
        if (remoteSettings.resolvers == null) remoteSettings.resolvers = {};
        for (const resolverSettings of Object.values(remoteSettings.resolvers)) {
            if (resolverSettings.separator == null) resolverSettings.separator = DEFAULT_SEPARATOR;
            if (resolverSettings.remap == null) resolverSettings.remap = {};
        }
    }
    const opts: ResolvedPluginOptions = options as ResolvedPluginOptions;

    /**
     * Cleans up any lingering traces of the plugin on exit.
     */
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

                    // Build plugins
                    const config: RawReferenceConfig = {};
                    if (match[3]) {
                        match[3].split(' ').forEach((pair: string) => {
                            const [key, value] = pair.split('=');
                            if (!(key in config)) config[key] = [];
                            config[key].push(value);
                        });
                    }
                    const plugins: [ResolverPlugin<unknown>, unknown][] = [];
                    for (const plugin of opts.plugins) {
                        const pluginConfig: unknown | null = plugin.build(config);
                        if (pluginConfig != null) plugins.push([plugin, pluginConfig]);
                    }

                    // Get remote
                    const remote: ResolvedRemoteSettings<unknown> = match[2] && match[2] in opts.remotes ? opts[match[2]] : DEFAULT_REMOTE;
                    plugins.forEach(([plugin, pluginConfig]) => { if (plugin.hooks.afterRemote != null) plugin.hooks.afterRemote(pluginConfig, remote)});

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
                        let data: string[] = fs.readFileSync(
                            location, { encoding: 'utf-8' }
                        ).trim().split('\n');

                        plugins.forEach(([plugin, pluginConfig]) => { if (plugin.hooks.modifyData != null) data = plugin.hooks.modifyData(pluginConfig, data)});

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

                        ERROR_HANDLERS[opts.onUnresolvedReferences](warningMessage.join('\n'), 'MissingFileReference');
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
