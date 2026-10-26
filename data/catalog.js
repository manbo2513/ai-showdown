import { BASE_CARDS, JUNK_CARD, RICE_CARD } from "./base-cards.js";
import { CHARACTER_CARDS } from "./character-cards.js";
import { CHARACTERS } from "./characters.js";
import { DEFAULT_DECKS } from "./decks.js";
import { ENEMY, ENEMY_CARDS } from "./enemy-cards.js";

export {
  BASE_CARDS,
  CHARACTER_CARDS,
  CHARACTERS,
  DEFAULT_DECKS,
  ENEMY,
  ENEMY_CARDS,
  JUNK_CARD,
  RICE_CARD,
};

const definitions = [
  JUNK_CARD,
  RICE_CARD,
  ...Object.values(BASE_CARDS),
  ...Object.values(CHARACTER_CARDS).flat(),
  ...Object.values(ENEMY_CARDS),
];

export const ALL_CARD_DEFINITIONS = definitions;

export const CARD_BY_ID = new Map(
  definitions.map((card) => [card.id, card]),
);

for (const [key, card] of Object.entries(ENEMY_CARDS)) {
  CARD_BY_ID.set(`boss-${key}`, card);
}

export function getCardById(id) {
  return CARD_BY_ID.get(id) || null;
}
