const fs = require('node:fs');

const { PATHS } = require('./config');
const { ensureCoreDataFiles, writeJsonFileAtomic } = require('./storage');

const fsp = fs.promises;

function normalizeStringArray(value) {
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const normalized = [];

  for (const entry of values) {
    if (typeof entry !== 'string') {
      continue;
    }

    const cleanValue = entry.replace(/\s+/g, ' ').trim();
    const normalizedKey = cleanValue.toLowerCase();

    if (!cleanValue || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalized.push(cleanValue);
  }

  return normalized;
}

function joinTranslations(values) {
  return values.join(' • ');
}

function normalizeEntry(rawEntry, source) {
  const english = normalizeStringArray(rawEntry?.en);
  const portuguese = normalizeStringArray(rawEntry?.pt);

  return {
    source,
    senseId: rawEntry?.senseId ? String(rawEntry.senseId) : null,
    wordId: rawEntry?.wordId ? String(rawEntry.wordId) : null,
    japanese: typeof rawEntry?.kana === 'string' ? rawEntry.kana.trim() : '',
    english,
    englishDisplay: joinTranslations(english),
    portuguese,
    portugueseDisplay: joinTranslations(portuguese)
  };
}

function hasUsablePortuguese(entry) {
  return Boolean(entry && Array.isArray(entry.portuguese) && entry.portuguese.length);
}

function indexBySenseId(entries) {
  const indexedEntries = new Map();

  for (const entry of entries) {
    if (!entry.senseId) {
      continue;
    }

    indexedEntries.set(entry.senseId, entry);
  }

  return indexedEntries;
}

function mergeMetadata(primaryEntry, secondaryEntry) {
  const chosenEntry = primaryEntry || secondaryEntry || {};
  const fallbackEntry = secondaryEntry || primaryEntry || {};

  return {
    senseId: chosenEntry.senseId || fallbackEntry.senseId || null,
    wordId: chosenEntry.wordId || fallbackEntry.wordId || null,
    japanese: chosenEntry.japanese || fallbackEntry.japanese || '',
    english: chosenEntry.english?.length
      ? chosenEntry.english
      : fallbackEntry.english || [],
    englishDisplay: chosenEntry.englishDisplay || fallbackEntry.englishDisplay || ''
  };
}

function buildReviewItem(baseItem, azureEntry, chatgptEntry) {
  return {
    id: baseItem.senseId,
    senseId: baseItem.senseId,
    wordId: baseItem.wordId,
    japanese: baseItem.japanese,
    english: baseItem.english,
    englishDisplay: baseItem.englishDisplay,
    candidates: {
      azure: {
        source: 'azure',
        text: azureEntry.portuguese,
        display: azureEntry.portugueseDisplay
      },
      chatgpt: {
        source: 'chatgpt',
        text: chatgptEntry.portuguese,
        display: chatgptEntry.portugueseDisplay
      }
    },
    createdAt: new Date().toISOString()
  };
}

function buildAutoSavedItem(baseItem, winnerEntry) {
  return {
    id: baseItem.senseId,
    senseId: baseItem.senseId,
    wordId: baseItem.wordId,
    japanese: baseItem.japanese,
    english: baseItem.english,
    chosenTranslation: winnerEntry.portuguese,
    chosenDisplay: winnerEntry.portugueseDisplay,
    trueSource: winnerEntry.source,
    resolution: 'auto_single_translation',
    timestamp: new Date().toISOString()
  };
}

function buildSkippedItem(baseItem, reason) {
  return {
    id: baseItem.senseId,
    senseId: baseItem.senseId,
    wordId: baseItem.wordId,
    japanese: baseItem.japanese,
    english: baseItem.english,
    resolution: reason,
    timestamp: new Date().toISOString()
  };
}

function buildMergeArtifacts({ azureEntries, chatgptEntries }) {
  const azureBySenseId = indexBySenseId(azureEntries);
  const chatgptBySenseId = indexBySenseId(chatgptEntries);
  const senseIds = new Set([...azureBySenseId.keys(), ...chatgptBySenseId.keys()]);

  const merged = [];
  const autoSaved = [];
  const skipped = [];

  for (const senseId of Array.from(senseIds).sort((left, right) => left.localeCompare(right))) {
    const azureEntry = azureBySenseId.get(senseId);
    const chatgptEntry = chatgptBySenseId.get(senseId);
    const baseItem = mergeMetadata(azureEntry, chatgptEntry);
    const hasAzureTranslation = hasUsablePortuguese(azureEntry);
    const hasChatgptTranslation = hasUsablePortuguese(chatgptEntry);

    if (hasAzureTranslation && hasChatgptTranslation) {
      merged.push(buildReviewItem(baseItem, azureEntry, chatgptEntry));
      continue;
    }

    if (hasAzureTranslation || hasChatgptTranslation) {
      autoSaved.push(buildAutoSavedItem(
        baseItem,
        hasAzureTranslation ? azureEntry : chatgptEntry
      ));
      continue;
    }

    skipped.push(buildSkippedItem(baseItem, 'missing_both_translations'));
  }

  return {
    autoSaved,
    merged,
    skipped,
    totals: {
      autoSaved: autoSaved.length,
      merged: merged.length,
      skipped: skipped.length,
      totalSenseIds: senseIds.size
    }
  };
}

async function loadSourceFile(filePath, source) {
  const fileContent = await fsp.readFile(filePath, 'utf8');
  const parsedContent = JSON.parse(fileContent);

  if (!Array.isArray(parsedContent)) {
    throw new TypeError(`Expected an array in ${filePath}`);
  }

  return parsedContent
    .map((entry) => normalizeEntry(entry, source))
    .filter((entry) => entry.senseId);
}

async function runMerge() {
  await ensureCoreDataFiles();

  const [azureEntries, chatgptEntries] = await Promise.all([
    loadSourceFile(PATHS.sourceFiles.azure, 'azure'),
    loadSourceFile(PATHS.sourceFiles.chatgpt, 'chatgpt')
  ]);

  const artifacts = buildMergeArtifacts({
    azureEntries,
    chatgptEntries
  });

  await Promise.all([
    writeJsonFileAtomic(PATHS.mergedFile, artifacts.merged),
    writeJsonFileAtomic(PATHS.autoSavedFile, artifacts.autoSaved),
    writeJsonFileAtomic(PATHS.skippedFile, artifacts.skipped)
  ]);

  return artifacts;
}

if (require.main === module) {
  runMerge()
    .then((artifacts) => {
      console.log('Merge concluído.');
      console.log(`Itens para avaliação: ${artifacts.totals.merged}`);
      console.log(`Itens auto-salvos: ${artifacts.totals.autoSaved}`);
      console.log(`Itens ignorados: ${artifacts.totals.skipped}`);
    })
    .catch((error) => {
      console.error('Falha ao gerar os artefatos de merge.');
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  buildMergeArtifacts,
  hasUsablePortuguese,
  indexBySenseId,
  joinTranslations,
  normalizeEntry,
  normalizeStringArray,
  runMerge
};