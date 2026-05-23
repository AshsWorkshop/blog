import * as fs from 'node:fs';
import * as path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type * as Blog from '@docusaurus/plugin-content-blog';
import type * as Theme from '@docusaurus/theme-classic';
import type * as ExpressiveCode from 'rehype-expressive-code';
import rehypeExpressiveCode from 'rehype-expressive-code';
import { pluginLink } from 'expressive-code-links';
import * as common from './scripts/common';
import * as ResolverPlugin from './src/expressive/resolver';

const resolverOptions: ResolverPlugin.ResolverPluginOptions = {
  remotes: {}
};

const expressiveCodeOptions: ExpressiveCode.RehypeExpressiveCodeOptions = {
  plugins: [
    ResolverPlugin.expressiveCodePluginResolver(resolverOptions),
    pluginLink()
  ]
};

/**
 * The mutable parameters of the blog.
 */
interface BlogParams {
  /** Plugin identifier. */
  id: string;
  /** Title of the blog page. */
  title: string;
  /** Description of the blog page. */
  desc: string;
  /** Number of recent posts to show in the sidebar. */
  sidebarCount: number;
}

/**
 * Constructs the options for a docusaurus blog.
 * 
 * @param params The mutable parameters of the blog. If not present, defaults
 *               to the main blog parameters.
 * @returns The blog options.
 */
function constructBlog(params?: BlogParams): Blog.Options {
  return {
    id: params?.id ?? 'main',
    path: params == null ? 'blog' : `sections/${params.id}`,

    blogTitle: params?.title ?? 'Ash\'s Workshop Debrief',
    blogDescription: params?.desc ?? 'A place for my random assortment of work',
    blogSidebarCount: params?.sidebarCount ?? 10,
    blogSidebarTitle: 'Recent Posts',

    routeBasePath: params?.id ?? '/',
    tagsBasePath: 'tags',
    pageBasePath: 'page',
    archiveBasePath: 'archive',
    authorsBasePath: 'authors',

    postsPerPage: 20,

    remarkPlugins: [],
    rehypePlugins: [
      [rehypeExpressiveCode, expressiveCodeOptions]
    ],
    recmaPlugins: [],
    beforeDefaultRemarkPlugins: [],
    beforeDefaultRehypePlugins: [],

    feedOptions: {
      type: 'all',
      xslt: true,
      limit: false
    },

    sortPosts: 'descending',

    showLastUpdateAuthor: false,
    showLastUpdateTime: true,

    onInlineTags: 'throw',        
    onInlineAuthors: 'throw',
    onUntruncatedBlogPosts: 'throw',

    admonitions: true
  } satisfies Blog.Options;
}

/**
 * Constructs a blog plugin with its associated options.
 * 
 * @param params The mutable parameters of the blog. If not present, defaults
 *               to the main blog parameters.
 * @returns The blog plugin with its configured options.
 */
function constructBlogPlugin(params?: BlogParams): [string, Blog.Options] {
  return [
      '@docusaurus/plugin-content-blog',
      constructBlog(params),
  ];
}

/**
 * Constructs all blog plugins for the site by looping through the 'sections'
 * directory.
 * 
 * @returns A list of blog plugins with their configured options.
 */
function getBlogPlugins(): [string, Blog.Options][] {
  const result: [string, Blog.Options][] = [];

  // Loop through sections
  fs.readdirSync(
    common.SECTIONS_PATH,
    { withFileTypes: true, encoding: 'utf-8'}
  ).forEach((sectionId) => {
    // Make sure it is a directory
    if (!sectionId.isDirectory()) return;

    // Read section meta
    const sectionMeta = path.join(sectionId.parentPath, sectionId.name, common.SECTIONS_META_FILE);
    if (fs.existsSync(sectionMeta)) {
      const params: BlogParams = common.parseYaml(sectionMeta)['meta'];
      params.id = sectionId.name;
      result.push(constructBlogPlugin(params));
    }
  });

  return result;
}

const config: Config = {
  title: 'Ash\'s Workshop Debrief',
  tagline: 'A place for a random assortment of hobbies.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // URL
  url: 'https://blog.ashwork.net',
  baseUrl: '/',

  // GitHub pages deployment config.
  organizationName: 'AshsWorkshop',
  projectName: 'blog',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: false,
        blog: constructBlog(),
        theme: {
          customCss: [
            'src/css/custom.css'
          ]
        } satisfies Theme.Options
      } satisfies Preset.Options
    ]
  ],

  plugins: getBlogPlugins(),

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Ashwork Blog'
    },
    footer: {
      copyright: `<p>Copyright © ${new Date().getFullYear()} Ashwork LLC. Built with Docusaurus.</p>`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: [
        'java'
      ]
    }
  } satisfies Preset.ThemeConfig
};

export default config;
