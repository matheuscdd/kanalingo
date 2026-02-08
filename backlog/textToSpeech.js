  const texto = "Olá Cara Gato da Roça, isso é o navegador falando sozinho";
  const msg = new SpeechSynthesisUtterance(texto);

  msg.lang = "pt-BR";        // idioma
  msg.rate = 1;             // velocidade (0.1 a 10)
  msg.pitch = 1;            // tom (0 a 2)
  msg.volume = 1;           // volume (0 a 1)

  window.speechSynthesis.speak(msg);