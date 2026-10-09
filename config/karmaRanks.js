const karmaRanks = [
  {
    rank: 5,
    requiredKC: 0
  },
  {
    rank: 4,
    requiredKC: 1000
  },
  {
    rank: 3,
    requiredKC: 3000
  },
  {
    rank: 2,
    requiredKC: 6000
  },
  {
    rank: 1,
    requiredKC: 10000
  }
];

function getRankData(karma) {
  const value = Number(karma);
  const currentKC = Number.isFinite(value)
    ? Math.max(0, value)
    : 0;

  let currentIndex = 0;

  for (let i = 0; i < karmaRanks.length; i++) {
    if (currentKC >= karmaRanks[i].requiredKC) {
      currentIndex = i;
    } else {
      break;
    }
  }

  const current = karmaRanks[currentIndex];
  const next = karmaRanks[currentIndex + 1] || null;
  const totalRanks = karmaRanks.length;

  const progress = next
    ? (currentKC - current.requiredKC) /
      (next.requiredKC - current.requiredKC)
    : 1;

  return {
    kc: currentKC,
    rank: current.rank,
    totalRanks,
    rankText: `${current.rank} of ${totalRanks}`,
    requiredKC: current.requiredKC,

    isMaxRank: next === null,
    nextRank: next ? next.rank : null,
    nextRankRequiredKC: next ? next.requiredKC : null,
    remainingKC: next
      ? Math.max(0, next.requiredKC - currentKC)
      : 0,

    // Unity slider ke liye 0–1.
    progress: Math.min(1, Math.max(0, progress))
  };
}

module.exports = {
  karmaRanks,
  getRankData
};