const karmaLevels = [
  { level: 1, requiredXP: 0 },
  { level: 2, requiredXP: 1000 },
  { level: 3, requiredXP: 3000 },
  { level: 4, requiredXP: 6000 },
  { level: 5, requiredXP: 10000 }
];

function getLevelData(experience) {
  const value = Number(experience);

  const currentXP = Number.isFinite(value)
    ? Math.max(0, value)
    : 0;

  let currentIndex = 0;

  for (let i = 0; i < karmaLevels.length; i++) {
    if (currentXP >= karmaLevels[i].requiredXP) {
      currentIndex = i;
    } else {
      break;
    }
  }

  const current = karmaLevels[currentIndex];
  const next = karmaLevels[currentIndex + 1] || null;
  const totalLevels = karmaLevels.length;

  const progress = next
    ? (currentXP - current.requiredXP) /
      (next.requiredXP - current.requiredXP)
    : 1;

  return {
    xp: currentXP,

    level: current.level,
    totalLevels,
    levelText: `Level ${current.level} of ${totalLevels}`,

    requiredXP: current.requiredXP,

    isMaxLevel: next === null,
    nextLevel: next ? next.level : 0,
    nextLevelRequiredXP: next ? next.requiredXP : 0,

    remainingXP: next
      ? Math.max(0, next.requiredXP - currentXP)
      : 0,

    progress: Math.min(1, Math.max(0, progress))
  };
}

// Existing routes aur older clients ke liye compatibility.
const karmaRanks = karmaLevels.map(item => ({
  ...item,
  rank: karmaLevels.length - item.level + 1
}));

function getRankData(experience) {
  const data = getLevelData(experience);

  const legacyRank =
    data.totalLevels - data.level + 1;

  return {
    ...data,

    rank: legacyRank,
    totalRanks: data.totalLevels,
    rankText: `${legacyRank} of ${data.totalLevels}`,

    isMaxRank: data.isMaxLevel,

    nextRank: data.isMaxLevel
      ? 0
      : legacyRank - 1,

    nextRankRequiredXP: data.nextLevelRequiredXP
  };
}

module.exports = {
  karmaLevels,
  getLevelData,

  // Existing imports ko change karna zaroori nahi.
  karmaRanks,
  getRankData
};