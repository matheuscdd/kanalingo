const fs = require('node:fs');
const path = require('node:path');

const { PATHS } = require('./config');

const fsp = fs.promises;

async function ensureDirectory(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, fallbackValue) {
  if (!(await fileExists(filePath))) {
    return fallbackValue;
  }

  const content = await fsp.readFile(filePath, 'utf8');

  if (!content.trim()) {
    return fallbackValue;
  }

  return JSON.parse(content);
}

async function writeJsonFileAtomic(filePath, data) {
  await ensureDirectory(path.dirname(filePath));

  const tempFilePath = `${filePath}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;

  await fsp.writeFile(tempFilePath, payload, 'utf8');
  await fsp.rename(tempFilePath, filePath);
}

async function ensureCoreDataFiles() {
  await ensureDirectory(PATHS.dataDir);

  if (!(await fileExists(PATHS.decisionsFile))) {
    await writeJsonFileAtomic(PATHS.decisionsFile, []);
  }

  if (!(await fileExists(PATHS.finalDictionaryFile))) {
    await writeJsonFileAtomic(PATHS.finalDictionaryFile, []);
  }

  if (!(await fileExists(PATHS.skippedFile))) {
    await writeJsonFileAtomic(PATHS.skippedFile, []);
  }
}

function normalizeFinalRecord(item) {
  return {
    id: item.id || item.senseId,
    senseId: item.senseId,
    wordId: item.wordId || null,
    japanese: item.japanese || '',
    english: Array.isArray(item.english) ? item.english : [],
    chosenTranslation: Array.isArray(item.chosenTranslation)
      ? item.chosenTranslation
      : [],
    chosenDisplay: item.chosenDisplay || '',
    trueSource: item.trueSource || null,
    resolution: item.resolution || 'human',
    timestamp: item.timestamp || null
  };
}

function buildFinalDictionary({ autoSavedItems, decisions }) {
  return [...autoSavedItems, ...decisions]
    .map(normalizeFinalRecord)
    .sort((left, right) => left.senseId.localeCompare(right.senseId));
}

async function appendDecision(decision, autoSavedItems) {
  const decisions = await readJsonFile(PATHS.decisionsFile, []);
  const existing = decisions.find((entry) => entry.senseId === decision.senseId);

  if (existing) {
    return {
      decision: existing,
      decisions,
      finalDictionary: buildFinalDictionary({ autoSavedItems, decisions }),
      saved: false
    };
  }

  decisions.push(decision);

  await writeJsonFileAtomic(PATHS.decisionsFile, decisions);

  const finalDictionary = buildFinalDictionary({ autoSavedItems, decisions });
  await writeJsonFileAtomic(PATHS.finalDictionaryFile, finalDictionary);

  return {
    decision,
    decisions,
    finalDictionary,
    saved: true
  };
}

module.exports = {
  appendDecision,
  buildFinalDictionary,
  ensureCoreDataFiles,
  ensureDirectory,
  fileExists,
  readJsonFile,
  writeJsonFileAtomic
};