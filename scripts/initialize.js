/**
 * Setup blog contents and metadata.
 */

// Imports
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const common = require('./common');

// Constants
const AUTHORS_PATH = common.absolutePath('authors');

const BLOG_AUTHORS_FILE = 'authors.yml';
const BLOG_TAGS_FILE = 'tags.yml';

const GIT_IGNORE_FILE = '.gitignore';

// Copy sections to main
fs.cpSync(common.SECTIONS_PATH, common.MAIN_BLOG_PATH, { recursive: true });

// Construct tags.yml
const tags = {};

// Loop through sections in main blog
fs.readdirSync(common.MAIN_BLOG_PATH, { withFileTypes: true, encoding: 'utf-8' }).forEach((sectionId) => {
    // Make sure it is a directory
    if (!sectionId.isDirectory()) return;
    const sectionPath = path.join(sectionId.parentPath, sectionId.name);
    
    // Merge section tags
    if (fs.existsSync(sectionTagsPath = path.join(sectionPath, BLOG_TAGS_FILE))) {
        Object.assign(tags, common.parseYaml(sectionTagsPath));
    }

    // Add main section tag
    tags[sectionId.name] = Object.assign({}, common.parseYaml(sectionPath, common.SECTIONS_META_FILE)['tag']);

    common.modifyContentHeaders(
        // Loop through files in section
        fs.readdirSync(sectionPath, { withFileTypes: true, encoding: 'utf-8', recursive: true }),
        // Skip any non-markdown files
        (file) => (!file.isFile() || !(file.name.endsWith('.md') || file.name.endsWith('.mdx'))) ? null : path.join(file.parentPath, file.name),
        // Add section tag to header
        (header) => {
            if (!('tags' in header)) header['tags'] = [];
            if (!header['tags'].includes(sectionId.name)) header['tags'].push(sectionId.name);
        }
    );
});

// Write tags to main blog
fs.writeFileSync(path.join(common.MAIN_BLOG_PATH, BLOG_TAGS_FILE), yaml.stringify(tags));

// Construct authors.yml
const authors = {};

// Loop through all authors and merge them
fs.readdirSync(AUTHORS_PATH, { withFileTypes: true, encoding: 'utf-8', recursive: true }).forEach((file) => {
    // Skip any non-yaml files
    if (!file.isFile() || !file.name.endsWith('yml')) return;

    authors[file.name.substring(0, file.name.lastIndexOf('.'))] = common.parseYaml(file.parentPath, file.name);
});
const authorsYaml = yaml.stringify(authors);

// Write file to main blog
fs.writeFileSync(path.join(common.MAIN_BLOG_PATH, BLOG_AUTHORS_FILE), authorsYaml);

// Loop through sections and add authors and tags as necessary
fs.readdirSync(common.SECTIONS_PATH, { encoding: 'utf-8' }).forEach((sectionId) => {
    // Write authors
    fs.writeFileSync(path.join(common.SECTIONS_PATH, sectionId, BLOG_AUTHORS_FILE), authorsYaml);

    // Handle tags
    if (!fs.existsSync(sectionTagsPath = path.join(common.SECTIONS_PATH, sectionId, BLOG_TAGS_FILE))) {
        fs.writeFileSync(sectionTagsPath, '');
    }

    // Check if tags file is empty
    gitignorePath = path.join(common.SECTIONS_PATH, sectionId, GIT_IGNORE_FILE);
    if (fs.readFileSync(sectionTagsPath, { encoding: 'utf-8' }).trim().length == 0) {
        fs.writeFileSync(gitignorePath, 'tags.yml\n');
    } else if (fs.existsSync(gitignorePath)) {
        fs.rmSync(gitignorePath);
    }
});
