import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Athanor - AI Workbench',
  tagline: 'Where modern alchemists cook',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://lacerbi.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/athanor/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'lacerbi', // Usually your GitHub org/user name.
  projectName: 'athanor', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/lacerbi/athanor/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/lacerbi/athanor/edit/main/website/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/social_card.png',
    metadata: [
      {
        name: 'keywords',
        content:
          'athanor, ai, development, workflow, assistant, coding, automation',
      },
      {
        name: 'description',
        content:
          'Athanor - AI Workbench: Streamline your AI-assisted development workflow with smart context selection, seamless AI integration, and controlled change application.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Athanor - AI Workbench' },
      {
        property: 'og:description',
        content:
          'Where modern alchemists cook - Streamline your AI-assisted development workflow',
      },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:title', content: 'Athanor - AI Workbench' },
      {
        property: 'twitter:description',
        content:
          'Streamline your AI-assisted development workflow with smart context selection and controlled change application.',
      },
    ],
    navbar: {
      title: '',
      logo: {
        alt: 'Athanor Logo',
        src: 'img/athanor_logo.png',
      },
      items: [
        {
          to: '/docs/tutorial/introduction',
          label: 'Tutorial',
          position: 'left',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/lacerbi/athanor',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/tutorial/introduction',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/lacerbi/athanor/issues',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/lacerbi/athanor/discussions',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/lacerbi/athanor',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Luigi Acerbi. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
