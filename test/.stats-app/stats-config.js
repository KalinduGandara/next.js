const fs = require('fs')
const path = require('path')
// this page is conditionally added when not testing
// in webpack 4 mode since it's not supported for webpack 4
const imagePageData = fs.readFileSync(
  path.join(__dirname, './image.js'),
  'utf8'
)

const clientGlobs = [
  {
    name: 'Client Bundles (main, webpack)',
    globs: [
      '.next/static/runtime/+(main|webpack)-*',
      '.next/static/chunks/!(polyfills*)',
    ],
  },
  {
    name: 'Legacy Client Bundles (polyfills)',
    globs: ['.next/static/chunks/+(polyfills)-*'],
  },
  {
    name: 'Client Pages',
    globs: ['.next/static/BUILD_ID/pages/**/*.js', '.next/static/css/**/*'],
  },
  {
    name: 'Client Build Manifests',
    globs: ['.next/static/BUILD_ID/_buildManifest*'],
  },
  {
    name: 'Rendered Page Sizes',
    globs: ['fetched-pages/**/*.html'],
  },
  {
    name: 'Edge SSR bundle Size',
    globs: [
      '.next/server/pages/edge-ssr.js',
      '.next/server/app/app-edge-ssr/page.js',
    ],
  },
  {
    name: 'Middleware size',
    globs: [
      '.next/server/middleware*.js',
      '.next/server/edge-runtime-webpack.js',
    ],
  },
]

const renames = [
  {
    srcGlob: '.next/static/chunks/pages',
    dest: '.next/static/BUILD_ID/pages',
  },
  {
    srcGlob: '.next/static/BUILD_ID/pages/**/*.js',
    removeHash: true,
  },
  {
    srcGlob: '.next/static/runtime/*.js',
    removeHash: true,
  },
  {
    srcGlob: '.next/static/chunks/*.js',
    removeHash: true,
  },
  {
    srcGlob: '.next/static/*/_buildManifest.js',
    dest: '.next/static/BUILD_ID/_buildManifest.js',
  },
]

module.exports = {
  commentHeading: 'Stats from current PR',
  commentReleaseHeading: 'Stats from current release',
  appBuildCommand: 'NEXT_TELEMETRY_DISABLED=1 yarn next build',
  appStartCommand: 'NEXT_TELEMETRY_DISABLED=1 yarn next start --port $PORT',
  appDevCommand: 'NEXT_TELEMETRY_DISABLED=1 yarn next --port $PORT',
  mainRepo: 'vercel/next.js',
  mainBranch: 'canary',
  autoMergeMain: true,
  configs: [
    {
      title: 'Default Build',
      diff: 'onOutputChange',
      diffConfigFiles: [
        {
          path: 'pages/image.js',
          content: imagePageData,
        },
        {
          path: 'next.config.js',
          content: `
            module.exports = {
              experimental: {
                appDir: true,
                serverComponents: true,
              },
              generateBuildId: () => 'BUILD_ID',
              webpack(config) {
                config.optimization.minimize = false
                config.optimization.minimizer = undefined
                return config
              }
            }
          `,
        },
      ],
      // renames to apply to make file names deterministic
      renames,
      configFiles: [
        {
          path: 'pages/image.js',
          content: imagePageData,
        },
        {
          path: 'next.config.js',
          content: `
          module.exports = {
              experimental: {
                appDir: true,
                serverComponents: true,
              },
              generateBuildId: () => 'BUILD_ID'
            }
          `,
        },
      ],
      filesToTrack: clientGlobs,
      // will be output to fetched-pages/${pathname}.html
      pagesToFetch: [
        'http://localhost:$PORT/',
        'http://localhost:$PORT/link',
        'http://localhost:$PORT/withRouter',
      ],
      pagesToBench: [
        'http://localhost:$PORT/',
        'http://localhost:$PORT/error-in-render',
      ],
      benchOptions: {
        reqTimeout: 60,
        concurrency: 50,
        numRequests: 2500,
      },
    },
    {
      title: 'Default Build with SWC',
      diff: 'onOutputChange',
      diffConfigFiles: [
        {
          path: 'pages/image.js',
          content: imagePageData,
        },
        {
          path: 'next.config.js',
          content: `
            module.exports = {
              experimental: {
                appDir: true,
              },
              generateBuildId: () => 'BUILD_ID',
              swcMinify: true,
              webpack(config) {
                config.optimization.minimize = false
                config.optimization.minimizer = undefined
                return config
              }
            }
          `,
        },
      ],
      // renames to apply to make file names deterministic
      renames,
      configFiles: [
        {
          path: 'pages/image.js',
          content: imagePageData,
        },
        {
          path: 'next.config.js',
          content: `
            module.exports = {
              experimental: {
                appDir: true,
              },
              swcMinify: true,
              generateBuildId: () => 'BUILD_ID'
            }
          `,
        },
      ],
      filesToTrack: clientGlobs,
      // will be output to fetched-pages/${pathname}.html
      pagesToFetch: [
        'http://localhost:$PORT/',
        'http://localhost:$PORT/link',
        'http://localhost:$PORT/withRouter',
      ],
      pagesToBench: [
        'http://localhost:$PORT/',
        'http://localhost:$PORT/error-in-render',
      ],
      benchOptions: {
        reqTimeout: 60,
        concurrency: 50,
        numRequests: 2500,
      },
    },
  ],
}
