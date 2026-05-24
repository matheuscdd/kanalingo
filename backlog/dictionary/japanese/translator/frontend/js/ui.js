(function attachUi(globalScope) {
  function byId(id) {
    return document.getElementById(id);
  }

  function getChoiceParts(button) {
    return {
      body: button.querySelector('.choice-body'),
      meta: button.querySelector('[data-role="meta"]'),
      select: button.querySelector('[data-role="select"]'),
      slot: button.querySelector('[data-role="slot"]'),
      text: button.querySelector('[data-role="text"]')
    };
  }

  function getChoiceElement(view, slot) {
    return slot === 'A' ? view.choiceA : view.choiceB;
  }

  function setChoiceLocked(button, isLocked) {
    const parts = getChoiceParts(button);

    button.classList.toggle('is-disabled', isLocked);
    if (parts.select) {
      parts.select.disabled = isLocked;
      parts.select.hidden = false;
    }
  }

  function clearChoiceEditState(button) {
    const parts = getChoiceParts(button);
    const editStack = parts.body.querySelector('[data-role="edit-stack"]');

    if (editStack) {
      editStack.remove();
    }

    parts.text.hidden = false;
    if (parts.select) {
      parts.select.hidden = false;
      parts.select.disabled = button.classList.contains('is-disabled');
    }
    button.classList.remove('is-editing');
  }

  function cacheElements() {
    return {
      autoSavedValue: byId('autoSavedValue'),
      badgeList: byId('badgeList'),
      bestStreakValue: byId('bestStreakValue'),
      challengeCard: byId('challengeCard'),
      choiceA: byId('choiceA'),
      choiceB: byId('choiceB'),
      completeAutoSaved: byId('completeAutoSaved'),
      completeBestStreak: byId('completeBestStreak'),
      completeCard: byId('completeCard'),
      completeCopy: byId('completeCopy'),
      completeEvaluated: byId('completeEvaluated'),
      completeHeadline: byId('completeHeadline'),
      completeXp: byId('completeXp'),
      copyEnglishBtn: byId('copyEnglishBtn'),
      copyJapaneseBtn: byId('copyJapaneseBtn'),
      copyToast: byId('copyToast'),
      englishText: byId('englishText'),
      evaluatedValue: byId('evaluatedValue'),
      feedbackPill: byId('feedbackPill'),
      japaneseText: byId('japaneseText'),
      levelValue: byId('levelValue'),
      motivationText: byId('motivationText'),
      progressBar: byId('progressBar'),
      progressDetail: byId('progressDetail'),
      progressLabel: byId('progressLabel'),
      recentList: byId('recentList'),
      remainingValue: byId('remainingValue'),
      restartReviewBtn: byId('restartReviewBtn'),
      statusHint: byId('statusHint'),
      streakValue: byId('streakValue'),
      xpBurst: byId('xpBurst'),
      xpValue: byId('xpValue')
    };
  }

  function setChoiceContent(button, option, hotkey) {
    const parts = getChoiceParts(button);
    const termsCopy = option.terms === 1 ? '1 termo' : `${option.terms} termos`;
    const metaCopy = option.metaText || `${termsCopy} • tecla ${hotkey}`;

    clearChoiceEditState(button);
    parts.slot.textContent = option.slot;
    parts.text.textContent = option.text || 'Sem tradução disponível.';
    parts.meta.textContent = metaCopy;
  }

  function resetChoices(view) {
    [view.choiceA, view.choiceB].forEach((button) => {
      button.classList.remove('is-selected', 'is-waiting');
      clearChoiceEditState(button);
      setChoiceLocked(button, false);
    });
  }

  function renderChoiceEditState(view, slot, initialText) {
    const button = getChoiceElement(view, slot);
    const parts = getChoiceParts(button);
    const editStack = document.createElement('div');
    const input = document.createElement('textarea');
    const helper = document.createElement('p');
    const actions = document.createElement('div');
    const confirmButton = document.createElement('button');
    const cancelButton = document.createElement('button');

    clearChoiceEditState(button);
    button.classList.remove('is-selected', 'is-waiting', 'is-disabled');
    button.classList.add('is-editing');

    parts.text.hidden = true;
    parts.meta.textContent = 'Edição manual ativa';
    if (parts.select) {
      parts.select.disabled = true;
      parts.select.hidden = true;
    }

    editStack.className = 'choice-edit-stack';
    editStack.dataset.role = 'edit-stack';

    input.className = 'choice-edit-input';
    input.dataset.role = 'edit-input';
    input.rows = 4;
    input.value = initialText || '';

    helper.className = 'choice-edit-helper';
    helper.textContent = 'Ajuste a tradução desta opção e confirme para salvar.';

    actions.className = 'choice-edit-actions';

    confirmButton.type = 'button';
    confirmButton.className = 'choice-edit-button is-primary';
    confirmButton.dataset.role = 'edit-confirm';
    confirmButton.textContent = 'Confirmar';

    cancelButton.type = 'button';
    cancelButton.className = 'choice-edit-button is-secondary';
    cancelButton.dataset.role = 'edit-cancel';
    cancelButton.textContent = 'Cancelar';

    actions.append(confirmButton, cancelButton);
    editStack.append(input, helper, actions);
    parts.body.appendChild(editStack);

    globalThis.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function restoreChoice(view, slot, option, hotkey) {
    const button = getChoiceElement(view, slot);

    button.classList.remove('is-selected', 'is-waiting');
    setChoiceLocked(button, false);
    setChoiceContent(button, option, hotkey);
  }

  function previewCustomChoice(view, slot, text) {
    const button = getChoiceElement(view, slot);

    setChoiceContent(button, {
      metaText: 'Tradução customizada',
      slot,
      text
    }, slot);
  }

  function getChoiceEditValue(view, slot) {
    const button = getChoiceElement(view, slot);
    const input = button.querySelector('[data-role="edit-input"]');

    return input ? input.value : '';
  }

  function renderBadges(view, badges) {
    view.badgeList.replaceChildren();

    if (!badges?.length) {
      const placeholder = document.createElement('span');
      placeholder.className = 'badge-chip is-muted';
      placeholder.textContent = 'Sem badges ainda';
      view.badgeList.appendChild(placeholder);
      return;
    }

    badges.forEach((badge) => {
      const chip = document.createElement('span');
      chip.className = 'badge-chip';
      chip.textContent = badge;
      view.badgeList.appendChild(chip);
    });
  }

  function renderRecentHistory(view, recentDecisions, helpers) {
    view.recentList.replaceChildren();

    if (!recentDecisions?.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'history-empty';
      emptyItem.textContent = 'Suas escolhas mais recentes aparecerão aqui.';
      view.recentList.appendChild(emptyItem);
      return;
    }

    recentDecisions.forEach((decision) => {
      const item = document.createElement('li');
      item.className = 'history-item';

      const title = document.createElement('strong');
      title.textContent = decision.chosenDisplay;

      const subtitle = document.createElement('small');
      subtitle.textContent = `Registrada ${helpers.formatRelativeTime(decision.timestamp)}`;

      item.append(title, subtitle);
      view.recentList.appendChild(item);
    });
  }

  function renderStats(view, stats, helpers) {
    view.xpValue.textContent = helpers.formatCount(stats.xp);
    view.evaluatedValue.textContent = helpers.formatCount(stats.evaluated);
    view.remainingValue.textContent = helpers.formatCount(stats.remaining);
    view.autoSavedValue.textContent = helpers.formatCount(stats.autoSaved);
    view.levelValue.textContent = `Nível ${helpers.formatCount(stats.level)}`;
    view.streakValue.textContent = helpers.formatCount(stats.streak);
    view.bestStreakValue.textContent = helpers.formatCount(stats.bestStreak);
    view.progressLabel.textContent = `${helpers.formatCount(stats.completionPercentage)}%`;
    view.progressDetail.textContent = helpers.buildProgressCopy(stats);
    view.progressBar.style.width = `${stats.completionPercentage}%`;
    view.completeXp.textContent = helpers.formatCount(stats.xp);
    view.completeEvaluated.textContent = helpers.formatCount(stats.evaluated);
    view.completeAutoSaved.textContent = helpers.formatCount(stats.autoSaved);
    view.completeBestStreak.textContent = helpers.formatCount(stats.bestStreak);
    renderBadges(view, stats.badges);
    renderRecentHistory(view, stats.recentDecisions, helpers);
  }

  function renderItem(view, item) {
    resetChoices(view);
    view.challengeCard.classList.remove('hidden', 'is-loading');
    view.completeCard.classList.add('hidden');
    view.japaneseText.textContent = item.japanese || 'Sem texto japonês';
    view.englishText.textContent = item.englishDisplay || 'Sem contexto em ingles';
    setChoiceContent(view.choiceA, item.optionA, 'A');
    setChoiceContent(view.choiceB, item.optionB, 'B');
    view.statusHint.textContent = 'Clique na melhor opção, use A/B para responder rápido ou clique com o botão direito para editar.';
  }

  function showLoading(view, message) {
    view.challengeCard.classList.add('is-loading');
    view.feedbackPill.className = 'feedback-pill is-loading';
    view.feedbackPill.textContent = message;
    view.statusHint.textContent = 'Buscando a proxima comparação.';
  }

  function renderFeedback(view, stats, reward, helpers) {
    view.feedbackPill.className = reward ? 'feedback-pill is-success' : 'feedback-pill is-neutral';
    view.feedbackPill.textContent = helpers.buildMissionCopy(stats, reward);
    view.xpBurst.textContent = helpers.buildXpLabel(reward);
    view.xpBurst.classList.remove('is-burst');
    if (reward) {
      globalThis.requestAnimationFrame(() => {
        view.xpBurst.classList.add('is-burst');
      });
    }
  }

  function showError(view, message) {
    view.feedbackPill.className = 'feedback-pill is-error';
    view.feedbackPill.textContent = message;
  }

  function highlightChoice(view, slot) {
    const activeButton = slot === 'A' ? view.choiceA : view.choiceB;
    const inactiveButton = slot === 'A' ? view.choiceB : view.choiceA;

    activeButton.classList.add('is-selected');
    inactiveButton.classList.add('is-waiting');
    setChoiceLocked(activeButton, true);
    setChoiceLocked(inactiveButton, true);
  }

  function setActionState(view, isLocked) {
    [view.choiceA, view.choiceB].forEach((button) => {
      setChoiceLocked(button, isLocked);
    });
  }

  function setStatusHint(view, message) {
    view.statusHint.textContent = message;
  }

  function showCopyFeedback(view, type) {
    const button = type === 'japanese' ? view.copyJapaneseBtn : view.copyEnglishBtn;
    const icon = button.querySelector('i');
    const label = button.querySelector('span');
    const previousIcon = icon.className;
    const previousLabel = label.textContent;

    clearTimeout(button.copyTimer);

    button.classList.add('is-copied');
    icon.className = 'fa-solid fa-check';
    label.textContent = 'Copiado!';

    view.copyToast.textContent = type === 'japanese'
      ? 'Japonês copiado para a area de transferência.'
      : 'Ingles copiado para a area de transferência.';
    view.copyToast.classList.add('is-visible');

    button.copyTimer = globalThis.setTimeout(() => {
      button.classList.remove('is-copied');
      icon.className = previousIcon;
      label.textContent = previousLabel;
      view.copyToast.classList.remove('is-visible');
    }, 1200);
  }

  function showComplete(view, stats, helpers) {
    view.challengeCard.classList.add('hidden');
    view.completeCard.classList.remove('hidden');
    view.completeHeadline.textContent = 'Todas as comparações foram avaliadas.';
    view.completeCopy.textContent = `XP ${helpers.formatCount(stats.xp)} acumulado. O arquivo final foi atualizado automaticamente.`;
    view.statusHint.textContent = 'Fila concluída.';
  }

  globalScope.ReviewerUi = {
    cacheElements,
    getChoiceEditValue,
    highlightChoice,
    previewCustomChoice,
    renderFeedback,
    renderChoiceEditState,
    renderItem,
    renderStats,
    resetChoices,
    restoreChoice,
    setActionState,
    setStatusHint,
    showComplete,
    showCopyFeedback,
    showError,
    showLoading
  };
}(globalThis));