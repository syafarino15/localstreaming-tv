// Explicit Metro configuration.
//
// Expo provides a default config, but declaring it here makes the transformer
// resolution deterministic and avoids "Cannot read properties of undefined
// (reading 'transformFile')" on Windows when the project path contains spaces.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
