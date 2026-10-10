const karmaRanks = [
  { rank: 5, requiredXP: 0 },
  { rank: 4, requiredXP: 1000 },
  { rank: 3, requiredXP: 3000 },
  { rank: 2, requiredXP: 6000 },
  { rank: 1, requiredXP: 10000 }
];

function getRankData(experience) {
  const value = Number(experience);

  const currentXP = Number.isFinite(value)
    ? Math.max(0, value)
    : 0;

  let currentIndex = 0;

  for (let i = 0; i < karmaRanks.length; i++) {
    if (currentXP >= karmaRanks[i].requiredXP)
      currentIndex = i;
    else
      break;
  }

  const current = karmaRanks[currentIndex];
  const next = karmaRanks[currentIndex + 1] || null;
  const totalRanks = karmaRanks.length;

  const progress = next
    ? (currentXP - current.requiredXP) /
      (next.requiredXP - current.requiredXP)
    : 1;

  return {
    xp: currentXP,
    rank: current.rank,
    totalRanks,
    rankText: `${current.rank} of ${totalRanks}`,
    requiredXP: current.requiredXP,

    isMaxRank: next === null,
    nextRank: next ? next.rank : 0,
    nextRankRequiredXP: next ? next.requiredXP : 0,
    remainingXP: next
      ? Math.max(0, next.requiredXP - currentXP)
      : 0,

    progress: Math.min(1, Math.max(0, progress))
  };
}

module.exports = {
  karmaRanks,
  getRankData
};