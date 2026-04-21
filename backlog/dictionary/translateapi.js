async function traduzir(texto) {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=en|pt`
  );

  const data = await res.json();
  return data.responseData.translatedText;
}

traduzir("How are you?").then(console.log);
