const legacyExperienceId = document.documentElement.dataset.experience;
const destination = new URL("./index.html", globalThis.location.href);
const currentParams = new URLSearchParams(globalThis.location.search);

for (const [key, value] of currentParams.entries()) {
    destination.searchParams.set(key, value);
}

if (legacyExperienceId) {
    destination.searchParams.set("experience", legacyExperienceId);
}

globalThis.location.replace(destination.toString());