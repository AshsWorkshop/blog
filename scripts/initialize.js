/**
 * Setup blog contents and metadata.
 */

// Imports
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

/**
 * Gets the absolute path from the working process.
 * 
 * @param  {...string} paths The path components.
 * @return {string} The absolute path.
 */
function absolutePath(...paths) {
    paths.unshift(process.cwd());
    return path.join(...paths);
}

/**
 * Parses a YAML from some file path.
 * 
 * @param  {...string} paths The path components.
 * @returns {any} The parsed YAML object.
 */
function parseYaml(...paths) {
    return yaml.parse(fs.readFileSync(path.join(...paths), { encoding: 'utf-8' }));
}

// Constants
const AUTHORS_PATH = absolutePath('authors');
const MAIN_BLOG_PATH = absolutePath('blog');
const SECTIONS_PATH = absolutePath('sections');

const BLOG_AUTHORS_FILE = 'authors.yml';
const BLOG_TAGS_FILE = 'tags.yml';
const SECTIONS_META_FILE = '.section.yml';

const GIT_IGNORE_FILE = '.gitignore';

// Copy sections to main
fs.cpSync(SECTIONS_PATH, MAIN_BLOG_PATH, { recursive: true });

// Construct tags.yml
const tags = {};

// Loop through sections in main blog
fs.readdirSync(MAIN_BLOG_PATH, { withFileTypes: true, encoding: 'utf-8' }).forEach((sectionId) => {
    // Make sure it is a directory
    if (!sectionId.isDirectory()) return;
    const sectionPath = path.join(sectionId.parentPath, sectionId.name);
    
    // Merge section tags
    if (fs.existsSync(sectionTagsPath = path.join(sectionPath, BLOG_TAGS_FILE))) {
        // TODO: See if permalink is necessary
        Object.assign(tags, parseYaml(sectionTagsPath));
    }

    // Add main section tag
    tags[sectionId.name] = Object.assign({}, parseYaml(sectionPath, SECTIONS_META_FILE)['tag']);

    // Loop through files in section
    fs.readdirSync(sectionPath, { withFileTypes: true, encoding: 'utf-8', recursive: true }).forEach((file) => {
        // Skip any non-markdown files
        if (!file.isFile() || !(file.name.endsWith('.md') || file.name.endsWith('.mdx'))) return;
        const filePath = path.join(file.parentPath, file.name);

        // Read header and data
        const header = [];
        const data = [];
        let format = 0;
        for (const line of fs.readFileSync(filePath, { encoding: 'utf-8' }).split('\n')) {
            if (line.startsWith('---')) {
                format++;
            } else if (format === 1) {
                header.push(line);
            } else {
                data.push(line);
            }
        }

        // Add section tag to header
        const headerYaml = yaml.parse(header.join('\n'));
        if (!('tags' in headerYaml)) headerYaml['tags'] = [];
        if (!headerYaml['tags'].includes(sectionId.name)) headerYaml['tags'].push(sectionId.name);

        // Write back to output
        fs.writeFileSync(filePath, [
            '---',
            yaml.stringify(headerYaml),
            '---',
            data.join('\n')
        ].join('\n'));
    });
});

// Write tags to main blog
fs.writeFileSync(path.join(MAIN_BLOG_PATH, BLOG_TAGS_FILE), yaml.stringify(tags));

// Construct authors.yml
const authors = {};

// Loop through all authors and merge them
fs.readdirSync(AUTHORS_PATH, { withFileTypes: true, encoding: 'utf-8', recursive: true }).forEach((file) => {
    // Skip any non-yaml files
    if (!file.isFile() || !file.name.endsWith('yml')) return;

    authors[file.name.substring(0, file.name.lastIndexOf('.'))] = parseYaml(file.parentPath, file.name);
});
const authorsYaml = yaml.stringify(authors);

// Write file to main blog
fs.writeFileSync(path.join(MAIN_BLOG_PATH, BLOG_AUTHORS_FILE), authorsYaml);

// Loop through sections and add authors and tags as necessary
fs.readdirSync(SECTIONS_PATH, { encoding: 'utf-8' }).forEach((sectionId) => {
    // Write authors
    fs.writeFileSync(path.join(SECTIONS_PATH, sectionId, BLOG_AUTHORS_FILE), authorsYaml);

    // Handle tags
    if (!fs.existsSync(sectionTagsPath = path.join(SECTIONS_PATH, sectionId, BLOG_TAGS_FILE))) {
        fs.writeFileSync(sectionTagsPath, '');
    }

    // Check if tags file is empty
    gitignorePath = path.join(SECTIONS_PATH, sectionId, GIT_IGNORE_FILE);
    if (fs.readFileSync(sectionTagsPath, { encoding: 'utf-8' }).trim().length == 0) {
        fs.writeFileSync(gitignorePath, 'tags.yml\n');
    } else if (fs.existsSync(gitignorePath)) {
        fs.rmSync(gitignorePath);
    }
});
