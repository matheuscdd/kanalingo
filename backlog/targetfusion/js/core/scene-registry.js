(() => {
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

app.experienceRegistry = [
    {
        id: "fair",
        title: "Feira Matemática",
        eyebrow: "Ambiente aberto",
        description: "Barraca voxel, alvos em prateleiras e leitura direta das regras com foco em mira rápida.",
        icon: "fa-solid fa-store",
        accent: "#f7b733"
    },
    {
        id: "edublock",
        title: "EduBlock Arena",
        eyebrow: "Visual retrô",
        description: "Arena aberta com balões numéricos subindo do chão, mantendo a mesma arma e a mesma lógica de tiro.",
        icon: "fa-solid fa-cubes-stacked",
        accent: "#66d17a"
    }
];

app.getExperienceById = function getExperienceById(experienceId) {
    return app.experienceRegistry.find((experience) => experience.id === experienceId) ?? null;
};
})();