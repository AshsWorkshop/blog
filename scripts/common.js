/**
 * Utility for common fields and methods used by all scripts.
 */

// Imports
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';

/**
 * Gets the absolute path from the working process.
 * 
 * @param  {...string} paths The path components.
 * @return {string} The absolute path.
 */
export function absolutePath(...paths) {
    paths.unshift(process.cwd());
    return path.join(...paths);
}

/**
 * Parses a YAML from some file path.
 * 
 * @param  {...string} paths The path components.
 * @returns {any} The parsed YAML object.
 */
export function parseYaml(...paths) {
    return yaml.parse(fs.readFileSync(path.join(...paths), { encoding: 'utf-8' }));
}

/**
 * Reads and splits the file into lines according to its path separator.
 * 
 * @param {string} filePath The path of the file to read.
 * @returns {Array<string>} The file text separated by line.
 */
function readAndSplitFile(filePath) {
    const fileText = fs.readFileSync(filePath, { encoding: 'utf-8' });
    return fileText.split(fileText.indexOf('\r') !== -1 ? '\r\n' : '\n');
}

/**
 * Modifies the header of a content file.
 * 
 * @param {T[]} files The files to read the data of.
 * @param {(file:T) => (string|null)} pathGetter Gets the path of the file from the file type.
 * @param {(yaml:any) => void} modifyHeader A consumer that modifies the header.
 * @template T The type of the file.
 */
export function modifyContentHeaders(files, pathGetter, modifyHeader) {
    // Loop through files in section
    files.forEach((file) => {
        // Get and validate file path
        const filePath = pathGetter(file);
        if (filePath == null || !fs.existsSync(filePath)) return;

        // Read header and data
        const header = [];
        const data = [];
        let format = 0;
        for (const line of readAndSplitFile(filePath)) {
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
        modifyHeader(headerYaml);

        // Write back to output
        fs.writeFileSync(filePath, [
            '---',
            yaml.stringify(headerYaml, { indent: 4 }).trim(),
            '---',
            data.join('\n')
        ].join('\n'));
    });
}

// Constants

/**
 * The path to the main blog.
 */
export const MAIN_BLOG_PATH = absolutePath('blog');
/**
 * The path to the blog sections.
 */
export const SECTIONS_PATH = absolutePath('sections');
/**
 * The path to the section metadata file.
 */
export const SECTIONS_META_FILE = '.section.yml';
