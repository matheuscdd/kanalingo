const crypto = require('node:crypto');
const path = require('node:path');

const express = require('express');

const { GAME_RULES, PATHS } = require('./config');
const { joinTranslations, normalizeStringArray, runMerge } = require('./merge');
const {
  appendDecision,
  buildFinalDictionary,
  ensureCoreDataFiles,
  fileExists,
  readJsonFile,
  writeJsonFileAtomic
} = require('./storage');

const app = express();
const port = process.env.PORT || 3000;
const CUSTOM_TRANSLATION_MAX_LENGTH = 500;

app.disable('x-powered-by');

const state = {
  activePresentations: new Map(),
  autoSavedItems: [],
  decisions: [],
  decisionsBySenseId: new Map(),
  mergedBySenseId: new Map(),
  mergedItems: [],
  skippedItems: []
};

const baseMotivationalMessages = [
  'Mais um item dominado.',
  'Seu dicionário está ficando mais forte.',
  'Mantenha o ritmo e acumule XP.',
  'Cada escolha melhora a qualidade final.',
  'Você está refinando o melhor resultado humano.'
];

app.use(express.json({ limit: '1mb' }));

function normalizeCustomTranslation(customText) {
  if (typeof customText !== 'string') {
    return null;
  }

  const trimmedValue = customText.trim();

  if (!trimmedValue) {
    return [];
  }

  const rawEntries = trimmedValue.includes('•')
    ? trimmedValue.split('•')
    : [trimmedValue];

  return normalizeStringArray(rawEntries);
}

function parseCustomTranslation(customText) {
  if (customText === undefined) {
    return { translation: null };
  }

  if (typeof customText !== 'string') {
    return {
      error: 'Quando informado, customText precisa ser um texto.'
    };
  }

  if (customText.length > CUSTOM_TRANSLATION_MAX_LENGTH) {
    return {
      error: `A tradução customizada aceita ate ${CUSTOM_TRANSLATION_MAX_LENGTH} caracteres.`
    };
  }

  const translation = normalizeCustomTranslation(customText);

  if (!translation?.length) {
    return {
      error: 'Digite uma tradução customizada antes de confirmar.'
    };
  }

  return { translation };
}

function buildDecisionRecord({
  chosenCandidate,
  chosenSlot,
  chosenSource,
  customTranslation,
  item,
  nextStreak
}) {
  const isCustomDecision = Boolean(customTranslation?.length);
  const decision = {
    id: item.id,
    senseId: item.senseId,
    wordId: item.wordId,
    japanese: item.japanese,
    english: item.english,
    chosenTranslation: isCustomDecision ? customTranslation : chosenCandidate.text,
    chosenDisplay: isCustomDecision
      ? joinTranslations(customTranslation)
      : chosenCandidate.display,
    trueSource: isCustomDecision ? 'custom' : chosenSource,
    selectedSlot: chosenSlot,
    resolution: isCustomDecision ? 'human_custom_review' : 'human_review',
    streak: nextStreak,
    timestamp: new Date().toISOString()
  };

  if (isCustomDecision) {
    decision.originalDisplay = chosenCandidate.display;
    decision.originalSource = chosenSource;
    decision.originalTranslation = chosenCandidate.text;
  }

  return decision;
}

function calculateXp(evaluatedCount) {
  const milestoneBonus = Math.floor(evaluatedCount / GAME_RULES.milestoneEvery)
    * GAME_RULES.milestoneBonusXp;

  return (evaluatedCount * GAME_RULES.xpPerDecision) + milestoneBonus;
}

function calculateLevel(xp) {
  return Math.max(1, Math.floor(xp / GAME_RULES.levelStep) + 1);
}

function computeBestStreak(decisions) {
  return decisions.reduce((best, decision) => Math.max(best, decision.streak || 0), 0);
}

function getBadges(stats) {
  const badges = [];

  if (stats.evaluated >= 1) {
    badges.push('Primeira escolha');
  }

  if (stats.evaluated >= 25) {
    badges.push('Sprinter 25');
  }

  if (stats.evaluated >= 100) {
    badges.push('Maratona 100');
  }

  if (stats.streak >= 10) {
    badges.push(`Fogo ${stats.streak}`);
  }

  return badges;
}

function buildStats() {
  const evaluated = state.decisions.length;
  const totalForReview = state.mergedItems.length;
  const remaining = Math.max(totalForReview - evaluated, 0);
  const xp = calculateXp(evaluated);
  const streak = state.decisions.length
    ? state.decisions.at(-1).streak || evaluated
    : 0;
  const bestStreak = computeBestStreak(state.decisions);
  const progressPercentage = totalForReview
    ? Math.round((evaluated / totalForReview) * 100)
    : 100;

  return {
    autoSaved: state.autoSavedItems.length,
    badges: getBadges({ evaluated, streak }),
    bestStreak,
    completionPercentage: progressPercentage,
    evaluated,
    level: calculateLevel(xp),
    remaining,
    resolvedTotal: state.autoSavedItems.length + evaluated,
    reviewTotal: totalForReview,
    skipped: state.skippedItems.length,
    streak,
    totalEntries: totalForReview + state.autoSavedItems.length + state.skippedItems.length,
    xp,
    recentDecisions: state.decisions.slice(-5).reverse().map((decision) => ({
      senseId: decision.senseId,
      chosenDisplay: decision.chosenDisplay,
      timestamp: decision.timestamp
    }))
  };
}

function buildReward(stats) {
  if (stats.remaining === 0) {
    return {
      message: 'Fila concluída. O dicionário final esta pronto para uso.',
      milestone: 'complete',
      xpGained: GAME_RULES.xpPerDecision
    };
  }

  if (stats.evaluated > 0 && stats.evaluated % 50 === 0) {
    return {
      message: `Voce avaliou ${stats.evaluated} traduções.`,
      milestone: 'volume',
      xpGained: GAME_RULES.xpPerDecision
    };
  }

  if (stats.streak > 0 && stats.streak % 10 === 0) {
    return {
      message: `Streak de ${stats.streak} escolhas.`,
      milestone: 'streak',
      xpGained: GAME_RULES.xpPerDecision
    };
  }

  const index = stats.evaluated % baseMotivationalMessages.length;

  return {
    message: baseMotivationalMessages[index],
    milestone: null,
    xpGained: GAME_RULES.xpPerDecision
  };
}

function buildPresentationResponse(item, presentationId, slots) {
  const leftCandidate = item.candidates[slots.A];
  const rightCandidate = item.candidates[slots.B];

  return {
    done: false,
    item: {
      english: item.english,
      englishDisplay: item.englishDisplay,
      id: item.id,
      japanese: item.japanese,
      optionA: {
        slot: 'A',
        text: leftCandidate.display,
        terms: leftCandidate.text.length
      },
      optionB: {
        slot: 'B',
        text: rightCandidate.display,
        terms: rightCandidate.text.length
      },
      senseId: item.senseId,
      wordId: item.wordId
    },
    presentationId,
    stats: buildStats()
  };
}

function cleanupPresentations() {
  const now = Date.now();

  for (const [presentationId, presentation] of state.activePresentations.entries()) {
    if ((now - presentation.createdAt) > GAME_RULES.presentationTtlMs) {
      state.activePresentations.delete(presentationId);
    }
  }
}

function getNextPendingItem() {
  return state.mergedItems.find((item) => !state.decisionsBySenseId.has(item.senseId)) || null;
}

function createPresentation(item) {
  cleanupPresentations();

  for (const [presentationId, presentation] of state.activePresentations.entries()) {
    if (presentation.senseId === item.senseId) {
      state.activePresentations.delete(presentationId);
    }
  }

  const shouldSwap = Math.random() >= 0.5;
  const slots = shouldSwap
    ? { A: 'chatgpt', B: 'azure' }
    : { A: 'azure', B: 'chatgpt' };
  const presentationId = crypto.randomUUID();

  state.activePresentations.set(presentationId, {
    createdAt: Date.now(),
    senseId: item.senseId,
    slots
  });

  return buildPresentationResponse(item, presentationId, slots);
}

async function bootstrapData() {
  await ensureCoreDataFiles();

  const hasMergeArtifacts = await Promise.all([
    fileExists(PATHS.mergedFile),
    fileExists(PATHS.autoSavedFile)
  ]);

  if (!hasMergeArtifacts.every(Boolean)) {
    await runMerge();
  }

  state.mergedItems = await readJsonFile(PATHS.mergedFile, []);
  state.autoSavedItems = await readJsonFile(PATHS.autoSavedFile, []);
  state.skippedItems = await readJsonFile(PATHS.skippedFile, []);
  state.decisions = await readJsonFile(PATHS.decisionsFile, []);
  state.mergedBySenseId = new Map(state.mergedItems.map((item) => [item.senseId, item]));
  state.decisionsBySenseId = new Map(state.decisions.map((item) => [item.senseId, item]));

  const finalDictionary = buildFinalDictionary({
    autoSavedItems: state.autoSavedItems,
    decisions: state.decisions
  });

  await writeJsonFileAtomic(PATHS.finalDictionaryFile, finalDictionary);
}

app.get('/next', (request, response) => {
  const nextItem = getNextPendingItem();

  if (!nextItem) {
    response.json({
      done: true,
      stats: buildStats()
    });
    return;
  }

  response.json(createPresentation(nextItem));
});

app.post('/decision', async (request, response) => {
  const { chosenSlot, customText, presentationId } = request.body || {};
  const customTextResult = parseCustomTranslation(customText);

  if (!presentationId || !['A', 'B'].includes(chosenSlot)) {
    response.status(400).json({
      error: 'Envie presentationId e chosenSlot igual a A ou B.'
    });
    return;
  }

  if (customTextResult.error) {
    response.status(400).json({
      error: customTextResult.error
    });
    return;
  }

  cleanupPresentations();

  const presentation = state.activePresentations.get(presentationId);

  if (!presentation) {
    response.status(409).json({
      error: 'Essa apresentação expirou. Carregue um novo item.'
    });
    return;
  }

  if (state.decisionsBySenseId.has(presentation.senseId)) {
    state.activePresentations.delete(presentationId);
    response.json({
      alreadyDecided: true,
      stats: buildStats()
    });
    return;
  }

  const item = state.mergedBySenseId.get(presentation.senseId);
  const chosenSource = presentation.slots[chosenSlot];
  const chosenCandidate = item.candidates[chosenSource];
  const nextStreak = state.decisions.length + 1;
  const decision = buildDecisionRecord({
    chosenCandidate,
    chosenSlot,
    chosenSource,
    customTranslation: customTextResult.translation,
    item,
    nextStreak
  });

  try {
    const saveResult = await appendDecision(decision, state.autoSavedItems);

    if (saveResult.saved) {
      state.decisions = saveResult.decisions;
      state.decisionsBySenseId.set(decision.senseId, decision);
    }

    state.activePresentations.delete(presentationId);

    const stats = buildStats();

    response.json({
      decision: {
        chosenDisplay: decision.chosenDisplay,
        senseId: decision.senseId,
        timestamp: decision.timestamp
      },
      reward: buildReward(stats),
      saved: saveResult.saved,
      stats
    });
  } catch (error) {
    response.status(500).json({
      error: 'Nao foi possível salvar a decisão.',
      details: error.message
    });
  }
});

app.get('/stats', (request, response) => {
  response.json(buildStats());
});

app.use(
  '/vendor/fontawesome',
  express.static(path.join(PATHS.rootDir, 'node_modules', '@fortawesome', 'fontawesome-free'))
);
app.use(express.static(PATHS.frontendDir));

app.get('*', (request, response) => {
  response.sendFile('index.html', { root: PATHS.frontendDir });
});

bootstrapData()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor pronto em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao iniciar a aplicação.');
    console.error(error);
    process.exitCode = 1;
  });