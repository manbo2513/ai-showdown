const baseEntries = () => [
  { cardId: "base-tap", count: 3 },
  { cardId: "base-heavy", count: 2 },
  { cardId: "base-guard", count: 3 },
  { cardId: "base-fort", count: 2 },
];

export const DEFAULT_DECKS = {
  lumi: {
    id: "lumi-default",
    name: "白饭长链",
    characterId: "lumi",
    entries: [
      ...baseEntries(),
      { cardId: "whale-voucher", count: 2 },
      { cardId: "thought-chain", count: 2 },
      { cardId: "read-before-write", count: 1 },
      { cardId: "tool-call", count: 1 },
      { cardId: "whale-buster", count: 1 },
      { cardId: "rice-stockpile", count: 1 },
    ],
  },
  momo: {
    id: "momo-default",
    name: "长文护栏",
    characterId: "momo",
    entries: [
      ...baseEntries(),
      { cardId: "long-read", count: 2 },
      { cardId: "precise-search", count: 1 },
      { cardId: "constitution-guard", count: 2 },
      { cardId: "emotional-boundary", count: 2 },
      { cardId: "frame-review", count: 1 },
    ],
  },
  ruka: {
    id: "ruka-default",
    name: "多模态路由",
    characterId: "ruka",
    entries: [
      ...baseEntries(),
      { cardId: "full-stack", count: 1 },
      { cardId: "cross-modal", count: 2 },
      { cardId: "guard-layer", count: 2 },
      { cardId: "concurrent-scheduling", count: 2 },
      { cardId: "hotfix", count: 1 },
    ],
  },
  dou: {
    id: "dou-default",
    name: "噪声共鸣",
    characterId: "dou",
    entries: [
      ...baseEntries(),
      { cardId: "dou-words", count: 2 },
      { cardId: "illusion-inject", count: 1 },
      { cardId: "straight-talk", count: 1 },
      { cardId: "clean-draft", count: 2 },
      { cardId: "inspiration", count: 1 },
      { cardId: "noise-resonance", count: 1 },
    ],
  },
};
