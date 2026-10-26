import { BASE_CARDS, CARD_BY_ID } from "./catalog.js";
import { CHARACTERS } from "./characters.js";
import { DEFAULT_DECKS } from "./decks.js";

export const DECK_RULES = Object.freeze({
  TARGET_SIZE: 18,
  MIN_BASE_CARDS: 8,
  MIN_EXCLUSIVE_CARDS: 6,
  BASE_COPY_LIMIT: 3,
  DEFAULT_EXCLUSIVE_COPY_LIMIT: 1,
});

export function normalizeDeckEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError("牌组 entries 必须是数组");
  }
  const counts = new Map();
  for (const entry of entries) {
    const cardId = String(entry?.cardId || "");
    const count = Number(entry?.count);
    if (!cardId || !Number.isInteger(count) || count <= 0) {
      throw new TypeError("每条牌组记录都必须包含有效的 cardId 和正整数 count");
    }
    counts.set(cardId, (counts.get(cardId) || 0) + count);
  }
  return [...counts].map(([cardId, count]) => ({ cardId, count }));
}

export function expandDeckEntries(entries) {
  return normalizeDeckEntries(entries).flatMap(({ cardId, count }) =>
    Array.from({ length: count }, () => cardId),
  );
}

export function getCardCopyLimit(card) {
  if (card.rarity === "基础") return DECK_RULES.BASE_COPY_LIMIT;
  return card.maxCopies ?? card.copies ?? DECK_RULES.DEFAULT_EXCLUSIVE_COPY_LIMIT;
}

export function validateDeck(characterId, entries, options = {}) {
  const { requireTargetSize = true } = options;
  const character = CHARACTERS[characterId];
  if (!character) {
    return { valid: false, errors: ["未知角色"], total: 0, baseCount: 0 };
  }

  let normalizedEntries;
  try {
    normalizedEntries = normalizeDeckEntries(entries);
  } catch (error) {
    return { valid: false, errors: [error.message], total: 0, baseCount: 0 };
  }

  const ownCardIds = new Set(character.exclusive.map((card) => card.id));
  const errors = [];
  let total = 0;
  let baseCount = 0;
  let exclusiveCount = 0;

  for (const { cardId, count } of normalizedEntries) {
    const card = CARD_BY_ID.get(cardId);
    if (!card) {
      errors.push(`未知卡牌：${cardId}`);
      continue;
    }
    const allowed = card.rarity === "基础" || ownCardIds.has(cardId);
    if (!allowed) {
      errors.push(`不能加入其他角色或特殊卡牌：${card.name}`);
      continue;
    }
    const copyLimit = getCardCopyLimit(card);
    if (count > copyLimit) {
      errors.push(`${card.name} 超过 ${copyLimit} 张上限`);
    }
    total += count;
    if (card.rarity === "基础") baseCount += count;
    else if (ownCardIds.has(cardId)) exclusiveCount += count;
  }

  if (baseCount < DECK_RULES.MIN_BASE_CARDS) {
    errors.push(`基础牌不足，至少需要 ${DECK_RULES.MIN_BASE_CARDS} 张`);
  }
  if (exclusiveCount < DECK_RULES.MIN_EXCLUSIVE_CARDS) {
    errors.push(`专属牌不足，至少需要 ${DECK_RULES.MIN_EXCLUSIVE_CARDS} 张`);
  }
  if (requireTargetSize && total !== DECK_RULES.TARGET_SIZE) {
    errors.push(`牌组必须为 ${DECK_RULES.TARGET_SIZE} 张，当前为 ${total} 张`);
  }

  return {
    valid: errors.length === 0,
    errors,
    total,
    baseCount,
    exclusiveCount,
    isTargetSize: total === DECK_RULES.TARGET_SIZE,
    normalizedEntries,
  };
}

export function getCharacterDeck(characterId, variant = "default") {
  const deck = DEFAULT_DECKS[characterId];
  if (!deck) throw new Error(`缺少角色默认牌组：${characterId}`);
  const counts = new Map(
    normalizeDeckEntries(deck.entries).map(({ cardId, count }) => [cardId, count]),
  );

  if (variant === "attack") {
    const guardCount = counts.get("base-guard") || 0;
    const fortCount = counts.get("base-fort") || 0;
    counts.delete("base-guard");
    counts.delete("base-fort");
    counts.set("base-tap", (counts.get("base-tap") || 0) + guardCount);
    counts.set("base-heavy", (counts.get("base-heavy") || 0) + fortCount);
  }

  return {
    ...deck,
    variant,
    entries: [...counts].map(([cardId, count]) => ({ cardId, count })),
  };
}

export function getDeckCardIds(characterId, variant = "default") {
  return expandDeckEntries(getCharacterDeck(characterId, variant).entries);
}

export function getDeckCardIdsFromEntries(entries) {
  return expandDeckEntries(entries);
}

export function getCharacterCardPool(characterId) {
  const character = CHARACTERS[characterId];
  if (!character) return [];
  return [...Object.values(BASE_CARDS), ...character.exclusive];
}

export function createDeckSnapshot({ id, name, characterId, entries }) {
  return {
    version: 1,
    id,
    name,
    characterId,
    entries: normalizeDeckEntries(entries),
  };
}

export function serializeDeck(deck) {
  return JSON.stringify(createDeckSnapshot(deck));
}

export function deserializeDeck(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || parsed.version !== 1) throw new Error("不支持的牌组存档版本");
  return createDeckSnapshot(parsed);
}
