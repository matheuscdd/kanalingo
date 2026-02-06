export const levels = Object.freeze([
    {
        category: 1,
        color: "#BEE9FF",
        score: 1000,
    },
    {
        category: 1,
        color: "#7DD3FC",
        score: 5000,
    },
    {
        category: 1,
        color: "#38BDF8",
        score: 10000,
    },
    {
        category: 1,
        color: "#0EA5E9",
        score: 15000,
    },
    {
        category: 1,
        color: "#0369A1",
        score: 20000,
    },
    {
        category: 2,
        color: "#FECACA",
        score: 25000,
    },
    {
        category: 2,
        color: "#FCA5A5",
        score: 30000,
    },
    {
        category: 2,
        color: "#F87171",
        score: 35000,
    },
    {
        category: 2,
        color: "#EF4444",
        score: 40000,
    },
    {
        category: 2,
        color: "#991B1B",
        score: 45000,
    },
    {
        category: 3,
        color: "#D9F99D",
        score: 50000,
    },
    {
        category: 3,
        color: "#A3E635",
        score: 55000,
    },
    {
        category: 3,
        color: "#84CC16",
        score: 60000,
    },
    {
        category: 3,
        color: "#65A30D",
        score: 65000,
    },
    {
        category: 3,
        color: "#365314",
        score: 70000,
    },
    {
        category: 4,
        color: "#E9D5FF",
        score: 75000,
    },
    {
        category: 4,
        color: "#C4B5FD",
        score: 80000,
    },
    {
        category: 4,
        color: "#A78BFA",
        score: 85000,
    },
    {
        category: 4,
        color: "#8B5CF6",
        score: 90000,
    },
    {
        category: 4,
        color: "#5B21B6",
        score: 95000,
    },
    {
        category: 5,
        color: "#FBCFE8",
        score: 100000,
    },
    {
        category: 5,
        color: "#F9A8D4",
        score: 105000,
    },
    {
        category: 5,
        color: "#F472B6",
        score: 110000,
    },
    {
        category: 5,
        color: "#EC4899",
        score: 115000,
    },
    {
        category: 5,
        color: "#9D174D",
        score: 120000,
    },
    {
        category: 6,
        color: "#4CB6AE",
        score: 125000,
    },
    {
        category: 6,
        color: "#25A69A",
        score: 130000,
    },
    {
        category: 6,
        color: "#019788",
        score: 135000,
    },
    {
        category: 6,
        color: "#01897A",
        score: 140000,
    },
    {
        category: 6,
        color: "#01695B",
        score: 145000,
    },
    {
        category: 7,
        color: "#CFFAFE",
        score: 150000,
    },
    {
        category: 7,
        color: "#67E8F9",
        score: 155000,
    },
    {
        category: 7,
        color: "#22D3EE",
        score: 160000,
    },
    {
        category: 7,
        color: "#06B6D4",
        score: 165000,
    },
    {
        category: 7,
        color: "#0E7490",
        score: 170000,
    },
    {
        category: 8,
        color: "#FED7AA",
        score: 175000,
    },
    {
        category: 8,
        color: "#FDBA74",
        score: 180000,
    },
    {
        category: 8,
        color: "#FB923C",
        score: 185000,
    },
    {
        category: 8,
        color: "#EA580C",
        score: 190000,
    },
    {
        category: 8,
        color: "#9A3412",
        score: 195000,
    },
    {
        category: 9,
        color: "#8A8A8A",
        score: 200000,
    },
    {
        category: 9,
        color: "#727270",
        score: 205000,
    },
    {
        category: 9,
        color: "#585858",
        score: 210000,
    },
    {
        category: 9,
        color: "#3F3F3F",
        score: 215000,
    },
    {
        category: 9,
        color: "#262626",
        score: 220000,
    },
    {
        category: 10,
        color: "#FFF3B0",
        score: 225000,
    },
    {
        category: 10,
        color: "#FFE066",
        score: 230000,
    },
    {
        category: 10,
        color: "#FFD700",
        score: 235000,
    },
    {
        category: 10,
        color: "#E6B800",
        score: 240000,
    },
    {
        category: 10,
        color: "#FFD333",
        score: 245000,
    },
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
        name: "Turmalina",
        color: getLastCategory(5).color,
        score: getLastCategory(5).score,
    },
    {
        name: "Turquesa",
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
