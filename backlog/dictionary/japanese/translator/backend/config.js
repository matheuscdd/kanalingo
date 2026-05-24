const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

const PATHS = {
  rootDir,
  frontendDir: path.join(rootDir, 'frontend'),
  dataDir,
  sourceFiles: {
    azure: path.join(rootDir, 'azure_translator.json'),
    chatgpt: path.join(rootDir, 'chat_gpt.json')
  },
  mergedFile: path.join(dataDir, 'merged.json'),
  autoSavedFile: path.join(dataDir, 'auto_saved.json'),
  decisionsFile: path.join(dataDir, 'decisions.json'),
  finalDictionaryFile: path.join(dataDir, 'final_dictionary.json'),
  skippedFile: path.join(dataDir, 'skipped.json')
};

const GAME_RULES = {
  xpPerDecision: 10,
  milestoneEvery: 25,
  milestoneBonusXp: 50,
  levelStep: 120,
  presentationTtlMs: 15 * 60 * 1000
};

module.exports = {
  GAME_RULES,
  PATHS
};