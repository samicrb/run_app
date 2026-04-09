/* eslint-disable no-console */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

// Even if you modify this file, it doesn't apply when you build this project!
// Please see it as a reference to the process when you build it.

const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const { EsbuildPlugin } = require('esbuild-loader');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');

// Get React paths for Plug'n'Play compatibility
const REACT_PATH = require.resolve('react');
const REACT_DOM_PATH = require.resolve('react-dom');
let JSX_RUNTIME_PATH;
try {
  JSX_RUNTIME_PATH = require.resolve('react/jsx-runtime');
} catch (e) {
  JSX_RUNTIME_PATH = require.resolve('react/jsx-runtime.js');
}

// Manifest setup
const rootManifestFileName = 'manifest.json';
const rootManifest = require(`../${rootManifestFileName}`);
const packageName = rootManifest.packageName;
const packageVersion = rootManifest.version;
let dmFileName = `${packageName}.dm`;
if (packageVersion) dmFileName = `${packageName}_${packageVersion}.dm`;
const assetDir = 'assets';
const drscModulePkgFileName = rootManifest.drscModulePackageFile;
const drcfModulePkgFileName = rootManifest.drcfModulePackageFile;
const manifestFileName = 'manifest.json';
const manifest = require(`./${manifestFileName}`);
const rootDir = path.join(__dirname, '../');
const buildDir = path.join(__dirname, 'build');
const buildPkgDir = path.join(buildDir, packageName);
const outputDir = path.join(__dirname, '../../output');
const outputPkgDir = path.join(outputDir, packageName);

// Utility functions
function move(fileName, fromDir, toDir) {
  if (
    fileName &&
    fileName.trim().length > 0 &&
    fs.existsSync(path.join(fromDir, fileName))
  ) {
    fs.moveSync(path.join(fromDir, fileName), path.join(toDir, fileName));
  }
}
function copy(fileName, fromDir, toDir) {
  if (
    fileName &&
    fileName.trim().length > 0 &&
    fs.existsSync(path.join(fromDir, fileName))
  ) {
    fs.copySync(path.join(fromDir, fileName), path.join(toDir, fileName));
  }
}
function copyToDirPath(fileName, fromDir, toDirPath) {
  if (
    fileName &&
    fileName.trim().length > 0 &&
    fs.existsSync(path.join(fromDir, fileName))
  ) {
    fs.copySync(path.join(fromDir, fileName), toDirPath);
  }
}
function remove(fileName, fromDir) {
  if (
    fileName &&
    fileName.trim().length > 0 &&
    fs.existsSync(path.join(fromDir, fileName))
  ) {
    fs.removeSync(path.join(fromDir, fileName));
  }
}
function copyScreenIcons() {
  for (let i = 0, { length } = manifest.screens; i < length; i++) {
    const screen = manifest.screens[i];
    if (screen.icon) {
      copyToDirPath(
        screen.icon,
        __dirname,
        path.join(buildPkgDir, 'assets', screen.icon),
      );
    }
  }
}

// Packaging class
class PackagingModulePackage {
  async packDrscModulePackage() {
    copyScreenIcons();
    copyToDirPath('src/drl', __dirname, path.join(buildPkgDir, 'drl'));
    copyToDirPath(
      'src/assets/uc',
      __dirname,
      path.join(buildPkgDir, 'assets/uc'),
    );
    copyToDirPath(
      'src/assets/raws',
      __dirname,
      path.join(buildPkgDir, 'assets/raws'),
    );
    copy(manifestFileName, __dirname, buildPkgDir);

    const zip = new AdmZip();
    zip.addLocalFolder(buildPkgDir);
    const dstName = path.join(buildDir, drscModulePkgFileName);
    await zip
      .writeZipPromise(dstName, null)
      .then(() => {
        console.log(`Successfully compress ${buildPkgDir} to ${dstName}.`);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  async packTotalModulePackage() {
    copy(assetDir, rootDir, outputPkgDir);
    copy(rootManifestFileName, rootDir, outputPkgDir);
    copy(drscModulePkgFileName, buildDir, outputPkgDir);
    copy(drcfModulePkgFileName, rootDir, outputPkgDir);

    const zip = new AdmZip();
    zip.addLocalFolder(outputPkgDir);
    const dstName = path.join(outputDir, dmFileName);
    await zip
      .writeZipPromise(dstName, null)
      .then(() => {
        remove(packageName, outputDir);
        move(dmFileName, outputDir, outputPkgDir);
        console.log(`Successfully compress ${outputPkgDir} to ${dstName}.`);
      })
      .catch((e) => {
        console.error(e);
      });
  }
  async printErrors(summary, errors) {
    console.log(summary);
    console.log();
    errors.forEach((err) => {
      console.log(err.message || err);
      console.log();
    });
  }
  apply(compiler) {
    compiler.hooks.beforeCompile.tap('PackagingModulePackage', (_) => {
      remove(packageName, buildDir);
      remove(packageName, outputDir);
      remove(dmFileName, outputDir);
    });
    compiler.hooks.done.tap('PackagingModulePackage', async (stats) => {
      if (stats.compilation.errors.length) {
        this.printErrors('Failed to compile.', stats.compilation.errors);
        process.exit(1);
      }

      await this.packDrscModulePackage()
        .then(async () => await this.packTotalModulePackage())
        .catch((e) => console.error(e));
    });
  }
}

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  console.log(
    `[Build Mode] ${isDev ? 'DEVELOPMENT (Fast)' : 'PRODUCTION (Secure)'}`,
  );

  return {
    entry: {
      bundle: './src/index.tsx',
    },
    output: {
      path: buildPkgDir,
      filename: manifest.main,
      publicPath: 'auto',
    },
    devtool: isDev ? 'cheap-module-source-map' : false,
    resolve: {
      alias: {
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@styles': path.resolve(__dirname, 'src/assets/styles'),
        '@langs': path.resolve(__dirname, 'src/assets/langs'),
        react: REACT_PATH,
        'react-dom': REACT_DOM_PATH,
      },
      extensions: [
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.mjs',
        '.mjsx',
        '.css',
        '.scss',
        '.sass',
        '.svg',
        '.json',
      ],
    },
    plugins: [
      new PackagingModulePackage(),
      new webpack.ProvidePlugin({ React: 'react' }),
      new webpack.NormalModuleReplacementPlugin(
        /^react\/jsx-runtime(\.js)?$/,
        (resource) => {
          resource.request = JSX_RUNTIME_PATH;
        },
      ),
      isDev ? null : new WebpackObfuscator({ rotateStringArray: true }),
    ],
    optimization: {
      minimizer: [
        new EsbuildPlugin({
          target: 'es2015', // Syntax to transpile to (see options below for possible values)
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /.*/,
          resolve: { fullySpecified: false },
        },
        {
          test: /\.[t]sx?$/,
          loader: require.resolve('esbuild-loader'),
          options: {
            target: 'es2015',
            jsx: 'automatic',
            tsconfig: path.resolve(__dirname, './tsconfig.json'),
          },
        },
        {
          test: /\.(c|sc|sa)ss$/,
          oneOf: [
            {
              exclude: [/node_modules/, /\.yarn/],
              use: [
                {
                  loader: require.resolve('style-loader'),
                  options: { attributes: { id: `module_${packageName}` } },
                },
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    esModule: false,
                    modules: {
                      localIdentHashSalt: `module_${packageName}`,
                      localIdentName: '[hash:base64]',
                    },
                  },
                },
                require.resolve('sass-loader'),
              ],
            },
            {
              use: [
                {
                  loader: require.resolve('style-loader'),
                  options: { attributes: { id: `module_${packageName}` } },
                },
                {
                  loader: require.resolve('css-loader'),
                  options: {
                    esModule: false,
                    modules: false,
                  },
                },
                require.resolve('sass-loader'),
              ],
            },
          ],
        },
        { test: /\.svg$/, use: [require.resolve('@svgr/webpack')] },
        {
          test: /\.json$/,
          use: [require.resolve('json-loader')],
          type: 'javascript/auto',
        },
        {
          test: /\.*$/i,
          type: 'asset/resource',
          exclude: /\.((m?jsx?)|(tsx?)|(c|sc|sa)ss|(svg)|(json))$/,
          generator: { filename: `assets/[path][name][ext]` },
        },
      ],
    },
  };
};
