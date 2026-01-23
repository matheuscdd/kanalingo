export const levels = Object.freeze([
    {
        "category": 1,
        "color": "#BEE9FF",
        "score": 1000
    },
    {
        "category": 1,
        "color": "#7DD3FC",
        "score": 2000
    },
    {
        "category": 1,
        "color": "#38BDF8",
        "score": 3000
    },
    {
        "category": 1,
        "color": "#0EA5E9",
        "score": 4000
    },
    {
        "category": 1,
        "color": "#0369A1",
        "score": 5000
    },
    {
        "category": 2,
        "color": "#FECACA",
        "score": 6000
    },
    {
        "category": 2,
        "color": "#FCA5A5",
        "score": 7000
    },
    {
        "category": 2,
        "color": "#F87171",
        "score": 8000
    },
    {
        "category": 2,
        "color": "#EF4444",
        "score": 9000
    },
    {
        "category": 2,
        "color": "#991B1B",
        "score": 10000
    },
    {
        "category": 3,
        "color": "#D9F99D",
        "score": 11000
    },
    {
        "category": 3,
        "color": "#A3E635",
        "score": 12000
    },
    {
        "category": 3,
        "color": "#84CC16",
        "score": 13000
    },
    {
        "category": 3,
        "color": "#65A30D",
        "score": 14000
    },
    {
        "category": 3,
        "color": "#365314",
        "score": 15000
    },
    {
        "category": 4,
        "color": "#E9D5FF",
        "score": 16000
    },
    {
        "category": 4,
        "color": "#C4B5FD",
        "score": 17000
    },
    {
        "category": 4,
        "color": "#A78BFA",
        "score": 18000
    },
    {
        "category": 4,
        "color": "#8B5CF6",
        "score": 19000
    },
    {
        "category": 4,
        "color": "#5B21B6",
        "score": 20000
    },
    {
        "category": 5,
        "color": "#4CB6AE",
        "score": 21000
    },
    {
        "category": 5,
        "color": "#25A69A",
        "score": 22000
    },
    {
        "category": 5,
        "color": "#019788",
        "score": 23000
    },
    {
        "category": 5,
        "color": "#01897A",
        "score": 24000
    },
    {
        "category": 5,
        "color": "#01695B",
        "score": 25000
    },
    {
        "category": 6,
        "color": "#FBCFE8",
        "score": 26000
    },
    {
        "category": 6,
        "color": "#F9A8D4",
        "score": 27000
    },
    {
        "category": 6,
        "color": "#F472B6",
        "score": 28000
    },
    {
        "category": 6,
        "color": "#EC4899",
        "score": 29000
    },
    {
        "category": 6,
        "color": "#9D174D",
        "score": 30000
    },
    {
        "category": 7,
        "color": "#CFFAFE",
        "score": 31000
    },
    {
        "category": 7,
        "color": "#67E8F9",
        "score": 32000
    },
    {
        "category": 7,
        "color": "#22D3EE",
        "score": 33000
    },
    {
        "category": 7,
        "color": "#06B6D4",
        "score": 34000
    },
    {
        "category": 7,
        "color": "#0E7490",
        "score": 35000
    },
    {
        "category": 8,
        "color": "#FED7AA",
        "score": 36000
    },
    {
        "category": 8,
        "color": "#FDBA74",
        "score": 37000
    },
    {
        "category": 8,
        "color": "#FB923C",
        "score": 38000
    },
    {
        "category": 8,
        "color": "#EA580C",
        "score": 39000
    },
    {
        "category": 8,
        "color": "#9A3412",
        "score": 40000
    },
    {
        "category": 9,
        "color": "#8A8A8A",
        "score": 41000
    },
    {
        "category": 9,
        "color": "#727270",
        "score": 42000
    },
    {
        "category": 9,
        "color": "#585858",
        "score": 43000
    },
    {
        "category": 9,
        "color": "#3F3F3F",
        "score": 44000
    },
    {
        "category": 9,
        "color": "#262626",
        "score": 45000
    },
    {
        "category": 10,
        "color": "#FFF3B0",
        "score": 46000
    },
    {
        "category": 10,
        "color": "#FFE066",
        "score": 47000
    },
    {
        "category": 10,
        "color": "#FFD700",
        "score": 48000
    },
    {
        "category": 10,
        "color": "#E6B800",
        "score": 49000
    },
    {
        "category": 10,
        "color": "#FFD333",
        "score": 50000
    }
]);

export const leagues = Object.freeze([
  {
    name: "Safira",
    color: getLastCategory(1).color,
    score: getLastCategory(1).score,
  },
  {
    name: "Rubi",
    color: getLastCategory(2).color,
    score: getLastCategory(2).score,
  },
  {
    name: "Esmeralda",
    color: getLastCategory(3).color,
    score: getLastCategory(3).score,
  },
  {
    name: "Ametista",
    color: getLastCategory(4).color,
    score: getLastCategory(4).score,
  },
  {
    name: "Turquesa",
    color: getLastCategory(5).color,
    score: getLastCategory(5).score,
  },
    {
    name: "Turmalina",
    color: getLastCategory(6).color,
    score: getLastCategory(6).score,
  },
  {
    name: "Diamante",
    color: getLastCategory(7).color,
    score: getLastCategory(7).score,
  },
  {
    name: "Bronze",
    color: getLastCategory(8).color,
    score: getLastCategory(8).score,
  },
  {
    name: "Prata",
    color: getLastCategory(9).color,
    score: getLastCategory(9).score,
  },
  {
    name: "Ouro",
    color: getLastCategory(10).color,
    score: getLastCategory(10).score,
  },
]);

function getLastCategory(category) {
  return levels.findLast((x) => x.category === category);
}
