(function attachApi(globalScope) {
  async function parsePayload(response) {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  }

  async function request(path, options) {
    const response = await fetch(path, options);
    const payload = await parsePayload(response);

    if (!response.ok) {
      throw new Error(payload?.error || `Falha na requisição ${response.status}`);
    }

    return payload;
  }

  globalScope.ReviewerApi = {
    getNext() {
      return request('/next');
    },
    getStats() {
      return request('/stats');
    },
    saveDecision(presentationId, chosenSlot, customText) {
      return request('/decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chosenSlot,
          ...(typeof customText === 'string' ? { customText } : {}),
          presentationId
        })
      });
    }
  };
}(globalThis));