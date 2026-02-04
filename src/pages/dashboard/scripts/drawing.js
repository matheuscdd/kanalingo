var writer = HanziWriter.create('drawing-target-main', '码', {
  width: 150,
  height: 150,
  showCharacter: false,
  padding: 5
});
writer.quiz({
  onMistake: function(strokeData) {
    console.log('Oh no! you made a mistake on stroke ' + strokeData.strokeNum);
    console.log("You've made " + strokeData.mistakesOnStroke + " mistakes on this stroke so far");
    console.log("You've made " + strokeData.totalMistakes + " total mistakes on this quiz");
    console.log("There are " + strokeData.strokesRemaining + " strokes remaining in this character");
  },
  onCorrectStroke: function(strokeData) {
    console.log('Yes!!! You got stroke ' + strokeData.strokeNum + ' correct!');
    console.log('You made ' + strokeData.mistakesOnStroke + ' mistakes on this stroke');
    console.log("You've made " + strokeData.totalMistakes + ' total mistakes on this quiz');
    console.log('There are ' + strokeData.strokesRemaining + ' strokes remaining in this character');
  },
  onComplete: function(summaryData) {
    console.log('You did it! You finished drawing ' + summaryData.character);
    console.log('You made ' + summaryData.totalMistakes + ' total mistakes on this quiz');
  }
});

HanziWriter.create('target-div-2', 'ツ', {
  width: 250,
  drawingWidth: 50,
  height: 250,
  charDataLoader: (char, onLoad, onError) => {
    fetch(https://raw.githubusercontent.com/szklsrz/kana-json/refs/heads/main/data/${char}.json)
      .then(res => res.json())
      .then(onLoad)
      .catch(onError);
  }
}).quiz();

var writer = HanziWriter.create('target-div-1', 'ち', {
  width: 400,
  height: 400,
  charDataLoader: (char, onLoad, onError) => {
    fetch(https://raw.githubusercontent.com/szklsrz/kana-json/refs/heads/main/data/${char}.json)
      .then(res => res.json())
      .then(onLoad)
      .catch(onError);
  }
});

