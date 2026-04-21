(() => {
const QUESTION_BANK = [
    { text: "Atire nos números PARES", check: (value) => value % 2 === 0 },
    { text: "Atire nos números ÍMPARES", check: (value) => value % 2 !== 0 },
    { text: "Atire nos números MAIORES que 10", check: (value) => value > 10 },
    { text: "Atire nos números MENORES que 8", check: (value) => value < 8 },
    { text: "Atire nos MÚLTIPLOS de 3", check: (value) => value % 3 === 0 },
    { text: "Atire nos MÚLTIPLOS de 5", check: (value) => value % 5 === 0 }
];

function pickNextQuestion(previousQuestion) {
    if (QUESTION_BANK.length === 1) {
        return QUESTION_BANK[0];
    }

    let nextQuestion = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];

    while (nextQuestion === previousQuestion) {
        nextQuestion = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
    }

    return nextQuestion;
}

const app = globalThis.TiroApp || (globalThis.TiroApp = {});

app.createRulesEngine = function createRulesEngine({ changeIntervalSeconds = 15, onQuestionChange } = {}) {
    let currentQuestion = null;
    let questionElapsed = 0;

    function commitQuestion(nextQuestion) {
        currentQuestion = nextQuestion;
        onQuestionChange?.(currentQuestion);
        return currentQuestion;
    }

    return {
        reset() {
            questionElapsed = 0;
            return commitQuestion(pickNextQuestion(null));
        },
        update(deltaSeconds) {
            if (!currentQuestion) {
                return this.reset();
            }

            questionElapsed += deltaSeconds;

            if (questionElapsed < changeIntervalSeconds) {
                return currentQuestion;
            }

            questionElapsed = 0;
            return commitQuestion(pickNextQuestion(currentQuestion));
        },
        getCurrent() {
            return currentQuestion;
        },
        isCorrect(value) {
            return currentQuestion ? currentQuestion.check(value) : false;
        }
    };
};
})();