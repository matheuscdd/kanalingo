(function attachGamification(globalScope) {
  const formatter = new Intl.NumberFormat('pt-BR');
  const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const idleMessages = [
    'Escolha com calma, mas mantenha o combo vivo.',
    'Cada clique deixa o dicionário mais forte.',
    'Sua intuição humana faz a diferença nesta fila.',
    'Comparação cega ativada. Foque na melhor formulação.',
    'Mais uma rodada e mais XP na conta.'
  ];

  function formatCount(value) {
    return formatter.format(value || 0);
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) {
      return 'agora mesmo';
    }

    const deltaSeconds = Math.round((Date.now() - Date.parse(timestamp)) / 1000);

    if (Math.abs(deltaSeconds) < 60) {
      return 'agora mesmo';
    }

    if (Math.abs(deltaSeconds) < 3600) {
      return relativeFormatter.format(-Math.round(deltaSeconds / 60), 'minute');
    }

    return relativeFormatter.format(-Math.round(deltaSeconds / 3600), 'hour');
  }

  function buildMissionCopy(stats, reward) {
    if (reward && reward.message) {
      return reward.message;
    }

    if (!stats || !stats.evaluated) {
      return 'Primeira rodada pronta. Escolha a tradução mais natural e consistente.';
    }

    if (stats.remaining === 0) {
      return 'Fila concluída. O arquivo final ja foi montado com suas escolhas.';
    }

    if (stats.streak > 0 && stats.streak % 10 === 0) {
      return `Streak de ${formatCount(stats.streak)} escolhas. Continue aquecido.`;
    }

    return idleMessages[stats.evaluated % idleMessages.length];
  }

  function buildProgressCopy(stats) {
    return `${formatCount(stats.evaluated)} de ${formatCount(stats.reviewTotal)} avaliadas`;
  }

  function buildXpLabel(reward) {
    const gained = reward && typeof reward.xpGained === 'number' ? reward.xpGained : 0;
    return `+${formatCount(gained)} XP`;
  }

  globalScope.Gamification = {
    buildMissionCopy,
    buildProgressCopy,
    buildXpLabel,
    formatCount,
    formatRelativeTime
  };
}(window));