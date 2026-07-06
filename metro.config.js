const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const generatedOutputDirectories = ['dist', 'web-build'].map((directory) => {
  const absolutePath = path.resolve(__dirname, directory);
  return new RegExp(`^${escapeRegExp(absolutePath)}(?:[/\\\\].*)?$`);
});

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);

config.resolver.blockList = [
  ...defaultBlockList,
  ...generatedOutputDirectories,
];

module.exports = config;
