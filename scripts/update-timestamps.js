/**
 * Updates the timestamp in the front matter of changed contents.
 * 
 * Usage (from workspace folder):
 * - node scripts/update-timestamps.js all
 * - node scripts/update-timestamps.js git <start-commit> <end-commit>
 */

// Imports
const chp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const common = require('./common');

/**
 * Updates the header with the given timestamp. The creation time is
 * only updated once, while the last update is always updated.
 * 
 * @param {any} header The header of the content file.
 * @param {string} timestamp The timestamp of the update.
 */
function updateHeader(header, timestamp) {
    // Set creation timestamp if not present
    if (!('date' in header)) header['date'] = timestamp;

    // Set last updated timestamp
    if (!('last_update' in header)) header['last_update'] = {};
    header['last_update']['date'] = timestamp;
}

/**
 * Updates the front matter timestamps for all git commits in the range.
 * 
 * @param {string} start The start commit.
 * @param {string} end  The end commit.
 */
function updateForGit(start, end) {
    // Get commits between bounds
    const commits = chp.execSync(
        `git rev-list ${start}..${end}`, { encoding: 'utf-8' }
    ).trim().split('\n').reverse();
    if (!commits[0].startsWith('start')) commits.unshift(start);

    // Loop through commits
    for (let i = 1; i < commits.length; i++) {
        // Get commit info
        const current = commits[i];

        // Get timestamp of current commit
        const timestamp = new Date(chp.execSync(
            `git show -s --format=%ci ${current}`, { encoding: 'utf-8' }
        ).trim()).toISOString();

        common.modifyContentHeaders(
            // Get commit changes
            chp.execSync(
                `git diff --name-only ${current} ${commits[i - 1]}`, { encoding: 'utf-8' }
            ).trim().split('\n'),
            // Skip any non-markdown files
            (file) => (file.endsWith('.md') || file.endsWith('.mdx')) ? common.absolutePath(file) : null,
            (header) => updateHeader(header, timestamp)
        );
    }
}

/**
 * Update the front matter timestamps for all files.
 */
function updateForAll() {
    // Get timestamp
    const timestamp = new Date().toISOString();

    // Read sections content
    let files = fs.readdirSync(common.SECTIONS_PATH, { withFileTypes: true, encoding: 'utf-8', recursive: true });
    // Read main content if present
    if (fs.existsSync(common.MAIN_BLOG_PATH)) {
        files = files.concat(fs.readdirSync(common.MAIN_BLOG_PATH, { withFileTypes: true, encoding: 'utf-8', recursive: true }));
    }

    common.modifyContentHeaders(
        files,
        // Skip any non-markdown files
        (file) => (!file.isFile() || !(file.name.endsWith('.md') || file.name.endsWith('.mdx'))) ? null : path.join(file.parentPath, file.name),
        (header) => updateHeader(header, timestamp)
    );
}

// Define types
const types = {
    'all': {
        args: 0,
        apply: (argv) => updateForAll()
    },
    'git': {
        args: 2,
        apply: (argv) => updateForGit(argv[3], argv[4])
    }
};

// Validate arguments
if (process.argv.length < 3) {
    throw new TypeError(`Missing "type" argument, one of [${Object.keys(types)}]`);
} else if (!((updateKey = process.argv[2].toLowerCase()) in types)) {
    throw new TypeError(`"${updateKey}" is not a valid "type", expected one of [${Object.keys(types)}]`)
} else if ((updateType = types[updateKey]).args != process.argv.length - 3) {
    throw new TypeError(`Invalid number of arguments "${process.argv.length - 3}" for type "${updateKey}", expected "${updateType.args}"`)
}

// Run update function
updateType.apply(process.argv)
