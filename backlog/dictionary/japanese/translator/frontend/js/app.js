(function bootstrapApp(globalScope) {
  const api = globalScope.ReviewerApi;
  const helpers = globalScope.Gamification;
  const ui = globalScope.ReviewerUi;
  const defaultStatusHint = 'Clique na melhor opção, use A/B para responder rápido ou clique com o botão direito para editar.';

  const state = {
    currentItem: null,
    currentPresentationId: null,
    editingSlot: null,
    isBusy: false,
    stats: null,
    view: null
  };

  function wait(ms) {
    return new Promise((resolve) => {
      globalThis.setTimeout(resolve, ms);
    });
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helperField = document.createElement('textarea');
    helperField.value = text;
    helperField.setAttribute('readonly', 'readonly');
    helperField.style.position = 'absolute';
    helperField.style.left = '-9999px';
    document.body.appendChild(helperField);
    helperField.select();
    document.execCommand('copy');
    helperField.remove();
  }

  async function refreshStatsOnly() {
    const stats = await api.getStats();
    state.stats = stats;
    ui.renderStats(state.view, stats, helpers);
    ui.renderFeedback(state.view, stats, null, helpers);
  }

  function getOptionForSlot(slot) {
    if (!state.currentItem) {
      return null;
    }

    return slot === 'A' ? state.currentItem.optionA : state.currentItem.optionB;
  }

  function isTextEntryTarget(target) {
    return Boolean(target && typeof target.closest === 'function'
      && target.closest('input, textarea, [contenteditable="true"]'));
  }

  function restoreDefaultHint() {
    ui.setStatusHint(state.view, defaultStatusHint);
  }

  function cancelChoiceEdit() {
    const slot = state.editingSlot;
    const option = getOptionForSlot(slot);

    if (!slot || !option) {
      state.editingSlot = null;
      restoreDefaultHint();
      return;
    }

    state.editingSlot = null;
    ui.restoreChoice(state.view, slot, option, slot);
    restoreDefaultHint();
  }

  function openChoiceEdit(slot, initialText) {
    const option = getOptionForSlot(slot);

    if (state.isBusy || !state.currentPresentationId || !option) {
      return;
    }

    if (state.editingSlot && state.editingSlot !== slot) {
      cancelChoiceEdit();
    }

    if (state.editingSlot === slot) {
      return;
    }

    state.editingSlot = slot;
    ui.renderChoiceEditState(
      state.view,
      slot,
      typeof initialText === 'string' ? initialText : option.text
    );
    ui.setStatusHint(state.view, `Editando a opção ${slot}. Ajuste o texto e confirme para salvar.`);
  }

  async function loadNextItem(options) {
    const config = options || {};
    state.isBusy = true;
    state.editingSlot = null;
    ui.resetChoices(state.view);
    ui.setActionState(state.view, true);
    ui.showLoading(state.view, config.loadingMessage || 'Preparando a proxima comparação.');

    try {
      const payload = await api.getNext();

      state.stats = payload.stats;
      ui.renderStats(state.view, payload.stats, helpers);

      if (payload.done) {
        state.currentItem = null;
        state.currentPresentationId = null;
        state.editingSlot = null;
        ui.renderFeedback(state.view, payload.stats, {
          message: 'Fila concluída. O dicionário final ja esta consolidado.',
          xpGained: 0
        }, helpers);
        ui.showComplete(state.view, payload.stats, helpers);
        return;
      }

      state.currentItem = payload.item;
      state.currentPresentationId = payload.presentationId;
      ui.renderItem(state.view, payload.item);
      ui.renderFeedback(state.view, payload.stats, config.reward || null, helpers);
    } catch (error) {
      ui.showError(state.view, error.message || 'Nao foi possível carregar o proximo item.');
    } finally {
      state.isBusy = false;
      ui.setActionState(state.view, false);
    }
  }

  async function handleChoice(slot, options) {
    const config = options || {};

    if (state.isBusy || !state.currentPresentationId || state.editingSlot) {
      return;
    }

    state.isBusy = true;
    ui.highlightChoice(state.view, slot);

    try {
      const result = await api.saveDecision(state.currentPresentationId, slot, config.customText);
      state.stats = result.stats;
      ui.renderStats(state.view, result.stats, helpers);
      ui.renderFeedback(state.view, result.stats, result.reward, helpers);
      state.currentPresentationId = null;
      await wait(850);
      await loadNextItem({ reward: result.reward });
    } catch (error) {
      state.isBusy = false;
      ui.resetChoices(state.view);
      ui.setActionState(state.view, false);

      if (/expirou/i.test(error.message || '')) {
        state.currentPresentationId = null;
        await loadNextItem({
          loadingMessage: 'Essa comparação expirou. Buscando um novo item.'
        });
        return;
      }

      ui.showError(state.view, error.message || 'Nao foi possível salvar sua escolha.');

      if (typeof config.customText === 'string') {
        openChoiceEdit(slot, config.customText);
        return;
      }

      restoreDefaultHint();
    }
  }

  async function confirmChoiceEdit(slot) {
    if (state.isBusy || state.editingSlot !== slot) {
      return;
    }

    const customText = ui.getChoiceEditValue(state.view, slot).trim();

    if (!customText) {
      ui.showError(state.view, 'Digite uma tradução antes de confirmar.');
      ui.setStatusHint(state.view, `Editando a opção ${slot}. Ajuste o texto e confirme para salvar.`);
      return;
    }

    state.editingSlot = null;
    ui.previewCustomChoice(state.view, slot, customText);
    ui.setStatusHint(state.view, 'Salvando tradução customizada.');
    await handleChoice(slot, { customText });
  }

  async function handleCopy(type) {
    const sourceText = type === 'japanese'
      ? state.currentItem?.japanese
      : state.currentItem?.englishDisplay;

    if (!sourceText) {
      return;
    }

    try {
      await copyToClipboard(sourceText);
      ui.showCopyFeedback(state.view, type);
    } catch {
      ui.showError(state.view, 'Nao foi possível copiar agora.');
    }
  }

  function handleKeydown(event) {
    if (event.repeat) {
      return;
    }

    if (isTextEntryTarget(event.target)) {
      if (event.key === 'Escape' && state.editingSlot) {
        event.preventDefault();
        cancelChoiceEdit();
      }
      return;
    }

    if (state.editingSlot) {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelChoiceEdit();
      }
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'a') {
      event.preventDefault();
      handleChoice('A');
      return;
    }

    if (key === 'b') {
      event.preventDefault();
      handleChoice('B');
      return;
    }

    if (key === 'j') {
      event.preventDefault();
      handleCopy('japanese');
      return;
    }

    if (key === 'e') {
      event.preventDefault();
      handleCopy('english');
    }
  }

  function handleChoiceCardClick(event, slot) {
    if (event.target.closest('[data-role="edit-confirm"]')) {
      event.preventDefault();
      confirmChoiceEdit(slot);
      return;
    }

    if (event.target.closest('[data-role="edit-cancel"]')) {
      event.preventDefault();
      cancelChoiceEdit();
      return;
    }

    if (state.editingSlot) {
      return;
    }

    handleChoice(slot);
  }

  function handleChoiceCardContextMenu(event, slot) {
    event.preventDefault();
    openChoiceEdit(slot);
  }

  function bindChoiceEvents(choiceElement, slot) {
    choiceElement.addEventListener('click', (event) => handleChoiceCardClick(event, slot));
    choiceElement.addEventListener('contextmenu', (event) => handleChoiceCardContextMenu(event, slot));
  }

  function bindEvents() {
    bindChoiceEvents(state.view.choiceA, 'A');
    bindChoiceEvents(state.view.choiceB, 'B');
    state.view.copyJapaneseBtn.addEventListener('click', () => handleCopy('japanese'));
    state.view.copyEnglishBtn.addEventListener('click', () => handleCopy('english'));
    state.view.restartReviewBtn.addEventListener('click', () => loadNextItem({
      loadingMessage: 'Atualizando o estado da fila.'
    }));
    globalThis.addEventListener('keydown', handleKeydown);
  }

  async function init() {
    state.view = ui.cacheElements();
    bindEvents();
    ui.showLoading(state.view, 'Carregando estatísticas e preparando a primeira rodada.');

    try {
      await refreshStatsOnly();
    } catch (error) {
      ui.showError(state.view, error.message || 'Nao foi possível carregar as estatísticas.');
    }

    await loadNextItem();
  }

  document.addEventListener('DOMContentLoaded', init);
}(globalThis));