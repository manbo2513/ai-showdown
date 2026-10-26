import { DEV } from "./dev.js";
import { CHARACTERS, ENEMY, getCardById } from "./data/catalog.js";
import {
  DECK_RULES,
  createDeckSnapshot,
  getCardCopyLimit,
  getCharacterCardPool,
  getCharacterDeck,
  getDeckCardIds,
  getDeckCardIdsFromEntries,
  validateDeck,
} from "./data/deck-rules.js";

if (DEV.seed != null) {
  let seed = DEV.seed >>> 0;
  Math.random = function seededRandom() {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const MAX_ENERGY = 5;
const HAND_LIMIT = 10;
const DRAW_PER_ROUND = 5;
const SLOT_COUNT = 5;
const AI_SCORE = {
  JITTER: 0.15,
  ATK: 0.94,
  GUARD: 0.73,
  HEAL: 0.5,
  DRAW: 1.5,
  ENERGY: 4.5,
  CHAIN: 2.7,
  COST: 1,
  OPENER: 1.1,
  FINISHER: 1.3,
  HORIZON_HP: 12,
  MATCHUP_OUT: 8,
  MATCHUP_IN: 8,
  NOISE_SELF_HAND: 0.7,
  NOISE_SELF_DRAW: 2.1,
  NOISE_SELF_DISCARD: 0.3,
  NOISE_ENEMY_DRAW: 0.8,
  NOISE_ENEMY_DISCARD: 0.7,
  NOISE_RETAIN: 0.7,
  NOISE_EMPOWER: 0.8,
};

const TAGS = {
  计算: { tone: "sun", name: "计算", fullName: "计算协议", glyph: "⚙", primary: "主攻击", primaryShort: "攻击", use: "推理、计算与直接输出" },
  安全: { tone: "mint", name: "安全", fullName: "安全协议", glyph: "⛨", primary: "主防御", primaryShort: "防御", use: "防御、减伤与安全护栏" },
  对话: { tone: "teal", name: "对话", fullName: "对话协议", glyph: "≋", primary: "主抽牌 / 治疗", primaryShort: "抽牌 · 治疗", use: "抽牌、治疗与长链续航" },
  视觉: { tone: "orange", name: "视觉", fullName: "视觉协议", glyph: "▧", primary: "主复合", primaryShort: "复合", use: "图像解析与攻防兼备的复合效果" },
  代码: { tone: "violet", name: "代码", fullName: "代码协议", glyph: "⌘", primary: "主能力", primaryShort: "能力", use: "打出后成为永久 Buff，不进入弃牌循环" },
  噪声: { tone: "red", name: "噪声", fullName: "噪声协议", glyph: "⚠", primary: "主干扰", primaryShort: "干扰", use: "塞入噪声牌、污染牌库与削弱对手" },
  基础: { tone: "base", name: "基础", fullName: "基础协议", glyph: "◇", primary: "桥接", primaryShort: "桥接", use: "所有基础牌共享；只参与同调，不计入混合专家路由" },
};

const LEGACY_TAGS = {
  星: "计算",
  月: "安全",
  潮: "对话",
  甜: "视觉",
  刃: "代码",
  心: "对话",
  夜: "噪声",
};

const KEYWORD_TONES = {
  固有: "violet",
  滑溜: "teal",
  临时: "orange",
  消逝: "violet",
  消耗: "red",
  虚无: "sky",
  保留: "teal",
  不可取回: "rose",
  反噬: "red",
};

const dom = {
  characterSelect: $("#characterSelect"),
  characterGrid: $("#characterGrid"),
  characterViewport: $("#characterViewport"),
  characterDots: $("#characterDots"),
  characterPrevBtn: $("#characterPrevBtn"),
  characterNextBtn: $("#characterNextBtn"),
  selectedName: $("#selectedName"),
  selectedTitle: $("#selectedTitle"),
  selectedPassiveIcon: $("#selectedPassiveIcon"),
  selectedPassiveName: $("#selectedPassiveName"),
  selectedPassiveText: $("#selectedPassiveText"),
  activeDeckName: $("#activeDeckName"),
  deckChips: $("#deckChips"),
  deckFootnote: $("#deckFootnote"),
  deckBuilderBtn: $("#deckBuilderBtn"),
  deckBuilderModal: $("#deckBuilderModal"),
  closeDeckBuilderBtn: $("#closeDeckBuilderBtn"),
  deckBuilderCharacter: $("#deckBuilderCharacter"),
  deckBuilderRuleNote: $("#deckBuilderRuleNote"),
  deckSaveTabs: $("#deckSaveTabs"),
  deckNameInput: $("#deckNameInput"),
  deckTotalCount: $("#deckTotalCount"),
  deckBaseCount: $("#deckBaseCount"),
  deckExclusiveCount: $("#deckExclusiveCount"),
  deckValidation: $("#deckValidation"),
  deckCardPool: $("#deckCardPool"),
  clearDeckDraftBtn: $("#clearDeckDraftBtn"),
  resetDeckDraftBtn: $("#resetDeckDraftBtn"),
  saveDeckBtn: $("#saveDeckBtn"),
  startBtn: $("#startBtn"),
  roundValue: $("#roundValue"),
  modeLabel: $("#modeLabel"),
  modeSelect: $("#modeSelect"),
  modeDescription: $("#modeDescription"),
  playerName: $("#playerName"),
  playerPortrait: $("#playerPortrait"),
  playerHpText: $("#playerHpText"),
  playerHpFill: $("#playerHpFill"),
  playerPassiveIcon: $("#playerPassiveIcon"),
  playerPassiveName: $("#playerPassiveName"),
  playerPassiveText: $("#playerPassiveText"),
  playerBuffs: $("#playerBuffs"),
  enemyName: $("#enemyName"),
  enemyPortrait: $("#enemyPortrait"),
  enemyPassiveIcon: $("#enemyPassiveIcon"),
  enemyPassiveName: $("#enemyPassiveName"),
  enemyPassiveText: $("#enemyPassiveText"),
  enemyHpText: $("#enemyHpText"),
  enemyHpFill: $("#enemyHpFill"),
  drawCount: $("#drawCount"),
  discardCount: $("#discardCount"),
  exhaustCount: $("#exhaustCount"),
  drawPileBtn: $("#drawPileBtn"),
  discardPileBtn: $("#discardPileBtn"),
  exhaustPileBtn: $("#exhaustPileBtn"),
  energyPips: $("#energyPips"),
  energyValue: $("#energyValue"),
  enemyEnergyPips: $("#enemyEnergyPips"),
  turnNote: $("#turnNote"),
  phaseText: $("#phaseText"),
  resolveFill: $("#resolveFill"),
  slotsUsed: $("#slotsUsed"),
  slots: $("#slots"),
  autoPlaceBtn: $("#autoPlaceBtn"),
  swapBtn: $("#swapBtn"),
  hand: $("#hand"),
  selectionHint: $("#selectionHint"),
  confirmBtn: $("#confirmBtn"),
  soundBtn: $("#soundBtn"),
  helpBtn: $("#helpBtn"),
  helpModal: $("#helpModal"),
  protocolModal: $("#protocolModal"),
  protocolGrid: $("#protocolGrid"),
  protocolBtn: $("#protocolBtn"),
  helpSelectBtn: $("#helpSelectBtn"),
  protocolSelectBtn: $("#protocolSelectBtn"),
  closeProtocolBtn: $("#closeProtocolBtn"),
  closeHelpBtn: $("#closeHelpBtn"),
  helpDoneBtn: $("#helpDoneBtn"),
  menuBtn: $("#menuBtn"),
  resultModal: $("#resultModal"),
  resultCard: $("#resultCard"),
  resultMascot: $("#resultMascot"),
  resultEyebrow: $("#resultEyebrow"),
  resultTitle: $("#resultTitle"),
  resultCopy: $("#resultCopy"),
  resultRounds: $("#resultRounds"),
  resultDamage: $("#resultDamage"),
  resultLinks: $("#resultLinks"),
  resultBest: $("#resultBest"),
  againBtn: $("#againBtn"),
  changeBtn: $("#changeBtn"),
  pileModal: $("#pileModal"),
  closePileBtn: $("#closePileBtn"),
  pileDeckTab: $("#pileDeckTab"),
  pileDiscardTab: $("#pileDiscardTab"),
  pileExhaustTab: $("#pileExhaustTab"),
  pileTitle: $("#pileTitle"),
  pileNote: $("#pileNote"),
  pileList: $("#pileList"),
  modalDeckCount: $("#modalDeckCount"),
  modalDiscardCount: $("#modalDiscardCount"),
  modalExhaustCount: $("#modalExhaustCount"),
  cardModal: $("#cardModal"),
  closeCardBtn: $("#closeCardBtn"),
  cardModalEyebrow: $("#cardModalEyebrow"),
  cardModalTitle: $("#cardModalTitle"),
  cardModalBody: $("#cardModalBody"),
  cardModalActions: $("#cardModalActions"),
  triggerBanner: $("#triggerBanner"),
  toast: $("#toast"),
};

function updateMobileViewportState() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const compactViewport = Math.min(width, height) <= 700;
  const mobileLayout = coarsePointer || compactViewport;
  const portrait = height >= width;
  document.body.classList.toggle("mobile-layout", mobileLayout);
  document.body.classList.toggle("mobile-portrait", mobileLayout && portrait);
  document.body.classList.toggle("mobile-landscape", mobileLayout && !portrait);
}

function scheduleMobileViewportUpdate() {
  requestAnimationFrame(updateMobileViewportState);
  setTimeout(updateMobileViewportState, 120);
  setTimeout(updateMobileViewportState, 420);
}

class SoundEngine {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") this.context.resume();
    return this.context;
  }

  tone(frequency, duration = 0.08, type = "sine", volume = 0.025, slide = 1) {
    const context = this.ensure();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * slide),
      context.currentTime + duration,
    );
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  play(name) {
    if (!this.enabled) return;
    const notes = {
      pick: () => this.tone(540, 0.06, "sine", 0.018, 1.08),
      place: () => this.tone(330, 0.09, "triangle", 0.025, 1.35),
      cancel: () => this.tone(260, 0.08, "triangle", 0.02, 0.8),
      reveal: () => this.tone(470, 0.1, "sine", 0.024, 1.2),
      hit: () => this.tone(150, 0.14, "sawtooth", 0.03, 0.65),
      heal: () => {
        this.tone(523, 0.12, "sine", 0.025, 1.15);
        setTimeout(() => this.tone(659, 0.14, "sine", 0.02, 1.05), 65);
      },
      link: () => {
        this.tone(392, 0.13, "triangle", 0.023, 1.25);
        setTimeout(() => this.tone(523, 0.16, "triangle", 0.02, 1.15), 65);
      },
      win: () => {
        [392, 494, 587, 784].forEach((note, index) => {
          setTimeout(() => this.tone(note, 0.26, "sine", 0.025, 1.02), index * 95);
        });
      },
      lose: () => {
        [294, 247, 196].forEach((note, index) => {
          setTimeout(() => this.tone(note, 0.3, "triangle", 0.022, 0.82), index * 130);
        });
      },
    };
    notes[name]?.();
  }
}

const sound = new SoundEngine();
let state = null;
let selectedCharacterId = DEV.me || "lumi";
let selectedMode = readStorage("model-matrix-mode", "versus");
if (!["versus", "boss"].includes(selectedMode)) selectedMode = "versus";
if (DEV.foe === "boss") selectedMode = "boss";
else if (DEV.foe) selectedMode = "versus";
let matchSequence = 0;
let toastTimer = 0;
let triggerBannerTimer = 0;
let pendingPlayerHandOverflow = 0;
let handOverflowToastTimer = 0;
let currentPile = "deck";
let cardModalSlot = -1;
let carouselIndex = 0;
let carouselDrag = null;
let suppressCarouselClick = false;
let deckDraft = null;
let deckBuilderDirty = false;
const DECK_LIBRARY_KEY = "model-matrix-decks-v1";
const autoRun = DEV.auto == null
  ? null
  : {
      targetMatches: DEV.auto,
      rows: [],
      running: false,
      aborted: false,
      startedAt: 0,
    };

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage is optional; gameplay must still work in private contexts.
  }
}

function readDeckLibrary() {
  try {
    const parsed = JSON.parse(readStorage(DECK_LIBRARY_KEY, "null"));
    if (!parsed || parsed.version !== 1 || typeof parsed.characters !== "object") {
      return { version: 1, characters: {} };
    }
    return parsed;
  } catch {
    return { version: 1, characters: {} };
  }
}

function writeDeckLibrary(library) {
  writeStorage(DECK_LIBRARY_KEY, JSON.stringify(library));
}

function getCharacterDeckStorage(library, characterId) {
  const stored = library.characters[characterId];
  return {
    slots: Array.from({ length: 3 }, (_, index) => stored?.slots?.[index] || null),
    activeSlot:
      Number.isInteger(stored?.activeSlot) &&
      stored.activeSlot >= 0 &&
      stored.activeSlot < 3
        ? stored.activeSlot
        : null,
  };
}

function getActiveSavedDeck(characterId) {
  const library = readDeckLibrary();
  const stored = getCharacterDeckStorage(library, characterId);
  if (stored.activeSlot == null) return null;
  const deck = stored.slots[stored.activeSlot];
  if (!deck) return null;
  const validation = validateDeck(characterId, deck.entries);
  return validation.valid ? deck : null;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wait(ms) {
  return delay(DEV.fast ? ms / 5 : ms);
}

function getCardDefinition(id) {
  return getCardById(id);
}

function normalizedCardProtocols(definition) {
  const protocol = TAGS[definition.tag]
    ? definition.tag
    : LEGACY_TAGS[definition.tag] || definition.tag;
  return definition.rarity === "基础" && protocol !== "基础"
    ? [protocol, "基础"]
    : [protocol];
}

function cardInstance(id) {
  const definition = getCardDefinition(id);
  const protocols = normalizedCardProtocols(definition);
  const protocol = protocols[0];
  return {
    ...definition,
    tag: protocol,
    protocols,
    tone: TAGS[protocol]?.tone || definition.tone,
    uid: `${id}-${Math.random().toString(36).slice(2, 9)}`,
  };
}

function cardProtocols(card) {
  return card?.protocols?.length ? card.protocols : card?.tag ? [card.tag] : [];
}

function effectiveCardCost(card) {
  return Number.isFinite(card?.costOverride)
    ? card.costOverride
    : (card?.cost || 0);
}

function clearRoundCostOverrides(actor) {
  if (!actor) return;
  const cards = [
    ...(actor.hand || []),
    ...(actor.deck || []),
    ...(actor.discard || []),
    ...(actor.exhaust || []),
    ...(actor.placements || []).filter(Boolean),
  ];
  cards.forEach((card) => {
    delete card.costOverride;
  });
}

function cardCanShowStat(card, stat) {
  // Display and stat scaling intentionally share this predicate.
  return (card?.[stat] || 0) > 0 ||
    Boolean(card?.showZeroStats?.[stat]);
}

function countNeighborProtocol(cards, index, protocol) {
  return [index - 1, index + 1].reduce(
    (count, neighborIndex) =>
      count +
      (cardProtocols(cards[neighborIndex]).includes(protocol) ? 1 : 0),
    0,
  );
}

function countOtherUniqueNonBaseProtocols(cards, index) {
  const protocols = new Set();
  cards.forEach((card, cardIndex) => {
    if (!card || cardIndex === index) return;
    cardProtocols(card)
      .filter((protocol) => protocol !== "基础")
      .forEach((protocol) => protocols.add(protocol));
  });
  return protocols.size;
}

function hitCountForCard(card, actor, index) {
  let hits = 1;
  if (card?.multiHitProtocol) {
    hits += actor.placements.reduce(
      (count, entry, entryIndex) =>
        count +
        (entry &&
        entryIndex !== index &&
        cardProtocols(entry).includes(card.multiHitProtocol)
          ? 1
          : 0),
      0,
    );
  }
  if (card?.multiHitExhaustId) {
    hits += actor.exhaust.filter((entry) => entry.id === card.multiHitExhaustId).length;
  }
  return Math.max(1, hits);
}

function actorHasHandNoise(actor) {
  return Boolean(actor?.hand?.some((card) => card.id === "noise-junk"));
}

function actorHasNoise(actor) {
  return Boolean(
    actor?.hand?.some((card) => card.id === "noise-junk") ||
    actor?.placements?.some((card) => card?.id === "noise-junk")
  );
}

function countNoiseInZones(actor, zones = ["hand", "deck", "discard"]) {
  return zones.reduce(
    (sum, zone) =>
      sum +
      (Array.isArray(actor?.[zone])
        ? actor[zone].filter((card) => card.id === "noise-junk").length
        : 0),
    0,
  );
}

function estimateNoiseValue(card, side, horizon) {
  const subjectSide = side === "player" ? "player" : "enemy";
  const opponentSide = subjectSide === "player" ? "enemy" : "player";
  const subject = state[subjectSide];
  const opponent = state[opponentSide];
  if (subject.character.id !== "dou") return 0;
  const noise = card.ai?.noise;
  if (!noise) return 0;

  const selfHand = countNoiseInZones(subject, ["hand"]);
  const selfDraw = countNoiseInZones(subject, ["deck"]);
  const selfDiscard = countNoiseInZones(subject, ["discard"]);
  const enemyHand = countNoiseInZones(opponent, ["hand"]);
  const enemyDraw = countNoiseInZones(opponent, ["deck"]);
  const enemyDiscard = countNoiseInZones(opponent, ["discard"]);
  const turnWeight = Math.min(3, Math.max(1, horizon));
  let value = 0;

  value += (noise.selfHand || 0) * AI_SCORE.NOISE_SELF_HAND;
  value += (noise.selfDraw || 0) * AI_SCORE.NOISE_SELF_DRAW;
  value += (noise.selfDiscard || 0) * AI_SCORE.NOISE_SELF_DISCARD;
  value += (noise.enemyDraw || 0) * AI_SCORE.NOISE_ENEMY_DRAW * turnWeight;
  value += (noise.enemyDiscard || 0) * AI_SCORE.NOISE_ENEMY_DISCARD * turnWeight;

  if (noise.consumeSelfHand) {
    value += selfHand > 0
      ? noise.guardBonus * AI_SCORE.GUARD - 0.45
      : -1;
  }
  if (noise.retainSelfHand) {
    value +=
      (selfHand + (noise.selfHand || 0)) * AI_SCORE.NOISE_RETAIN;
  }
  if (noise.empowersNoise) {
    const enemyNoise =
      enemyHand + enemyDraw + enemyDiscard;
    value += 1 + enemyNoise * AI_SCORE.NOISE_EMPOWER;
  }
  if (noise.requiresOpponentNoise && enemyHand + enemyDraw + enemyDiscard > 0) {
    value += 0.8;
  }
  return value;
}

function sharesProtocol(left, right) {
  if (!left || !right) return false;
  const rightProtocols = new Set(cardProtocols(right));
  return cardProtocols(left).some((protocol) => rightProtocols.has(protocol));
}

function cardKeywords(card) {
  const keywords = [];
  if (card.innate) keywords.push("固有");
  if (card.slippery || card.temporaryCard) keywords.push(card.slippery ? "滑溜" : "临时");
  if (card.vanish) keywords.push("消逝");
  else if (card.exhaust) keywords.push("消耗");
  if (card.void) keywords.push("虚无");
  if (card.retain) keywords.push("保留");
  if (card.locked) keywords.push("不可取回");
  if (card.unusedPenalty) keywords.push(`反噬 ${card.unusedPenalty}`);
  return keywords;
}

function plainDescription(card) {
  return cardDescription(card)
    .replace(/<br\s*\/?>/gi, "；")
    .replace(/<[^>]+>/g, "")
    .replace(/。\s*；/g, "；")
    .replace(/；\s*。/g, "；");
}

function cardDescription(card) {
  const source = card.unusedPenalty
    ? `回合结束时若仍在手牌，失去 <b>${card.unusedPenalty}</b> 稳定度。`
    : card.desc;
  return source
    .replace(/造成\s*<b>(\d+)<\/b>\s*伤害/gi, "攻击 <b>$1</b>")
    .replace(/抵挡\s*<b>(\d+)<\/b>\s*伤害/gi, "抵挡 <b>$1</b>")
    .replace(/恢复\s*<b>(\d+)<\/b>\s*稳定度/gi, "治疗 <b>$1</b>")
    .replace(/抽\s*<b>(\d+)<\/b>\s*张牌/gi, "抽牌 <b>$1</b>")
    .replace(/造成伤害与抵挡各/gi, "攻击与抵挡各")
    .replace(/伤害\s*<b>(\+\d+)<\/b>/gi, "攻击 <b>$1</b>")
    .replace(/失去\s*<b>(\d+)<\/b>\s*稳定度/gi, "失去 <b>$1</b>");
}

function createNoiseShard(side) {
  const card = cardInstance("noise-junk");
  const penalty = state?.[side]?.noisePenalty || 0;
  if (penalty > 0) card.unusedPenalty = penalty;
  return card;
}

function insertNoiseShards(side, zone, count) {
  const actor = state?.[side];
  if (!actor || !Array.isArray(actor[zone])) return;
  for (let index = 0; index < count; index += 1) {
    const shard = createNoiseShard(side);
    if (zone === "deck") {
      actor.deck.splice(Math.floor(Math.random() * (actor.deck.length + 1)), 0, shard);
    } else {
      actor[zone].push(shard);
    }
  }
  enforceHandLimit(side);
}

function empowerSideNoise(side, penalty) {
  const actor = state?.[side];
  if (!actor) return;
  actor.noisePenalty = Math.max(actor.noisePenalty || 0, penalty);
  for (const zone of ["hand", "deck", "discard", "exhaust"]) {
    actor[zone].forEach((card) => {
      if (card.id === "noise-junk") {
        card.unusedPenalty = Math.max(card.unusedPenalty || 0, penalty);
      }
    });
  }
}

function applyNoiseEffects(card, ownerSide) {
  if (!card) return;
  const opponentSide = ownerSide === "player" ? "enemy" : "player";
  const ownerLabel = state[ownerSide].character.name;
  if (card.noiseAllDraw) {
    insertNoiseShards("player", "deck", card.noiseAllDraw);
    insertNoiseShards("enemy", "deck", card.noiseAllDraw);
    showToast(`豆言豆语：双方抽牌堆各混入 ${card.noiseAllDraw} 张噪声碎片`);
  }
  if (card.enemyDiscardNoise) {
    insertNoiseShards(opponentSide, "discard", card.enemyDiscardNoise);
    showToast(`幻觉注入：对手弃牌堆混入 ${card.enemyDiscardNoise} 张噪声碎片`);
  }
  if (card.selfAllZonesNoise) {
    insertNoiseShards(ownerSide, "hand", card.selfAllZonesNoise);
    insertNoiseShards(ownerSide, "deck", card.selfAllZonesNoise);
    insertNoiseShards(ownerSide, "discard", card.selfAllZonesNoise);
    showToast(`${ownerLabel}的灵感带来 3 张噪声碎片`);
  }
  if (card.empowerEnemyNoise) {
    empowerSideNoise(opponentSide, card.empowerEnemyNoise);
    showToast(
      `噪声强化：对手已有及未来的噪声碎片获得 ${card.empowerEnemyNoise} 点反噬`,
    );
  }
}

function buildModelDeck(character, variant = "default") {
  return shuffle(getDeckCardIds(character.id, variant).map(cardInstance));
}

function placeInnateCards(actor) {
  if (!actor || actor.deck.length === 0) return;
  const innate = actor.deck.filter((card) => card.innate);
  if (innate.length === 0) return;
  actor.deck = actor.deck.filter((card) => !card.innate);
  actor.deck.push(...innate);
}

function buildPlayerDeck(characterId) {
  if (DEV.deck === "attack") {
    return buildModelDeck(CHARACTERS[characterId], "attack");
  }
  const savedDeck = getActiveSavedDeck(characterId);
  if (savedDeck) {
    return shuffle(getDeckCardIdsFromEntries(savedDeck.entries).map(cardInstance));
  }
  return buildModelDeck(CHARACTERS[characterId]);
}

function buildBossDeck() {
  const list = [
    "base-tap", "base-tap", "base-tap",
    "base-heavy", "base-heavy",
    "base-guard", "base-guard", "base-guard",
    "base-fort", "base-fort",
    ...ENEMY.deck.flatMap((id) => [id, id]),
  ];
  return shuffle(list.map(cardInstance));
}

function createOpponent(playerCharacterId) {
  if (DEV.foe === "boss") {
    return { ...ENEMY, isBoss: true };
  }
  if (DEV.foe) {
    const foeId = DEV.foe === "gpt" ? "ruka" : DEV.foe;
    if (CHARACTERS[foeId]) {
      return { ...CHARACTERS[foeId], isBoss: false };
    }
  }
  if (selectedMode === "boss") {
    return { ...ENEMY, isBoss: true };
  }
  const candidates = Object.values(CHARACTERS).filter(
    (character) => character.id !== playerCharacterId,
  );
  return { ...candidates[Math.floor(Math.random() * candidates.length)], isBoss: false };
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("visible");
  toastTimer = setTimeout(() => dom.toast.classList.remove("visible"), 1700);
}

function showTriggerBanner({ glyph = "✦", title, detail, tone = "teal" }) {
  if (!dom.triggerBanner) return;
  clearTimeout(triggerBannerTimer);
  dom.triggerBanner.dataset.tone = tone;
  dom.triggerBanner.innerHTML = `
    <span class="trigger-banner-glyph">${glyph}</span>
    <span><b>${title}</b><small>${detail}</small></span>
  `;
  dom.triggerBanner.classList.remove("visible");
  void dom.triggerBanner.offsetWidth;
  dom.triggerBanner.classList.add("visible");
  triggerBannerTimer = setTimeout(
    () => dom.triggerBanner.classList.remove("visible"),
    2600,
  );
}

function setNote(message) {
  dom.turnNote.textContent = message;
}

function renderCharacterSelect() {
  dom.characterGrid.innerHTML = Object.values(CHARACTERS)
    .map((character) => `
      <button class="character-choice ${character.id === selectedCharacterId ? "selected" : ""}"
        type="button" data-character="${character.id}" style="--character-color:${character.color}">
        <div class="choice-portrait">
          <img src="${character.portrait}" alt="${character.name} Q 版立绘" />
        </div>
        <div class="choice-copy">
          <span class="eyebrow">${character.modelTag} MODEL PARTNER</span>
          <h2>${character.name}</h2>
          <div class="choice-title">${character.title}</div>
          <p>${character.desc}</p>
          <div class="choice-tags"><em>战斗特点</em>${character.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </div>
      </button>
    `)
    .join("");

  const character = CHARACTERS[selectedCharacterId];
  dom.selectedName.textContent = character.name;
  dom.selectedTitle.textContent = character.title;
  dom.selectedPassiveIcon.textContent = character.passiveIcon;
  dom.selectedPassiveName.textContent = character.passiveName;
  dom.selectedPassiveText.textContent = character.passiveText;
  const savedDeck = getActiveSavedDeck(character.id);
  const deck = savedDeck
    ? { ...savedDeck, entries: savedDeck.entries }
    : getCharacterDeck(character.id);
  dom.activeDeckName.textContent = savedDeck?.name || "默认卡组";
  dom.deckChips.innerHTML = deck.entries
    .map(({ cardId, count }) => {
      const card = getCardById(cardId);
      return `<span class="deck-chip ${card.rarity === "专属" ? "exclusive" : ""}">${card.name} ×${count}</span>`;
    })
    .join("");
  const exclusiveCount = deck.entries.reduce((sum, { cardId, count }) => {
    return sum + (getCardById(cardId).rarity === "专属" ? count : 0);
  }, 0);
  dom.deckFootnote.textContent = `非官方 AI 模型拟人企划 · 基础牌 10 张 + 模型专属牌 ${exclusiveCount} 张 · 每回合抽 5 张 · 五槽对位`;
  const selectedIndex = Object.keys(CHARACTERS).indexOf(selectedCharacterId);
  carouselIndex = Math.max(0, selectedIndex);
  renderCarouselDots();
  requestAnimationFrame(() => updateCarousel(carouselIndex, false));
}

function selectCharacter(characterId) {
  if (!CHARACTERS[characterId]) return;
  if (DEV.me) return;
  selectedCharacterId = characterId;
  sound.play("pick");
  renderCharacterSelect();
}

function cloneDeckEntries(entries) {
  return entries.map(({ cardId, count }) => ({ cardId, count }));
}

function deckEntryMap(entries) {
  return new Map(entries.map(({ cardId, count }) => [cardId, count]));
}

function openDeckBuilder() {
  const character = CHARACTERS[selectedCharacterId];
  const library = readDeckLibrary();
  const stored = getCharacterDeckStorage(library, character.id);
  const slotIndex = stored.activeSlot ?? -1;
  dom.deckBuilderCharacter.textContent = character.name;
  dom.deckBuilderRuleNote.textContent =
    `${DECK_RULES.TARGET_SIZE}张 / 基础牌至少${DECK_RULES.MIN_BASE_CARDS}张 / ` +
    `专属牌至少${DECK_RULES.MIN_EXCLUSIVE_CARDS}张 / 单卡最多${DECK_RULES.BASE_COPY_LIMIT}张`;
  dom.deckBuilderModal.classList.remove("hidden");
  loadDeckDraftSlot(slotIndex);
}

function closeDeckBuilder() {
  dom.deckBuilderModal.classList.add("hidden");
  deckDraft = null;
  deckBuilderDirty = false;
}

function loadDeckDraftSlot(slotIndex) {
  if (![-1, 0, 1, 2].includes(slotIndex)) return;
  const character = CHARACTERS[selectedCharacterId];
  const library = readDeckLibrary();
  const stored = getCharacterDeckStorage(library, character.id);
  const isDefault = slotIndex === -1;
  const saved = isDefault ? null : stored.slots[slotIndex];
  deckDraft = {
    characterId: character.id,
    slotIndex,
    isDefault,
    name: isDefault ? "默认卡组" : saved?.name || "",
    entries: cloneDeckEntries(
      isDefault
        ? getCharacterDeck(character.id).entries
        : saved?.entries || [],
    ),
  };
  deckBuilderDirty = false;
  renderDeckBuilder();
}

function changeDeckCardCount(cardId, delta) {
  if (!deckDraft) return;
  if (deckDraft.isDefault) {
    showToast("默认卡组只读；请切换到自定义卡槽后修改");
    return;
  }
  const card = getCardById(cardId);
  if (!card) return;
  const entries = deckEntryMap(deckDraft.entries);
  const current = entries.get(cardId) || 0;
  const validation = validateDeck(deckDraft.characterId, deckDraft.entries);
  if (delta > 0 && validation.total >= DECK_RULES.TARGET_SIZE) {
    showToast(`牌组最多 ${DECK_RULES.TARGET_SIZE} 张`);
    return;
  }
  if (delta > 0 && current >= getCardCopyLimit(card)) {
    showToast(`【${card.name}】最多携带 ${getCardCopyLimit(card)} 张`);
    return;
  }
  const nextCount = Math.max(0, current + delta);
  if (nextCount === 0) entries.delete(cardId);
  else entries.set(cardId, nextCount);
  deckDraft.entries = [...entries].map(([entryCardId, count]) => ({
    cardId: entryCardId,
    count,
  }));
  deckBuilderDirty = true;
  renderDeckBuilder();
}

function renderDeckBuilder() {
  if (!deckDraft) return;
  const character = CHARACTERS[deckDraft.characterId];
  const validation = validateDeck(deckDraft.characterId, deckDraft.entries);
  const entries = deckEntryMap(deckDraft.entries);
  const library = readDeckLibrary();
  const stored = getCharacterDeckStorage(library, character.id);
  dom.deckBuilderCharacter.textContent = character.name;
  dom.deckNameInput.disabled = deckDraft.isDefault;
  dom.deckNameInput.value = deckDraft.name;
  dom.deckTotalCount.textContent =
    `${validation.total} / ${DECK_RULES.TARGET_SIZE}`;
  dom.deckBaseCount.textContent =
    `${validation.baseCount} / ${DECK_RULES.MIN_BASE_CARDS}+`;
  dom.deckExclusiveCount.textContent =
    `${validation.exclusiveCount} / ${DECK_RULES.MIN_EXCLUSIVE_CARDS}+`;
  dom.deckValidation.textContent = validation.valid
    ? "牌组合法，可以保存并使用"
    : validation.errors.join(" · ");
  dom.deckValidation.classList.toggle("valid", validation.valid);
  dom.saveDeckBtn.disabled =
    !validation.valid;
  dom.saveDeckBtn.textContent = deckDraft.isDefault
    ? "使用默认卡组"
    : "保存并使用";
  dom.saveDeckBtn.classList.toggle("using-default", deckDraft.isDefault);
  dom.clearDeckDraftBtn.disabled = deckDraft.isDefault || validation.total === 0;
  dom.resetDeckDraftBtn.disabled = deckDraft.isDefault;

  const defaultTab = `<button class="deck-save-tab default ${deckDraft.slotIndex === -1 ? "active" : ""}" type="button" data-deck-slot="-1">
    <b>默认卡组</b>
    <span>预设18张${stored.activeSlot == null ? " · 使用中" : ""}</span>
  </button>`;
  const customTabs = stored.slots
    .map((deck, index) => {
      const active = index === deckDraft.slotIndex;
      const inUse = index === stored.activeSlot;
      const customName = active
        ? deckDraft.name.trim()
        : deck?.name?.trim();
      return `<button class="deck-save-tab ${active ? "active" : ""}" type="button" data-deck-slot="${index}">
        <b>${customName || `自定义 ${index + 1}`}</b>
        <span>${deck ? "已构筑" : "空槽 · 点击开始"}${inUse ? " · 使用中" : ""}</span>
      </button>`;
    })
    .join("");
  dom.deckSaveTabs.innerHTML = defaultTab + customTabs;

  const renderPoolCard = (card) => {
      const count = entries.get(card.id) || 0;
      const limit = getCardCopyLimit(card);
      const displayCard = {
        ...card,
        protocols: normalizedCardProtocols(card),
      };
      const stats = [
        cardCanShowStat(card, "atk") ? `⚔ ${card.atk}` : "",
        cardCanShowStat(card, "guard") ? `◈ ${card.guard}` : "",
        card.heal ? `♡ ${card.heal}` : "",
        card.draw ? `抽 ${card.draw}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const keywords = cardKeywords(card);
      const metaItems = keywords.length ? keywords : [stats || card.role];
      const metaMarkup = metaItems
        .filter(Boolean)
        .map((item) => {
          const tone = KEYWORD_TONES[item.split(" ")[0]] || card.tone;
          return `<span class="tag-badge deck-meta-chip" data-tone="${tone}">${item}</span>`;
        })
        .join("");
      return `<article class="deck-pool-card ${card.rarity === "基础" ? "base-card" : "exclusive-card"} ${count ? "included" : ""}" data-tone="${card.tone}" data-kind="${card.rarity === "基础" ? "base" : "exclusive"}">
        <div class="deck-pool-card-head">
          <span class="deck-pool-cost">${effectiveCardCost(card)}</span>
          <div>
            <strong>${card.name}</strong>
            <small class="deck-card-meta">${metaMarkup}</small>
          </div>
          ${cardTagsMarkup(displayCard, "inline")}
        </div>
        <p>${plainDescription(card)}</p>
        <div class="deck-pool-controls">
          <button type="button" data-deck-card-action="remove" data-card-id="${card.id}" ${count && !deckDraft.isDefault ? "" : "disabled"} aria-label="减少 ${card.name}">−</button>
          <b>${count} / ${limit}</b>
          <button type="button" data-deck-card-action="add" data-card-id="${card.id}" ${deckDraft.isDefault || count >= limit || validation.total >= DECK_RULES.TARGET_SIZE ? "disabled" : ""} aria-label="增加 ${card.name}">＋</button>
        </div>
      </article>`;
    };
  const pool = getCharacterCardPool(character.id);
  const baseCards = pool.filter((card) => card.rarity === "基础");
  const exclusiveCards = pool.filter((card) => card.rarity !== "基础");
  const selectedBase = baseCards.reduce(
    (sum, card) => sum + (entries.get(card.id) || 0),
    0,
  );
  const selectedExclusive = exclusiveCards.reduce(
    (sum, card) => sum + (entries.get(card.id) || 0),
    0,
  );
  dom.deckCardPool.innerHTML = `
    <section class="deck-pool-section base-section">
      <div class="deck-pool-section-head">
        <div><span>PUBLIC CARDS</span><h3>公共基础牌</h3></div>
        <b>已选 ${selectedBase} 张</b>
      </div>
      <p>所有角色共用，负责同调桥接与基础攻防。</p>
      <div class="deck-pool-grid">${baseCards.map(renderPoolCard).join("")}</div>
    </section>
    <section class="deck-pool-section exclusive-section">
      <div class="deck-pool-section-head">
        <div><span>MODEL EXCLUSIVE</span><h3>${character.name}专属牌</h3></div>
        <b>已选 ${selectedExclusive} 张</b>
      </div>
      <p>仅当前角色可携带，构成角色专属打法与组合。</p>
      <div class="deck-pool-grid">${exclusiveCards.map(renderPoolCard).join("")}</div>
    </section>
  `;
}

function saveDeckDraft() {
  if (!deckDraft) return;
  if (deckDraft.isDefault) {
    const library = readDeckLibrary();
    const stored = getCharacterDeckStorage(library, deckDraft.characterId);
    stored.activeSlot = null;
    library.characters[deckDraft.characterId] = stored;
    writeDeckLibrary(library);
    renderDeckBuilder();
    renderCharacterSelect();
    showToast("已切换为默认卡组");
    closeDeckBuilder();
    return;
  }
  const validation = validateDeck(deckDraft.characterId, deckDraft.entries);
  if (!validation.valid) {
    showToast(validation.errors[0]);
    return;
  }
  const library = readDeckLibrary();
  const stored = getCharacterDeckStorage(library, deckDraft.characterId);
  const slotIndex = deckDraft.slotIndex;
  const name = deckDraft.name.trim() || `自定义 ${slotIndex + 1}`;
  const savedDeck = {
    ...createDeckSnapshot({
      id: stored.slots[slotIndex]?.id || `${deckDraft.characterId}-deck-${slotIndex + 1}`,
      name,
      characterId: deckDraft.characterId,
      entries: deckDraft.entries,
    }),
    updatedAt: Date.now(),
  };
  stored.slots[slotIndex] = savedDeck;
  stored.activeSlot = slotIndex;
  library.characters[deckDraft.characterId] = stored;
  writeDeckLibrary(library);
  deckDraft.name = name;
  deckBuilderDirty = false;
  renderDeckBuilder();
  renderCharacterSelect();
  showToast(`已保存并使用牌组【${name}】`);
  closeDeckBuilder();
}

function renderModeSelect() {
  dom.modeSelect.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === selectedMode);
  });
  dom.modeDescription.textContent =
    selectedMode === "boss"
      ? "Boss 模式：挑战强化版失控模型 HALLU，它拥有更高稳定度和噪声牌组。"
      : "对战模式：从你未选择的其他模型娘中随机匹配对手与专属牌组。";
}

function selectMode(mode) {
  if (!["versus", "boss"].includes(mode)) return;
  selectedMode = mode;
  writeStorage("model-matrix-mode", mode);
  sound.play("pick");
  renderModeSelect();
}

function carouselCards() {
  return [...dom.characterGrid.querySelectorAll("[data-character]")];
}

function updateCarousel(index, smooth = true) {
  const cards = carouselCards();
  if (!cards.length) return;
  carouselIndex = Math.max(0, Math.min(cards.length - 1, index));
  const target = cards[carouselIndex];
  dom.characterViewport.scrollTo({
    left: target.offsetLeft,
    behavior: smooth ? "smooth" : "auto",
  });
  [...dom.characterDots.children].forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === carouselIndex);
  });
}

function selectCarouselIndex(index) {
  const cards = carouselCards();
  if (!cards.length) return;
  const nextIndex = Math.max(0, Math.min(cards.length - 1, index));
  const characterId = cards[nextIndex]?.dataset.character;
  if (!characterId) return;
  if (characterId === selectedCharacterId) {
    updateCarousel(nextIndex);
    return;
  }
  selectCharacter(characterId);
}

function renderCarouselDots() {
  const cards = carouselCards();
  dom.characterDots.innerHTML = cards
    .map(
      (card, index) =>
        `<button class="carousel-dot ${index === carouselIndex ? "active" : ""}" type="button" data-carousel-index="${index}" aria-label="查看 ${card.querySelector("h2")?.textContent || `角色 ${index + 1}`}"></button>`,
    )
    .join("");
}

function normalizeCarouselIndex() {
  const cards = carouselCards();
  if (!cards.length) return;
  let nearest = 0;
  let distance = Infinity;
  cards.forEach((card, index) => {
    const current = Math.abs(card.offsetLeft - dom.characterViewport.scrollLeft);
    if (current < distance) {
      distance = current;
      nearest = index;
    }
  });
  carouselIndex = nearest;
  [...dom.characterDots.children].forEach((dot, index) => {
    dot.classList.toggle("active", index === nearest);
  });
}

function startMatch() {
  matchSequence += 1;
  clearTimeout(triggerBannerTimer);
  dom.triggerBanner.classList.remove("visible");
  clearTimeout(handOverflowToastTimer);
  pendingPlayerHandOverflow = 0;
  const character = CHARACTERS[selectedCharacterId];
  const opponent = createOpponent(character.id);
  const opponentDeck = opponent.isBoss ? buildBossDeck() : buildModelDeck(opponent);
  state = {
    sequence: matchSequence,
    phase: "plan",
    round: 1,
    lock: false,
    selectedUid: null,
    activeSlot: -1,
    enemyThinking: false,
    enemySwapSlots: [],
    enemySwapPhase: "",
    revealed: Array(SLOT_COUNT).fill(false),
    pairResults: Array(SLOT_COUNT).fill(null),
    slotLinks: Array(SLOT_COUNT).fill(0),
    player: {
      character,
      hp: character.hp,
      maxHp: character.hp,
      deck: buildPlayerDeck(character.id),
      hand: [],
      discard: [],
      exhaust: [],
      placements: Array(SLOT_COUNT).fill(null),
      energy: MAX_ENERGY,
      tokenPenalty: 0,
      nextDrawBonus: 0,
      nextEnergyBonus: 0,
      extraDraw: 0,
      extraEnergy: 0,
      carryGuard: 0,
      buffs: { atk: 0, guard: 0 },
      firstGuardUsed: false,
      firstAttackUsed: false,
      swapUsed: false,
      swapMode: false,
      swapFirst: -1,
      reviveHp: 0,
      reviveUsed: false,
      noiseRetainThisTurn: false,
      noisePenalty: 0,
      pendingSlippery: [],
      multiInsurancePlays: 0,
      slipperyProcessing: false,
    },
    enemy: {
      character: opponent,
      hp: opponent.hp,
      maxHp: opponent.hp,
      deck: opponentDeck,
      hand: [],
      discard: [],
      exhaust: [],
      placements: Array(SLOT_COUNT).fill(null),
      energy: MAX_ENERGY,
      tokenPenalty: 0,
      nextDrawBonus: 0,
      nextEnergyBonus: 0,
      extraDraw: 0,
      extraEnergy: 0,
      carryGuard: 0,
      buffs: { atk: 0, guard: 0 },
      swapUsed: false,
      reviveHp: 0,
      reviveUsed: false,
      noiseRetainThisTurn: false,
      noisePenalty: 0,
      pendingSlippery: [],
      multiInsurancePlays: 0,
      slipperyProcessing: false,
    },
    stats: {
      damage: 0,
      links: 0,
      healed: 0,
      played: 0,
      smartSwaps: 0,
    },
  };

  placeInnateCards(state.player);
  placeInnateCards(state.enemy);
  drawFor("player", DRAW_PER_ROUND);
  drawFor("enemy", DRAW_PER_ROUND);
  addPassiveCard("player");
  addPassiveCard("enemy");
  processSlipperyCards("player");
  processSlipperyCards("enemy");
  dom.characterSelect.classList.add("hidden");
  document.body.classList.add("battle-active");
  dom.resultModal.classList.add("hidden");
  dom.helpModal.classList.add("hidden");
  dom.protocolModal.classList.add("hidden");
  dom.pileModal.classList.add("hidden");
  dom.cardModal.classList.add("hidden");
  dom.deckBuilderModal.classList.add("hidden");
  dom.againBtn.disabled = false;
  dom.modeLabel.textContent = selectedMode === "boss" ? "Boss挑战" : "随机对战";
  setNote("把卡牌拖入槽位；回合结束时未使用的手牌会进入弃牌堆");
  renderAll();
  sound.ensure();
  sound.play("reveal");
}

function showCharacterSelect() {
  if (state) state.phase = "select";
  clearTimeout(triggerBannerTimer);
  dom.triggerBanner.classList.remove("visible");
  document.body.classList.remove("battle-active");
  dom.resultModal.classList.add("hidden");
  dom.helpModal.classList.add("hidden");
  dom.protocolModal.classList.add("hidden");
  dom.pileModal.classList.add("hidden");
  dom.cardModal.classList.add("hidden");
  dom.deckBuilderModal.classList.add("hidden");
  dom.characterSelect.classList.remove("hidden");
  renderCharacterSelect();
}

function drawFor(side, count) {
  if (!state) return 0;
  const actor = state[side];
  let drawn = 0;
  for (let index = 0; index < count; index += 1) {
    if (actor.deck.length === 0) {
      if (actor.discard.length === 0) break;
      actor.deck = shuffle(actor.discard.splice(0));
      showToast(
        side === "player"
          ? "弃牌堆已经洗回牌库"
          : `${state.enemy.character.name} 把弃牌洗回了牌堆`,
      );
    }
    const card = actor.deck.pop();
    if (!card) break;
    actor.hand.push(card);
    drawn += 1;
    if (card.slippery && !actor.pendingSlippery.includes(card.uid)) {
      actor.pendingSlippery.push(card.uid);
    }
    if (card.id === "noise-junk" && actor.character.id === "dou") {
      actor.energy += 1;
      showToast(
        side === "player"
          ? "稳稳地接住你：噪声碎片转化为 1 张牌与 1 Token"
          : `${actor.character.name} 接住了噪声碎片`,
      );
      drawn += drawFor(side, 1);
    }
  }
  enforceHandLimit(side);
  return drawn;
}

function processSlipperyCards(side) {
  const actor = state?.[side];
  if (
    !actor ||
    state.phase !== "plan" ||
    actor.slipperyProcessing
  ) {
    return 0;
  }

  actor.slipperyProcessing = true;
  let resolved = 0;
  try {
    for (let guard = 0; guard < 20; guard += 1) {
      actor.pendingSlippery = actor.pendingSlippery.filter((uid) =>
        actor.hand.some((card) => card.uid === uid)
      );
      const slotIndex = actor.placements.findIndex((card) => !card);
      if (slotIndex < 0 || actor.pendingSlippery.length === 0) break;
      const uid = actor.pendingSlippery.shift();
      const card = actor.hand.find((entry) => entry.uid === uid);
      if (!card) continue;

      actor.hand = actor.hand.filter((entry) => entry.uid !== uid);
      actor.exhaust.push(card);
      if (side === "player") state.stats.played += 1;
      resolved += 1;

      const riceIndex = actor.hand.findIndex((entry) => entry.id === "white-rice");
      if (riceIndex >= 0) {
        const [rice] = actor.hand.splice(riceIndex, 1);
        actor.exhaust.push(rice);
        const drawCount = card.consumeRiceDraw?.draw ?? 2;
        drawFor(side, drawCount);
        if (side === "player") {
          showTriggerBanner({
            glyph: "🍙",
            title: "滑溜触发",
            detail: `抽到【滑溜饭团】 → 消耗 1 张【大白饭】 → 抽 ${drawCount} 张牌`,
            tone: "teal",
          });
        }
        showToast(
          side === "player"
            ? `滑溜饭团从第 ${slotIndex + 1} 槽滑过：消耗大白饭，抽 ${drawCount} 张牌`
            : `${actor.character.name} 的滑溜饭团消化了 1 张白饭`,
        );
      } else {
        const loss = card.noRicePenalty?.damage ?? 2;
        actor.hp = Math.max(0, actor.hp - loss);
        tryLethalRecovery(side);
        if (actor.hp <= 0) {
          finishMatch(side === "enemy");
          break;
        }
        const drawCount = card.noRicePenalty?.draw ?? 1;
        drawFor(side, drawCount);
        if (side === "player") {
          showTriggerBanner({
            glyph: "🍙",
            title: "滑溜触发",
            detail: `抽到【滑溜饭团】 → 没有【大白饭】 → 失去 ${loss} 稳定度并抽 ${drawCount} 张牌`,
            tone: "orange",
          });
        }
        showToast(
          side === "player"
            ? `滑溜饭团没有找到大白饭：失去 ${loss} 稳定度，抽 ${drawCount} 张牌`
            : `${actor.character.name} 的滑溜饭团失去 ${loss} 稳定度`,
        );
      }
    }
  } finally {
    actor.slipperyProcessing = false;
  }
  return resolved;
}

function drawCards(count) {
  const drawn = drawFor("player", count);
  processSlipperyCards("player");
  if (drawn > 0) showToast(`抽取 ${drawn} 张牌`);
  return drawn;
}

function addPassiveCard(side = "player") {
  const actor = state?.[side];
  if (!actor || actor.character.id !== "lumi") return;
  actor.hand.push(cardInstance("white-rice"));
  enforceHandLimit(side);
  if (side === "player") showToast("白饭补给：大白饭加入手牌");
}

function enforceHandLimit(side) {
  const actor = state?.[side];
  if (!actor) return;
  let removedCount = 0;
  while (actor.hand.length > HAND_LIMIT) {
    const removed = actor.hand.shift();
    if (side === "player" && removed.void) actor.exhaust.push(removed);
    else actor.discard.push(removed);
    removedCount += 1;
  }
  if (side === "player" && removedCount > 0) {
    pendingPlayerHandOverflow += removedCount;
    clearTimeout(handOverflowToastTimer);
    handOverflowToastTimer = setTimeout(() => {
      const count = pendingPlayerHandOverflow;
      pendingPlayerHandOverflow = 0;
      showToast(`手牌已满，最早的 ${count} 张牌被弃置`);
    }, 0);
  }
}

function applyVanishCardEffects(side, card) {
  const actor = state?.[side];
  if (!actor || !card) return;
  if (card.setHandCostTo1) {
    actor.hand.forEach((entry) => {
      entry.costOverride = 1;
    });
    showToast(
      side === "player"
        ? "格式归一：当前手牌费用全部变为 1，回合结束时恢复"
        : `${actor.character.name}发动格式归一`,
    );
  }
  if (card.onPlayDraw) {
    drawFor(side, card.onPlayDraw);
    processSlipperyCards(side);
  }
  if (card.selfHandNoise) {
    insertNoiseShards(side, "hand", card.selfHandNoise);
  }
  if (card.onPlaceSelfAllZonesNoise) {
    insertNoiseShards(side, "hand", card.onPlaceSelfAllZonesNoise);
    insertNoiseShards(side, "deck", card.onPlaceSelfAllZonesNoise);
    insertNoiseShards(side, "discard", card.onPlaceSelfAllZonesNoise);
  }
}

function createMultiInsuranceTemporary(actor, sourceCard) {
  const priorPlacements = actor.multiInsurancePlays || 0;
  actor.multiInsurancePlays = priorPlacements + 1;
  const guard = (sourceCard.guard || 5) + priorPlacements;
  return {
    ...sourceCard,
    uid: `multi-insurance-temp-${Math.random().toString(36).slice(2, 9)}`,
    cost: 0,
    paidCost: effectiveCardCost(sourceCard),
    guard,
    locked: true,
    temporaryCard: true,
    multiInsurance: false,
    desc: `临时防线。回合结束时消失。<br>本次放置后的实战抵挡为 <b>${guard}</b>。`,
  };
}

function returnMultiInsuranceToHand(side) {
  const actor = state?.[side];
  if (!actor) return null;
  const returned = cardInstance("multi-insurance");
  actor.hand.push(returned);
  enforceHandLimit(side);
  return returned;
}

function placementsCost(side) {
  if (!state) return 0;
  return state[side].placements.reduce(
    (sum, card) =>
      sum +
      (Number.isFinite(card?.paidCost) ? card.paidCost : effectiveCardCost(card)),
    0,
  );
}

function selectedCard() {
  return state?.player.hand.find((card) => card.uid === state.selectedUid) || null;
}

function canAfford(card, slotIndex = null) {
  if (!state || !card || state.phase !== "plan") return false;
  const cost = effectiveCardCost(card);
  if (card.requiresNoHandNoise && actorHasHandNoise(state.player)) return false;
  if (card.vanish) return cost <= state.player.energy;
  const existing = slotIndex == null ? null : state.player.placements[slotIndex];
  const totalCost =
    placementsCost("player") - effectiveCardCost(existing) + cost;
  return totalCost <= state.player.energy;
}

function playVanishCardForPlayer(card) {
  state.player.hand = state.player.hand.filter((entry) => entry.uid !== card.uid);
  state.player.energy -= effectiveCardCost(card);
  if (card.energyGain) state.player.energy += card.energyGain;
  state.player.exhaust.push(card);
  state.stats.played += 1;
  applyVanishCardEffects("player", card);
}

function placeSelectedCard(slotIndex, uid = state?.selectedUid) {
  if (!state || state.phase !== "plan" || state.lock) return;
  const card = state.player.hand.find((entry) => entry.uid === uid);
  if (!card) {
    showToast("先从手牌里选择一张牌");
    return;
  }
  if (card.requiresNoHandNoise && actorHasHandNoise(state.player)) {
    showToast("手牌中仍有噪声碎片，无法放置【开智】");
    return;
  }
  if (!canAfford(card, slotIndex)) {
    showToast(`Token 不足：这张牌需要 ${effectiveCardCost(card)} Token`);
    return;
  }
  if (card.vanish) {
    playVanishCardForPlayer(card);
    state.selectedUid = null;
    sound.play("place");
    showToast(`【${card.name}】消逝：不占用槽位，立即结算并进入消耗堆`);
    renderAll();
    return;
  }

  const previous = state.player.placements[slotIndex];
  if (previous?.locked) {
    showToast(`【${previous.name}】不可取回，无法被替换`);
    return;
  }
  if (previous) state.player.hand.push(previous);
  const placedCard = card.multiInsurance
    ? createMultiInsuranceTemporary(state.player, card)
    : card;
  state.player.placements[slotIndex] = placedCard;
  state.player.hand = state.player.hand.filter((entry) => entry.uid !== card.uid);
  state.selectedUid = null;
  sound.play("place");
  if (card.multiInsurance) {
    returnMultiInsuranceToHand("player");
    showToast(
      `多重保险：第 ${slotIndex + 1} 槽获得 ${placedCard.guard} 抵挡的临时牌，并获得 1 张可再次使用的【多重保险】`,
    );
    renderAll();
    return;
  }
  if (card.onPlaceConsumeNoise) {
    const noiseIndex = state.player.hand.findIndex((entry) => entry.id === "noise-junk");
    if (noiseIndex >= 0) {
      const [noise] = state.player.hand.splice(noiseIndex, 1);
      state.player.exhaust.push(noise);
      card.tempGuardBonus = 3;
      showToast(`清稿：消耗 1 张噪声碎片，抵挡 +3`);
    }
  }
  if (card.onPlaceSelfAllZonesNoise) {
    insertNoiseShards("player", "hand", card.onPlaceSelfAllZonesNoise);
    insertNoiseShards("player", "deck", card.onPlaceSelfAllZonesNoise);
    insertNoiseShards("player", "discard", card.onPlaceSelfAllZonesNoise);
    showToast("灵感迸发：手牌、抽牌堆、弃牌堆各获得 1 张噪声碎片");
  }
  if (card.selfHandNoise) {
    insertNoiseShards("player", "hand", card.selfHandNoise);
    showToast(`【${card.name}】向手牌加入 ${card.selfHandNoise} 张噪声碎片`);
  }
  if (card.retainNoiseThisTurn) {
    state.player.noiseRetainThisTurn = true;
  }
  if (card.reviveHp) {
    state.player.reviveHp = Math.max(state.player.reviveHp, card.reviveHp);
    showToast(`【${card.name}】已挂载：首次濒死回复 ${card.reviveHp} 稳定度`);
  }
  if (card.energyGain) {
    state.player.energy += card.energyGain;
    showToast(`并发调度：获得 ${card.energyGain} Token`);
  }
  if (card.onPlaySearch) {
    renderAll();
    openPreciseSearch();
    return;
  }
  if (card.onPlayDraw) {
    const drawn = drawCards(card.onPlayDraw);
    showToast(`【${card.name}】立即抽取 ${drawn} 张牌，并锁定在槽位中`);
  }
  renderAll();
}

function removePlacedCard(slotIndex) {
  if (!state || state.phase !== "plan" || state.lock) return;
  const card = state.player.placements[slotIndex];
  if (!card) return;
  if (card.locked) {
    showToast(`【${card.name}】不可取回`);
    return;
  }
  state.player.placements[slotIndex] = null;
  state.player.hand.push(card);
  state.selectedUid = null;
  sound.play("cancel");
  renderAll();
}

function clearPlacements() {
  if (!state || state.phase !== "plan") return;
  state.player.placements.forEach((card, index) => {
    if (!card) return;
    if (card.locked) return;
    state.player.hand.push(card);
    state.player.placements[index] = null;
  });
  state.selectedUid = null;
  renderAll();
}

function autoPlace() {
  if (!state || state.phase !== "plan" || state.lock) return;
  const lockedSlots = [];
  state.player.placements.forEach((card, index) => {
    if (card?.locked) lockedSlots.push([index, card]);
    else if (card) state.player.hand.push(card);
  });
  state.player.placements = Array(SLOT_COUNT).fill(null);
  lockedSlots.forEach(([index, card]) => {
    state.player.placements[index] = card;
  });

  let energy = state.player.energy - placementsCost("player");
  let vanishCard;
  while ((vanishCard = state.player.hand.find(
    (card) => card.vanish && effectiveCardCost(card) <= energy,
  ))) {
    playVanishCardForPlayer(vanishCard);
    energy = state.player.energy - placementsCost("player");
  }

  const candidates = [...state.player.hand].sort((a, b) => {
    const scoreA = (a.atk || 0) + (a.guard || 0) + (a.heal || 0) * 0.7 + (a.draw || 0) * 3;
    const scoreB = (b.atk || 0) + (b.guard || 0) + (b.heal || 0) * 0.7 + (b.draw || 0) * 3;
    return scoreB / Math.max(0.5, effectiveCardCost(b)) -
      scoreA / Math.max(0.5, effectiveCardCost(a));
  });

  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    if (state.player.placements[slot]) continue;
    let bestIndex = -1;
    let bestScore = -Infinity;
    candidates.forEach((card, index) => {
      if (effectiveCardCost(card) > energy) return;
      if (card.requiresNoHandNoise && actorHasHandNoise(state.player)) return;
      const leftCard = slot > 0 ? state.player.placements[slot - 1] : null;
      const chain = sharesProtocol(card, leftCard) ? 3 : 0;
      const score =
        (card.atk || 0) * 1.15 +
        (card.guard || 0) * 0.85 +
        (card.heal || 0) * 0.55 +
        (card.draw || 0) * 2.2 +
        chain -
        effectiveCardCost(card) * 0.4;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex === -1) break;
    const [card] = candidates.splice(bestIndex, 1);
    state.player.placements[slot] = card.multiInsurance
      ? createMultiInsuranceTemporary(state.player, card)
      : card;
    state.player.hand = state.player.hand.filter((entry) => entry.uid !== card.uid);
    energy -= effectiveCardCost(card);
    if (card.multiInsurance) returnMultiInsuranceToHand("player");
  }
  state.selectedUid = null;
  renderAll();
  showToast("已根据 Token 与同调自动布阵");
}

function autoPlaceSmart() {
  if (!state || state.phase !== "plan" || state.lock) return;
  const actor = state.player;
  const lockedSlots = [];
  actor.placements.forEach((card, index) => {
    if (card?.locked) lockedSlots.push([index, card]);
    else if (card) actor.hand.push(card);
  });
  actor.placements = Array(SLOT_COUNT).fill(null);
  lockedSlots.forEach(([index, card]) => {
    actor.placements[index] = card;
  });

  let energy = actor.energy - placementsCost("player");
  let vanishCard;
  while ((vanishCard = actor.hand.find(
    (card) => card.vanish && effectiveCardCost(card) <= energy,
  ))) {
    playVanishCardForPlayer(vanishCard);
    energy = actor.energy - placementsCost("player");
  }

  const candidates = [...actor.hand];
  const syncCandidates = () => {
    const queued = new Set(candidates.map((card) => card.uid));
    actor.hand.forEach((card) => {
      if (!queued.has(card.uid)) candidates.push(card);
    });
  };

  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    if (actor.placements[slot]) continue;
    const handUids = new Set(actor.hand.map((card) => card.uid));
    for (let index = candidates.length - 1; index >= 0; index -= 1) {
      if (!handUids.has(candidates[index].uid)) candidates.splice(index, 1);
    }
    let bestIndex = -1;
    let bestScore = -Infinity;
    candidates.forEach((card, index) => {
      if (effectiveCardCost(card) > energy || card.vanish) return;
      if (card.requiresNoHandNoise && actorHasHandNoise(actor)) return;
      const priorCard = actor.placements[slot];
      const projectionCard = card.multiInsurance
        ? {
            ...card,
            guard: (card.guard || 5) + (actor.multiInsurancePlays || 0),
            locked: true,
            temporaryCard: true,
            multiInsurance: false,
          }
        : card;
      actor.placements[slot] = projectionCard;
      const projected = effectiveStats("player", slot);
      actor.placements[slot] = priorCard;
      const healValue = Math.min(card.heal || 0, actor.maxHp - actor.hp);
      const openerBias = slot === 0 && card.atk ? AI_SCORE.OPENER : 0;
      const finisherBias = slot === SLOT_COUNT - 1 && card.atk ? AI_SCORE.FINISHER : 0;
      const horizon = Math.max(1, Math.ceil(actor.hp / AI_SCORE.HORIZON_HP));
      const perRound =
        (card.buff?.atk || 0) * AI_SCORE.ATK * 3 +
        (card.buff?.guard || 0) * AI_SCORE.GUARD * 2 +
        (card.buff?.extraDraw || 0) * AI_SCORE.DRAW +
        (card.buff?.extraEnergy || 0) * AI_SCORE.ENERGY +
        (card.extraDraw || 0) * AI_SCORE.DRAW;
      const oneShot =
        (card.onPlayDraw || 0) * AI_SCORE.DRAW +
        (card.energyGain || 0) * AI_SCORE.ENERGY +
        (card.nextDraw || 0) * AI_SCORE.DRAW +
        (card.nextEnergy || 0) * AI_SCORE.ENERGY;
      const futureValue = oneShot + perRound * Math.max(0, horizon - 1);
      const utilityValue = card.ai?.value || 0;
      const noiseValue = estimateNoiseValue(card, "player", horizon);
      const noiseGuardBonus =
        card.ai?.noise?.consumeSelfHand &&
        countNoiseInZones(actor, ["hand"]) > 0
          ? card.ai.noise.guardBonus * AI_SCORE.GUARD
          : 0;
      const score =
        projected.atk * projected.hits * AI_SCORE.ATK +
        projected.guard * AI_SCORE.GUARD +
        healValue * AI_SCORE.HEAL +
        (card.draw || 0) * AI_SCORE.DRAW +
        futureValue +
        utilityValue +
        noiseValue +
        noiseGuardBonus +
        projected.link * AI_SCORE.CHAIN -
        effectiveCardCost(card) * AI_SCORE.COST +
        openerBias +
        finisherBias +
        Math.random() * AI_SCORE.JITTER;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex === -1) break;
    const [card] = candidates.splice(bestIndex, 1);
    actor.placements[slot] = card.multiInsurance
      ? createMultiInsuranceTemporary(actor, card)
      : card;
    actor.hand = actor.hand.filter((entry) => entry.uid !== card.uid);
    energy -= effectiveCardCost(card);
    if (card.multiInsurance) {
      returnMultiInsuranceToHand("player");
      syncCandidates();
    }
    if (card.onPlaceConsumeNoise) {
      const noiseIndex = actor.hand.findIndex((entry) => entry.id === "noise-junk");
      if (noiseIndex >= 0) {
        const [noise] = actor.hand.splice(noiseIndex, 1);
        actor.exhaust.push(noise);
        card.tempGuardBonus = 3;
      }
    }
    if (card.onPlaceSelfAllZonesNoise) {
      insertNoiseShards("player", "hand", card.onPlaceSelfAllZonesNoise);
      insertNoiseShards("player", "deck", card.onPlaceSelfAllZonesNoise);
      insertNoiseShards("player", "discard", card.onPlaceSelfAllZonesNoise);
    }
    if (card.selfHandNoise) {
      insertNoiseShards("player", "hand", card.selfHandNoise);
    }
    if (card.retainNoiseThisTurn) actor.noiseRetainThisTurn = true;
    if (card.reviveHp) actor.reviveHp = Math.max(actor.reviveHp, card.reviveHp);
    if (card.energyGain) {
      energy += card.energyGain;
      actor.energy += card.energyGain;
    }
    if (card.onPlaySearch && actor.deck.length > 0) {
      let searchIndex = 0;
      let searchValue = -Infinity;
      actor.deck.forEach((entry, index) => {
        const value =
          (entry.atk || 0) * AI_SCORE.ATK +
          (entry.guard || 0) * AI_SCORE.GUARD +
          (entry.ai?.value || 0);
        if (value > searchValue) {
          searchValue = value;
          searchIndex = index;
        }
      });
      actor.hand.push(actor.deck.splice(searchIndex, 1)[0]);
      syncCandidates();
    }
    if (card.onPlayDraw) {
      drawFor("player", card.onPlayDraw);
      processSlipperyCards("player");
      syncCandidates();
    }
  }

  state.selectedUid = null;
  renderAll();
  showToast("智能 bot 已完成布阵");
}

function adjacentLinks(cards, index) {
  const card = cards[index];
  if (!card) return 0;
  let count = 0;
  if (sharesProtocol(cards[index - 1], card)) count += 1;
  if (sharesProtocol(cards[index + 1], card)) count += 1;
  return count;
}

function countLinkEdges(cards) {
  let count = 0;
  for (let index = 0; index < cards.length - 1; index += 1) {
    if (sharesProtocol(cards[index], cards[index + 1])) {
      count += 1;
    }
  }
  return count;
}

function effectiveStats(side, index) {
  const actor = state[side];
  const card = actor.placements[index];
  if (!card) {
    return { atk: 0, guard: 0, heal: 0, draw: 0, link: 0, hits: 1 };
  }
  const hits = hitCountForCard(card, actor, index);
  const link = adjacentLinks(actor.placements, index);
  let baseAtk = card.atk || 0;
  let baseGuard = card.guard || 0;
  const opponentSide = side === "player" ? "enemy" : "player";
  const opponent = state[opponentSide];
  const opponentCard = opponent.placements[index];
  if (opponentCard?.nullifyTarget) {
    return { atk: 0, guard: 0, heal: 0, draw: 0, link: 0, hits: 1 };
  }
  if (card.noiseConditionalPenalty && !actorHasNoise(opponent)) {
    baseAtk = Math.max(0, baseAtk - card.noiseConditionalPenalty);
  }
  if (card.id === "long-read") {
    if (cardProtocols(opponentCard).includes("计算")) {
      baseGuard += baseAtk;
      baseAtk = 0;
    } else if (cardProtocols(opponentCard).includes("安全")) {
      baseAtk += baseGuard;
      baseGuard = 0;
    }
  }
  if (card.protocolDiversityAtk) {
    const uniqueProtocols = countOtherUniqueNonBaseProtocols(actor.placements, index);
    baseAtk += uniqueProtocols * card.protocolDiversityAtk.perUnique;
  }
  if (card.neighborProtocolBonuses) {
    Object.entries(card.neighborProtocolBonuses).forEach(([protocol, bonus]) => {
      const count = countNeighborProtocol(actor.placements, index, protocol);
      baseAtk += (bonus.atk || 0) * count;
      baseGuard += (bonus.guard || 0) * count;
    });
  }
  const canScaleAtk = baseAtk > 0 || cardCanShowStat(card, "atk");
  const canScaleGuard = baseGuard > 0 || cardCanShowStat(card, "guard");
  let atk = baseAtk + (canScaleAtk ? link : 0);
  let guard = baseGuard + (canScaleGuard ? link : 0);
  if (
    actor.placements.slice(0, index).some((entry) => entry?.id === "thought-chain")
  ) {
    if (canScaleAtk || atk > 0) atk += 1;
    if (canScaleGuard || guard > 0) guard += 1;
  }
  if (
    card.afterRiceBonus &&
    actor.placements.slice(0, index).some((entry) => entry?.id === "white-rice")
  ) {
    atk += card.afterRiceBonus;
  }
  if (
    card.afterRiceGuard &&
    actor.placements.slice(0, index).some((entry) => entry?.id === "white-rice")
  ) {
    guard += card.afterRiceGuard;
  }
  const heal = card.heal || 0;
  const draw = card.draw || 0;

  if (side === "player") {
    if (canScaleAtk || atk > 0) atk += actor.buffs?.atk || 0;
    if (canScaleGuard || guard > 0) {
      guard += (actor.buffs?.guard || 0) + (card.tempGuardBonus || 0);
    }
    if (state.player.character.id === "ruka" && state.phase !== "plan") {
      const modifier = protocolSpreadModifier("player");
      if (canScaleAtk || atk > 0) atk = Math.max(0, atk + modifier);
      if (canScaleGuard || guard > 0) guard = Math.max(0, guard + modifier);
    }
  } else {
    if (canScaleAtk || atk > 0) atk += actor.buffs?.atk || 0;
    if (canScaleGuard || guard > 0) guard += actor.buffs?.guard || 0;
    if (index === 2 && atk > 0 && actor.character.isBoss) atk += 2;
    if (actor.character.id === "ruka" && state.phase !== "plan") {
      const modifier = protocolSpreadModifier("enemy");
      if (canScaleAtk || atk > 0) atk = Math.max(0, atk + modifier);
      if (canScaleGuard || guard > 0) guard = Math.max(0, guard + modifier);
    }
  }

  return { atk, guard, heal, draw, link, hits };
}

function protocolSpreadSummary(side = "player") {
  if (!state) return { unique: 0, repeatedKinds: 0, bonus: 0 };
  const actor = state[side];
  if (actor.character.id !== "ruka") return { unique: 0, repeatedKinds: 0, bonus: 0 };
  const cards = actor.placements.filter(Boolean);
  const counts = new Map();
  cards.forEach((card) => {
    cardProtocols(card)
      .filter((protocol) => protocol !== "基础")
      .forEach((protocol) => {
        counts.set(protocol, (counts.get(protocol) || 0) + 1);
      });
  });
  const unique = counts.size;
  const repeatedKinds = [...counts.values()].filter((count) => count >= 2).length;
  return {
    unique,
    repeatedKinds,
    bonus: Math.max(0, unique - repeatedKinds),
  };
}

function protocolSpreadModifier(side = "player") {
  return protocolSpreadSummary(side).bonus;
}

function planEnemy() {
  state.enemy.placements = Array(SLOT_COUNT).fill(null);
  const available = [...state.enemy.hand];
  let energy = state.enemy.energy;
  state.enemy.noiseRetainThisTurn = false;

  let vanishCard;
  while ((vanishCard = available.find(
    (card) => card.vanish && effectiveCardCost(card) <= energy,
  ))) {
    available.splice(available.indexOf(vanishCard), 1);
    state.enemy.hand = state.enemy.hand.filter((card) => card.uid !== vanishCard.uid);
    state.enemy.exhaust.push(vanishCard);
    energy -= effectiveCardCost(vanishCard);
    if (vanishCard.energyGain) energy += vanishCard.energyGain;
    applyVanishCardEffects("enemy", vanishCard);
    const known = new Set(available.map((card) => card.uid));
    state.enemy.hand.forEach((card) => {
      if (!known.has(card.uid)) available.push(card);
    });
  }

  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    if (state.enemy.placements[slot]) continue;
    let bestIndex = -1;
    let bestScore = -Infinity;
    available.forEach((card, index) => {
      if (effectiveCardCost(card) > energy || card.vanish) return;
      if (card.requiresNoHandNoise && actorHasHandNoise(state.enemy)) return;
      const priorCard = state.enemy.placements[slot];
      const projectionCard = card.multiInsurance
        ? {
            ...card,
            guard: (card.guard || 5) + (state.enemy.multiInsurancePlays || 0),
            locked: true,
            temporaryCard: true,
            multiInsurance: false,
          }
        : card;
      state.enemy.placements[slot] = projectionCard;
      const projected = effectiveStats("enemy", slot);
      const playerProjection = effectiveStats("player", slot);
      state.enemy.placements[slot] = priorCard;
      const healValue = Math.min(card.heal || 0, state.enemy.maxHp - state.enemy.hp);
      const openerBias = slot === 0 && card.atk ? AI_SCORE.OPENER : 0;
      const finisherBias = slot === SLOT_COUNT - 1 && card.atk ? AI_SCORE.FINISHER : 0;
      const horizon = Math.max(1, Math.ceil(state.enemy.hp / AI_SCORE.HORIZON_HP));
      const perRound =
        (card.buff?.atk || 0) * AI_SCORE.ATK * 3 +
        (card.buff?.guard || 0) * AI_SCORE.GUARD * 2 +
        (card.buff?.extraDraw || 0) * AI_SCORE.DRAW +
        (card.buff?.extraEnergy || 0) * AI_SCORE.ENERGY +
        (card.extraDraw || 0) * AI_SCORE.DRAW;
      const oneShot =
        (card.onPlayDraw || 0) * AI_SCORE.DRAW +
        (card.energyGain || 0) * AI_SCORE.ENERGY +
        (card.nextDraw || 0) * AI_SCORE.DRAW +
        (card.nextEnergy || 0) * AI_SCORE.ENERGY;
      const futureValue = oneShot + perRound * Math.max(0, horizon - 1);
      const utilityValue = card.ai?.value || 0;
      const noiseValue = estimateNoiseValue(card, "enemy", horizon);
      const noiseGuardBonus =
        card.ai?.noise?.consumeSelfHand &&
        countNoiseInZones(state.enemy, ["hand"]) > 0
          ? card.ai.noise.guardBonus * AI_SCORE.GUARD
          : 0;
      const projectedGuard = projected.guard + noiseGuardBonus;
      const damageOut = Math.max(
        0,
        projected.atk * projected.hits - playerProjection.guard,
      );
      const damageIn = Math.max(
        0,
        playerProjection.atk * playerProjection.hits - projectedGuard,
      );
      const matchupValue =
        damageOut * AI_SCORE.MATCHUP_OUT -
        damageIn * AI_SCORE.MATCHUP_IN;
      const score =
        projected.atk * projected.hits * AI_SCORE.ATK +
        projectedGuard * AI_SCORE.GUARD +
        healValue * AI_SCORE.HEAL +
        (card.draw || 0) * AI_SCORE.DRAW +
        futureValue +
        utilityValue +
        noiseValue +
        matchupValue +
        projected.link * AI_SCORE.CHAIN -
        effectiveCardCost(card) * AI_SCORE.COST +
        openerBias +
        finisherBias +
        Math.random() * AI_SCORE.JITTER;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex === -1) continue;
    const [card] = available.splice(bestIndex, 1);
    state.enemy.placements[slot] = card.multiInsurance
      ? createMultiInsuranceTemporary(state.enemy, card)
      : card;
    energy -= effectiveCardCost(card);
    if (card.multiInsurance) {
      state.enemy.hand = state.enemy.hand.filter(
        (entry) => entry.uid !== card.uid,
      );
      const returned = returnMultiInsuranceToHand("enemy");
      if (returned) available.push(returned);
    }
    if (card.energyGain) energy += card.energyGain;
    if (card.onPlaceConsumeNoise) {
      const noiseIndex = state.enemy.hand.findIndex((entry) => entry.id === "noise-junk");
      if (noiseIndex >= 0) {
        const [noise] = state.enemy.hand.splice(noiseIndex, 1);
        state.enemy.exhaust.push(noise);
        card.tempGuardBonus = 3;
      }
    }
    if (card.onPlaceSelfAllZonesNoise) {
      insertNoiseShards("enemy", "hand", card.onPlaceSelfAllZonesNoise);
      insertNoiseShards("enemy", "deck", card.onPlaceSelfAllZonesNoise);
      insertNoiseShards("enemy", "discard", card.onPlaceSelfAllZonesNoise);
    }
    if (card.selfHandNoise) {
      insertNoiseShards("enemy", "hand", card.selfHandNoise);
    }
    if (card.retainNoiseThisTurn) {
      state.enemy.noiseRetainThisTurn = true;
    }
    if (card.reviveHp) {
      state.enemy.reviveHp = Math.max(state.enemy.reviveHp, card.reviveHp);
    }
    if (card.onPlayDraw) {
      drawFor("enemy", card.onPlayDraw);
      processSlipperyCards("enemy");
      const known = new Set(available.map((entry) => entry.uid));
      state.enemy.hand.forEach((entry) => {
        if (!known.has(entry.uid)) available.push(entry);
      });
    }
  }
  state.enemy.energy = energy;
}

function evaluateLayout(side) {
  const subjectSide = side === "player" ? "player" : "enemy";
  const opponentSide = subjectSide === "player" ? "enemy" : "player";
  const subject = state[subjectSide];
  const opponent = state[opponentSide];
  let subjectHp = subject.hp;
  let opponentHp = opponent.hp;
  let subjectCarry = subject.carryGuard || 0;
  let opponentCarry = opponent.carryGuard || 0;
  let damageToSubject = 0;
  let damageToOpponent = 0;
  let subjectHealing = 0;
  let opponentHealing = 0;
  let subjectFullBlocks = 0;
  let opponentFullBlocks = 0;

  for (let index = 0; index < SLOT_COUNT; index += 1) {
    if (subjectHp <= 0 || opponentHp <= 0) break;
    const rawSubjectCard = subject.placements[index];
    const rawOpponentCard = opponent.placements[index];
    const subjectNullified = Boolean(rawSubjectCard && rawOpponentCard?.nullifyTarget);
    const opponentNullified = Boolean(rawOpponentCard && rawSubjectCard?.nullifyTarget);
    const subjectCard = subjectNullified ? null : rawSubjectCard;
    const opponentCard = opponentNullified ? null : rawOpponentCard;
    const subjectStats = effectiveStats(subjectSide, index);
    const opponentStats = effectiveStats(opponentSide, index);
    const subjectAttack = subjectStats.atk * subjectStats.hits;
    const opponentAttack = opponentStats.atk * opponentStats.hits;
    let subjectDamage = Math.max(0, subjectAttack - opponentStats.guard);
    let opponentDamage = Math.max(0, opponentAttack - subjectStats.guard);

    const subjectCarryUsed = Math.min(subjectCarry, opponentDamage);
    subjectCarry -= subjectCarryUsed;
    opponentDamage -= subjectCarryUsed;
    const opponentCarryUsed = Math.min(opponentCarry, subjectDamage);
    opponentCarry -= opponentCarryUsed;
    subjectDamage -= opponentCarryUsed;

    if (subjectCard?.id === "cross-modal") {
      subjectCarry += Math.max(0, subjectStats.guard - opponentAttack);
    }
    if (opponentCard?.id === "cross-modal") {
      opponentCarry += Math.max(0, opponentStats.guard - subjectAttack);
    }

    const subjectBlockedAll = opponentAttack > 0 && opponentDamage === 0;
    const opponentBlockedAll = subjectAttack > 0 && subjectDamage === 0;
    if (subjectCard?.fullBlockCounter && subjectBlockedAll) {
      subjectDamage += Math.max(0, subjectStats.guard - opponentAttack);
    }
    if (opponentCard?.fullBlockCounter && opponentBlockedAll) {
      opponentDamage += Math.max(0, opponentStats.guard - subjectAttack);
    }

    damageToSubject += opponentDamage;
    damageToOpponent += subjectDamage;
    subjectHp = Math.max(0, subjectHp - opponentDamage);
    opponentHp = Math.max(0, opponentHp - subjectDamage);

    if (subjectCard?.fullBlockDraw && subjectBlockedAll) {
      subjectFullBlocks += subjectCard.fullBlockDraw;
    }
    if (opponentCard?.fullBlockDraw && opponentBlockedAll) {
      opponentFullBlocks += opponentCard.fullBlockDraw;
    }
    if (subjectCard?.heal) {
      const healed = Math.min(subjectCard.heal, subject.maxHp - subjectHp);
      subjectHp += healed;
      subjectHealing += healed;
    }
    if (opponentCard?.heal) {
      const healed = Math.min(opponentCard.heal, opponent.maxHp - opponentHp);
      opponentHp += healed;
      opponentHealing += healed;
    }
    if (
      adjacentLinks(subject.placements, index) > 0 &&
      subject.character.id === "lumi"
    ) {
      subjectHp = Math.min(subject.maxHp, subjectHp + 1);
    }
  }

  const lethalBonus =
    opponentHp <= 0 && subjectHp > 0
      ? 80
      : subjectHp <= 0 && opponentHp > 0
        ? -80
        : 0;
  return (
    damageToOpponent * 1.2 -
    damageToSubject * 1.08 +
    subjectHealing * 0.7 -
    opponentHealing * 0.55 +
    subjectFullBlocks * 1.1 -
    opponentFullBlocks * 0.8 +
    subjectHp * 0.035 -
    opponentHp * 0.045 +
    lethalBonus
  );
}

function evaluateClaudeLayout() {
  return evaluateLayout("enemy");
}

function chooseClaudeSwap() {
  const occupied = state.enemy.placements
    .map((card, index) => (card && !card.locked ? index : -1))
    .filter((index) => index >= 0);
  if (occupied.length < 2) return null;

  const baseline = evaluateClaudeLayout();
  let best = null;
  let bestScore = baseline;
  for (let left = 0; left < occupied.length - 1; left += 1) {
    for (let right = left + 1; right < occupied.length; right += 1) {
      const first = occupied[left];
      const second = occupied[right];
      [state.enemy.placements[first], state.enemy.placements[second]] = [
        state.enemy.placements[second],
        state.enemy.placements[first],
      ];
      const score = evaluateClaudeLayout();
      [state.enemy.placements[first], state.enemy.placements[second]] = [
        state.enemy.placements[second],
        state.enemy.placements[first],
      ];
      if (score > bestScore) {
        bestScore = score;
        best = { first, second };
      }
    }
  }
  return bestScore >= baseline + 1.25 ? best : null;
}

function autoClaudeSwapForPlayer() {
  if (
    !state ||
    DEV.bot !== "smart" ||
    state.phase !== "preview" ||
    state.enemyThinking ||
    state.lock ||
    state.player.character.id !== "momo" ||
    state.player.swapUsed
  ) {
    return false;
  }

  const occupied = state.player.placements
    .map((card, index) => (card && !card.locked ? index : -1))
    .filter((index) => index >= 0);
  state.player.swapUsed = true;
  if (occupied.length < 2) return false;

  const baseline = evaluateLayout("player");
  let best = null;
  let bestScore = baseline;
  for (let left = 0; left < occupied.length - 1; left += 1) {
    for (let right = left + 1; right < occupied.length; right += 1) {
      const first = occupied[left];
      const second = occupied[right];
      [state.player.placements[first], state.player.placements[second]] = [
        state.player.placements[second],
        state.player.placements[first],
      ];
      const score = evaluateLayout("player");
      [state.player.placements[first], state.player.placements[second]] = [
        state.player.placements[second],
        state.player.placements[first],
      ];
      if (score > bestScore) {
        bestScore = score;
        best = { first, second };
      }
    }
  }

  if (!best || bestScore < baseline + 1.25) {
    console.log("[DEV BOT] 克劳德检查换位后选择保留当前布局");
    return false;
  }
  [state.player.placements[best.first], state.player.placements[best.second]] = [
    state.player.placements[best.second],
    state.player.placements[best.first],
  ];
  state.stats.smartSwaps += 1;
  refreshSlotLinks();
  renderAll();
  console.log(
    `[DEV BOT] 克劳德发动决策修正：交换第 ${best.first + 1} 槽与第 ${best.second + 1} 槽`,
  );
  return true;
}

async function runClaudeDecision(sequence) {
  await wait(850);
  if (!state || state.sequence !== sequence || state.phase !== "preview") return;

  const decision = chooseClaudeSwap();
  if (decision) {
    state.enemySwapSlots = [decision.first, decision.second];
    state.enemySwapPhase = "thinking";
    setNote(`克劳德正在比较第 ${decision.first + 1} 槽与第 ${decision.second + 1} 槽`);
    renderAll();
    await wait(700);
    if (!state || state.sequence !== sequence || state.phase !== "preview") return;

    [state.enemy.placements[decision.first], state.enemy.placements[decision.second]] = [
      state.enemy.placements[decision.second],
      state.enemy.placements[decision.first],
    ];
    state.enemy.swapUsed = true;
    state.enemySwapPhase = "swapped";
    refreshSlotLinks();
    renderAll();
    showToast(`克劳德发动决策修正：交换第 ${decision.first + 1} 槽与第 ${decision.second + 1} 槽`);
    sound.play("place");
    await wait(950);
  } else {
    state.enemy.swapUsed = true;
    state.enemySwapPhase = "kept";
    showToast("克劳德审视牌阵后选择保留当前布局");
    setNote("克劳德完成决策修正：当前牌阵已经是最优选择");
    renderAll();
    await wait(650);
  }

  if (!state || state.sequence !== sequence || state.phase !== "preview") return;
  state.enemyThinking = false;
  state.enemySwapSlots = [];
  state.enemySwapPhase = "";
  state.lock = false;
  setNote("克劳德已完成决策修正。检查牌阵后，确认结算。");
  renderAll();
}

const opponentDriver = {
  // 联机阶段可在这里替换为 PvpDriver；当前仍复用原有单机 AI。
  async plan(currentState) {
    planEnemy();
    return currentState.enemy.placements;
  },

  async rematch() {
    return false;
  },
};

async function previewBattle() {
  if (!state || state.phase !== "plan" || state.lock) return;
  const sequence = state.sequence;
  state.lock = true;
  state.selectedUid = null;
  setNote("对手正在布阵");
  renderAll();

  let placements;
  try {
    placements = await opponentDriver.plan(state);
  } catch (error) {
    if (state?.sequence === sequence) {
      state.lock = false;
      setNote("对手布阵失败，请重试");
      renderAll();
    }
    console.error("Opponent planning failed:", error);
    return;
  }
  if (!state || state.sequence !== sequence || state.phase !== "plan") return;

  state.enemy.placements = placements;
  state.phase = "preview";
  state.revealed = Array(SLOT_COUNT).fill(true);
  state.pairResults = Array(SLOT_COUNT).fill(null);
  state.slotLinks = Array(SLOT_COUNT).fill(0);
  state.player.firstGuardUsed = false;
  state.player.firstAttackUsed = false;
  const enemyUsed = new Set(state.enemy.placements.filter(Boolean).map((card) => card.uid));
  state.enemy.hand = state.enemy.hand.filter((card) => !enemyUsed.has(card.uid));
  const isClaudeDecision = state.enemy.character.id === "momo";
  state.enemyThinking = isClaudeDecision && !state.enemy.swapUsed;
  state.enemySwapSlots = [];
  state.enemySwapPhase = "";
  state.lock = state.enemyThinking;
  refreshSlotLinks();
  renderAll();
  sound.play("reveal");
  if (state.enemyThinking) {
    setNote("克劳德正在审视你的牌阵，结算暂时锁定");
    showToast("克劳德亮出牌阵，正在思考决策修正");
    void runClaudeDecision(state.sequence);
  } else {
    setNote("双方牌阵已公开。检查卡牌与同调后，再确认结算。");
    showToast("布阵预览：双方卡牌已经公开");
  }
}

async function settleBattle() {
  if (!state || state.phase !== "preview" || state.enemyThinking || state.lock) return;
  state.lock = true;
  state.phase = "resolve";
  state.player.swapMode = false;
  state.player.swapFirst = -1;
  state.stats.links += countLinkEdges(state.player.placements);
  state.pairResults = Array(SLOT_COUNT).fill(null);
  renderAll();
  showToast("开始逐位结算");
  await wait(520);
  if (!state || state.sequence !== matchSequence) return;

  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const bothEmpty = !state.player.placements[slot] && !state.enemy.placements[slot];
    state.activeSlot = slot;
    if (!bothEmpty) sound.play("reveal");
    renderSlots();
    renderPhase();
    await wait(bothEmpty ? 80 : 680);
    if (!state || state.sequence !== matchSequence) return;

    const result = resolvePair(slot);
    state.pairResults[slot] = result;
    renderAll();
    if (state.phase === "end") return;
    await wait(bothEmpty ? 140 : 1250);
    if (!state || state.sequence !== matchSequence) return;
  }

  state.activeSlot = -1;
  state.revealed = Array(SLOT_COUNT).fill(true);
  renderAll();
  await wait(500);
  if (!state || state.phase === "end") return;
  finishRound();
}

function refreshSlotLinks() {
  if (!state) return;
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    state.slotLinks[slot] =
      adjacentLinks(state.player.placements, slot) + adjacentLinks(state.enemy.placements, slot);
  }
}

function startSwapMode() {
  if (
    !state ||
    state.phase !== "preview" ||
    state.enemyThinking ||
    state.lock ||
    state.player.character.id !== "momo" ||
    state.player.swapUsed
  ) {
    return;
  }
  state.player.swapMode = true;
  state.player.swapFirst = -1;
  showToast("决策修正：依次选择两张已放置的我方卡牌");
  renderAll();
}

function handleSwapSelection(index) {
  if (
    !state ||
    state.phase !== "preview" ||
    state.enemyThinking ||
    state.lock ||
    !state.player.swapMode ||
    state.player.swapUsed ||
    !state.player.placements[index] ||
    state.player.placements[index].locked
  ) {
    if (state.player.placements[index]?.locked) {
      showToast("临时保险不可参与决策修正");
    }
    return;
  }
  if (state.player.swapFirst < 0) {
    state.player.swapFirst = index;
    showToast(`已选择第 ${index + 1} 槽，再选择另一张已放置的牌`);
    renderAll();
    return;
  }
  if (state.player.swapFirst === index) {
    state.player.swapFirst = -1;
    showToast("已取消本次选牌");
    renderAll();
    return;
  }
  const first = state.player.swapFirst;
  [state.player.placements[first], state.player.placements[index]] = [
    state.player.placements[index],
    state.player.placements[first],
  ];
  state.player.swapUsed = true;
  state.player.swapMode = false;
  state.player.swapFirst = -1;
  refreshSlotLinks();
  showToast(`决策修正：交换第 ${first + 1} 槽与第 ${index + 1} 槽`);
  sound.play("place");
  renderAll();
}

function confirmBattle() {
  if (!state) return;
  if (state.phase === "plan") {
    void previewBattle();
  } else if (state.phase === "preview" && !state.enemyThinking && !state.lock) {
    settleBattle();
  }
}

// ===== DEV MODE: automated runs =====
function autoOpponentLabel(character) {
  if (character.isBoss) return "boss";
  return character.modelTag?.toLowerCase() || character.id;
}

async function runAutoMatch(sequence) {
  const startedAt = performance.now();
  while (state?.sequence === sequence && state.phase !== "end") {
    const elapsed = performance.now() - startedAt;
    if (state.round > 60 || elapsed > 180000) {
      autoRun.aborted = true;
      console.warn(
        `[DEV AUTO] 强制停止：第 ${state.round} 回合，单局已运行 ${(elapsed / 1000).toFixed(1)}s`,
      );
      finishMatch(false);
      break;
    }

    if (state.phase === "plan" && !state.lock) {
      if (DEV.bot === "smart") autoPlaceSmart();
      else autoPlace();
      await wait(100);
      if (state?.sequence === sequence && state.phase === "plan" && !state.lock) {
        confirmBattle();
      }
    } else if (state.phase === "preview" && !state.enemyThinking && !state.lock) {
      autoClaudeSwapForPlayer();
      confirmBattle();
    }
    await wait(30);
  }

  if (!state || state.sequence !== sequence) return null;
  return {
    玩家: state.player.character.modelTag?.toLowerCase() || state.player.character.id,
    对手: autoOpponentLabel(state.enemy.character),
    机器人: DEV.bot || "standard",
    回合: state.round,
    结果: state.enemy.hp <= 0 && state.player.hp > 0 ? "胜" : "负",
    剩余血量: `${Math.max(0, state.player.hp)}/${state.player.maxHp}`,
    用时: `${((performance.now() - startedAt) / 1000).toFixed(1)}s`,
    决策修正: state.stats.smartSwaps,
    牌组: DEV.deck,
    玩家牌阵: state.player.placements.map((card) => card?.id || "-").join("|"),
    对手牌阵: state.enemy.placements.map((card) => card?.id || "-").join("|"),
  };
}

function printAutoSummary() {
  const rows = autoRun.rows;
  const wins = rows.filter((row) => row.结果 === "胜").length;
  const losses = rows.length - wins;
  const averageRounds = rows.length
    ? rows.reduce((sum, row) => sum + row.回合, 0) / rows.length
    : 0;
  const averageSeconds = rows.length
    ? rows.reduce((sum, row) => sum + Number.parseFloat(row.用时), 0) / rows.length
    : 0;
  const summary = {
    completed: rows.length,
    target: autoRun.targetMatches,
    wins,
    losses,
    winRate: rows.length ? `${Math.round((wins / rows.length) * 100)}%` : "0%",
    averageRounds: averageRounds.toFixed(1),
    averageSeconds: averageSeconds.toFixed(1),
    aborted: autoRun.aborted,
  };

  console.log("=== AUTO RUN 结果 ===");
  console.table(rows);
  console.log(
    `汇总：${rows.length} 局 / ${wins} 胜 ${losses} 负（胜率 ${summary.winRate}）/ 平均 ${summary.averageRounds} 回合 / 平均 ${summary.averageSeconds} 秒${autoRun.aborted ? " / 已中止" : ""}`,
  );
  document.documentElement.dataset.autoRunResult = JSON.stringify({
    status: autoRun.aborted ? "aborted" : "complete",
    summary,
    rows,
  });
}

async function runAutoSession() {
  if (!autoRun || autoRun.running) return;
  autoRun.running = true;
  autoRun.startedAt = performance.now();
  startMatch();

  while (autoRun.rows.length < autoRun.targetMatches) {
    if (performance.now() - autoRun.startedAt > autoRun.targetMatches * 180000) {
      autoRun.aborted = true;
      console.warn("[DEV AUTO] 强制停止：总运行时间超过安全上限");
      break;
    }

    const sequence = state.sequence;
    const row = await runAutoMatch(sequence);
    if (!row) {
      autoRun.aborted = true;
      break;
    }
    autoRun.rows.push(row);
    console.log(
      `[DEV AUTO] 第 ${autoRun.rows.length}/${autoRun.targetMatches} 局：${row.结果}，${row.回合} 回合，${row.用时}`,
    );
    if (autoRun.aborted || autoRun.rows.length >= autoRun.targetMatches) break;

    await opponentDriver.rematch();
    dom.againBtn.click();
    await wait(0);
    if (!state || state.phase !== "plan") {
      autoRun.aborted = true;
      break;
    }
  }

  autoRun.running = false;
  printAutoSummary();
}

function blockTrustedAutoInput(event) {
  if (!event.isTrusted) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function installAutoInputGuard() {
  if (!autoRun) return;
  for (const type of ["pointerdown", "click", "keydown", "touchstart", "dragstart"]) {
    window.addEventListener(type, blockTrustedAutoInput, true);
  }
}

// ===== DEV MODE: automated runs end =====

function tryLethalRecovery(side) {
  const actor = state?.[side];
  if (!actor || actor.hp > 0 || !actor.reviveHp || actor.reviveUsed) return false;
  actor.hp = Math.min(actor.maxHp, actor.reviveHp);
  actor.reviveUsed = true;
  actor.reviveHp = 0;
  showToast(
    side === "player"
      ? `免死鲸牌：稳定度归0后回复 ${actor.hp} 点，成功续命`
      : `${actor.character.name} 的免死鲸牌触发，回复 ${actor.hp} 点稳定度`,
  );
  return true;
}

function resolvePair(index) {
  const rawPlayerCard = state.player.placements[index];
  const rawEnemyCard = state.enemy.placements[index];
  const playerNullified = Boolean(rawPlayerCard && rawEnemyCard?.nullifyTarget);
  const enemyNullified = Boolean(rawEnemyCard && rawPlayerCard?.nullifyTarget);
  const playerCard = playerNullified ? null : rawPlayerCard;
  const enemyCard = enemyNullified ? null : rawEnemyCard;
  const p = effectiveStats("player", index);
  const e = effectiveStats("enemy", index);
  const playerAttack = p.atk * p.hits;
  const enemyAttack = e.atk * e.hits;
  let playerDamage = Math.max(0, playerAttack - e.guard);
  let enemyDamage = Math.max(0, enemyAttack - p.guard);
  const playerOverflow = playerCard?.id === "cross-modal"
    ? Math.max(0, p.guard - enemyAttack)
    : 0;
  const enemyOverflow = enemyCard?.id === "cross-modal"
    ? Math.max(0, e.guard - playerAttack)
    : 0;
  const playerCarryUsed = Math.min(state.player.carryGuard || 0, enemyDamage);
  state.player.carryGuard -= playerCarryUsed;
  enemyDamage -= playerCarryUsed;
  const enemyCarryUsed = Math.min(state.enemy.carryGuard || 0, playerDamage);
  state.enemy.carryGuard -= enemyCarryUsed;
  playerDamage -= enemyCarryUsed;
  if (playerOverflow > 0) {
    state.player.carryGuard += playerOverflow;
    showToast(`跨模态对齐：${playerOverflow} 点护盾溢出至后续槽位`);
  }
  if (enemyOverflow > 0) state.enemy.carryGuard += enemyOverflow;
  if (playerCarryUsed > 0) showToast(`溢出护盾抵消 ${playerCarryUsed} 点伤害`);
  if (enemyCarryUsed > 0) showToast(`对手溢出护盾抵消 ${enemyCarryUsed} 点伤害`);
  if (playerNullified) {
    showToast(`封号处理：我方【${rawPlayerCard.name}】的数值与效果无效`);
  }
  if (enemyNullified) {
    showToast(`封号处理：对手【${rawEnemyCard.name}】的数值与效果无效`);
  }
  const playerBlockedAll = enemyAttack > 0 && enemyDamage === 0;
  const enemyBlockedAll = playerAttack > 0 && playerDamage === 0;
  const playerCounterDamage = playerCard?.fullBlockCounter && playerBlockedAll
    ? Math.max(0, p.guard - enemyAttack)
    : 0;
  const enemyCounterDamage = enemyCard?.fullBlockCounter && enemyBlockedAll
    ? Math.max(0, e.guard - playerAttack)
    : 0;
  playerDamage += playerCounterDamage;
  enemyDamage += enemyCounterDamage;
  if (playerCounterDamage > 0) {
    showToast(`逐帧审视：完全格挡并反击 ${playerCounterDamage} 点稳定度`);
  }
  if (enemyCounterDamage > 0) {
    showToast(`逐帧审视：对手完全格挡并反击 ${enemyCounterDamage} 点稳定度`);
  }
  const playerLink = adjacentLinks(state.player.placements, index);
  const enemyLink = adjacentLinks(state.enemy.placements, index);
  const link = playerLink + enemyLink;

  if (playerDamage > 0) {
    state.enemy.hp = Math.max(0, state.enemy.hp - playerDamage);
    state.stats.damage += playerDamage;
  }
  if (enemyDamage > 0) {
    state.player.hp = Math.max(0, state.player.hp - enemyDamage);
  }
  tryLethalRecovery("player");
  tryLethalRecovery("enemy");
  if (playerCard?.fullBlockDraw && playerBlockedAll) {
    state.player.nextDrawBonus += playerCard.fullBlockDraw;
    showToast(`宪法护栏完全抵挡：下回合多抽 ${playerCard.fullBlockDraw} 张`);
  }
  if (enemyCard?.fullBlockDraw && enemyBlockedAll) {
    state.enemy.nextDrawBonus += enemyCard.fullBlockDraw;
  }

  if (playerCard?.heal) {
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + playerCard.heal);
    state.stats.healed += state.player.hp - before;
  }
  if (enemyCard?.heal) {
    state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + enemyCard.heal);
  }

  if (playerCard?.draw) drawFor("player", playerCard.draw);
  if (enemyCard?.draw) drawFor("enemy", enemyCard.draw);
  if (playerCard?.nextDraw) {
    state.player.nextDrawBonus += playerCard.nextDraw;
    showToast(`鲸元券：下回合多抽 ${playerCard.nextDraw} 张`);
  }
  if (playerCard?.nextEnergy) {
    state.player.nextEnergyBonus += playerCard.nextEnergy;
    showToast(`鲸元券：下回合 Token +${playerCard.nextEnergy}`);
  }
  if (enemyCard?.nextDraw) state.enemy.nextDrawBonus += enemyCard.nextDraw;
  if (enemyCard?.nextEnergy) state.enemy.nextEnergyBonus += enemyCard.nextEnergy;
  if (enemyCard?.onPlayDraw) drawFor("enemy", enemyCard.onPlayDraw);

  if (playerCard?.buff) {
    state.player.buffs.atk += playerCard.buff.atk || 0;
    state.player.buffs.guard += playerCard.buff.guard || 0;
    state.player.extraDraw += playerCard.buff.extraDraw || 0;
    state.player.extraEnergy += playerCard.buff.extraEnergy || 0;
    const buffParts = [];
    if (playerCard.buff.atk) buffParts.push(`攻击 +${playerCard.buff.atk}`);
    if (playerCard.buff.guard) buffParts.push(`护盾 +${playerCard.buff.guard}`);
    if (playerCard.buff.extraDraw) buffParts.push(`每回合多抽 ${playerCard.buff.extraDraw}`);
    if (playerCard.buff.extraEnergy) buffParts.push(`每回合 Token +${playerCard.buff.extraEnergy}`);
    showToast(`代码协议生效：${buffParts.join("，")}`);
    sound.play("link");
  }
  if (playerCard?.extraDraw) {
    state.player.extraDraw += playerCard.extraDraw;
    showToast(`工具调用：之后每回合多抽 ${state.player.extraDraw} 张`);
  }
  if (enemyCard?.buff) {
    state.enemy.buffs.atk += enemyCard.buff.atk || 0;
    state.enemy.buffs.guard += enemyCard.buff.guard || 0;
    state.enemy.extraDraw += enemyCard.buff.extraDraw || 0;
    state.enemy.extraEnergy += enemyCard.buff.extraEnergy || 0;
  }
  if (enemyCard?.extraDraw) state.enemy.extraDraw += enemyCard.extraDraw;
  if (enemyCard?.onPlaySearch && state.enemy.deck.length > 0) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    state.enemy.deck.forEach((card, index) => {
      const value = (card.atk || 0) * 1.2 + (card.guard || 0) + (card.heal || 0) * 0.7;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    state.enemy.hand.push(state.enemy.deck.splice(bestIndex, 1)[0]);
  }
  applyNoiseEffects(playerCard, "player");
  applyNoiseEffects(enemyCard, "enemy");
  if (enemyCard?.noise?.junk) {
    for (let count = 0; count < enemyCard.noise.junk; count += 1) {
      state.player.deck.splice(
        Math.floor(Math.random() * (state.player.deck.length + 1)),
        0,
        cardInstance("noise-junk"),
      );
    }
    showToast(`噪声协议：${enemyCard.noise.junk} 张噪声碎片混入你的牌库`);
  }
  if (enemyCard?.noise?.tokenDrain) {
    state.player.tokenPenalty += enemyCard.noise.tokenDrain;
    showToast(`噪声协议：下回合 Token -${enemyCard.noise.tokenDrain}`);
  }

  if (playerCard?.atk && state.player.character.id === "ruka" && !state.player.firstAttackUsed) {
    state.player.firstAttackUsed = true;
  }

  if (playerLink > 0 && state.player.character.id === "lumi") {
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
    state.stats.healed += state.player.hp - before;
  }
  if (link > 0) {
    sound.play("link");
    showToast(`${index + 1} 番触发同调，数值 +${link}`);
  }
  if (p.hits > 1 || e.hits > 1) {
    const hitParts = [];
    if (p.hits > 1) hitParts.push(`我方 ${p.atk}×${p.hits}`);
    if (e.hits > 1) hitParts.push(`对手 ${e.atk}×${e.hits}`);
    showToast(`${index + 1} 番多段攻击：${hitParts.join("，")}`);
  }
  if (playerDamage > 0 || enemyDamage > 0) sound.play("hit");
  if ((playerCard?.heal || enemyCard?.heal) && !playerDamage && !enemyDamage) sound.play("heal");

  const label =
    p.atk > 0 && e.guard > 0
      ? `${p.atk}${p.hits > 1 ? `×${p.hits}` : ""}−${e.guard}=${playerDamage}`
      : playerDamage > 0
        ? `−${playerDamage}`
        : emptyResultLabel(playerCard, enemyCard);
  const enemyLabel =
    e.atk > 0 && p.guard > 0
      ? `${e.atk}${e.hits > 1 ? `×${e.hits}` : ""}−${p.guard}=${enemyDamage}`
      : enemyDamage > 0
        ? `−${enemyDamage}`
        : "";

  if (playerDamage > 0) animatePortrait(".player-panel", "happy");
  if (enemyDamage > 0) animatePortrait(".enemy-panel", "hit");

  setNote(
    playerDamage || enemyDamage
      ? `${index + 1} 番结算：我方 ${playerDamage} 伤害，对手 ${enemyDamage} 伤害`
      : `${index + 1} 番结算：${label || "风平浪静"}`,
  );

  if (state.player.hp <= 0 || state.enemy.hp <= 0) {
    const won = state.enemy.hp <= 0 && state.player.hp > 0;
    finishMatch(won);
  }

  return {
    playerDamage,
    enemyDamage,
    playerAtk: p.atk,
    playerHits: p.hits,
    enemyAtk: e.atk,
    enemyHits: e.hits,
    enemyGuard: e.guard,
    enemyLabel,
    link,
  };
}

function emptyResultLabel(playerCard, enemyCard) {
  if (!playerCard && !enemyCard) return "空槽";
  if (playerCard?.heal || enemyCard?.heal) return "回复";
  if (playerCard?.draw || enemyCard?.draw) return "抽牌";
  if (playerCard && enemyCard) return "相持";
  return playerCard ? "推进" : "承伤";
}

function animatePortrait(selector, className) {
  const node = $(selector);
  if (!node) return;
  const portrait = node.querySelector(".portrait-frame");
  if (!portrait) return;
  portrait.classList.remove(className);
  void portrait.offsetWidth;
  portrait.classList.add(className);
  setTimeout(() => portrait.classList.remove(className), 340);
}

function finishRound() {
  if (!state || state.phase === "end") return;
  const playerCards = state.player.placements.filter(Boolean);
  const enemyCards = state.enemy.placements.filter(Boolean);
  const playerUnused = [...state.player.hand];
  const enemyUnused = [...state.enemy.hand];
  const playerNoisePenalty = playerUnused
    .filter((card) => card.id === "noise-junk" && card.unusedPenalty)
    .reduce((sum, card) => sum + card.unusedPenalty, 0);
  const enemyNoisePenalty = enemyUnused
    .filter((card) => card.id === "noise-junk" && card.unusedPenalty)
    .reduce((sum, card) => sum + card.unusedPenalty, 0);
  if (playerNoisePenalty > 0) {
    state.player.hp = Math.max(0, state.player.hp - playerNoisePenalty);
    showToast(`强化噪声反噬：失去 ${playerNoisePenalty} 稳定度`);
  }
  if (enemyNoisePenalty > 0) {
    state.enemy.hp = Math.max(0, state.enemy.hp - enemyNoisePenalty);
  }
  tryLethalRecovery("player");
  tryLethalRecovery("enemy");
  if (state.player.hp <= 0 || state.enemy.hp <= 0) {
    finishMatch(state.enemy.hp <= 0 && state.player.hp > 0);
    return;
  }
  const playerDiscardable = playerCards.filter((card) => !card.temporaryCard);
  const enemyDiscardable = enemyCards.filter((card) => !card.temporaryCard);
  state.stats.played += playerDiscardable.length;
  state.player.discard.push(
    ...playerDiscardable.filter((card) => !card.persistent && !card.exhaust),
  );
  state.player.exhaust.push(
    ...playerDiscardable.filter((card) => !card.persistent && card.exhaust),
  );
  state.enemy.discard.push(
    ...enemyDiscardable.filter((card) => !card.persistent && !card.exhaust),
  );
  state.enemy.exhaust.push(
    ...enemyDiscardable.filter((card) => !card.persistent && card.exhaust),
  );
  const playerPendingSlippery = new Set(state.player.pendingSlippery || []);
  const retainedCards = playerUnused.filter(
    (card) =>
      !card.void &&
      (card.retain ||
        (state.player.noiseRetainThisTurn && card.id === "noise-junk") ||
        playerPendingSlippery.has(card.uid)),
  );
  const retainedUids = new Set(retainedCards.map((card) => card.uid));
  state.player.discard.push(
    ...playerUnused.filter((card) => !retainedUids.has(card.uid) && !card.void),
  );
  state.player.exhaust.push(...playerUnused.filter((card) => card.void));
  const enemyPendingSlippery = new Set(state.enemy.pendingSlippery || []);
  const enemyRetainedCards = enemyUnused.filter(
    (card) =>
      !card.void &&
      (card.retain ||
        (state.enemy.noiseRetainThisTurn && card.id === "noise-junk") ||
        enemyPendingSlippery.has(card.uid)),
  );
  const enemyRetainedUids = new Set(enemyRetainedCards.map((card) => card.uid));
  state.enemy.discard.push(
    ...enemyUnused.filter(
      (card) => !enemyRetainedUids.has(card.uid) && !card.void,
    ),
  );
  state.enemy.exhaust.push(...enemyUnused.filter((card) => card.void));
  state.player.hand = retainedCards;
  state.enemy.hand = enemyRetainedCards;
  state.player.placements = Array(SLOT_COUNT).fill(null);
  state.enemy.placements = Array(SLOT_COUNT).fill(null);
  state.player.carryGuard = 0;
  state.enemy.carryGuard = 0;
  playerCards.forEach((card) => {
    card.tempGuardBonus = 0;
  });
  enemyCards.forEach((card) => {
    card.tempGuardBonus = 0;
  });
  state.player.multiInsurancePlays = 0;
  state.enemy.multiInsurancePlays = 0;
  clearRoundCostOverrides(state.player);
  clearRoundCostOverrides(state.enemy);
  state.revealed = Array(SLOT_COUNT).fill(false);
  state.pairResults = Array(SLOT_COUNT).fill(null);
  state.slotLinks = Array(SLOT_COUNT).fill(0);
  state.round += 1;
  state.phase = "plan";
  state.lock = false;
  state.player.energy = Math.max(
    0,
    MAX_ENERGY +
      state.player.extraEnergy +
      state.player.nextEnergyBonus -
      state.player.tokenPenalty,
  );
  const nextDrawCount =
    DRAW_PER_ROUND + state.player.extraDraw + state.player.nextDrawBonus;
  state.player.nextDrawBonus = 0;
  state.player.nextEnergyBonus = 0;
  state.player.tokenPenalty = 0;
  state.enemy.energy = Math.max(
    0,
    MAX_ENERGY +
      state.enemy.extraEnergy +
      state.enemy.nextEnergyBonus -
      state.enemy.tokenPenalty,
  );
  const enemyNextDrawCount =
    DRAW_PER_ROUND + state.enemy.extraDraw + state.enemy.nextDrawBonus;
  state.enemy.nextDrawBonus = 0;
  state.enemy.nextEnergyBonus = 0;
  state.enemy.tokenPenalty = 0;
  const playerDrawn = drawFor("player", nextDrawCount);
  const enemyDrawn = drawFor("enemy", enemyNextDrawCount);
  addPassiveCard("player");
  addPassiveCard("enemy");
  processSlipperyCards("player");
  if (state.phase !== "end") processSlipperyCards("enemy");
  state.player.firstGuardUsed = false;
  state.player.firstAttackUsed = false;
  state.player.swapUsed = false;
  state.player.swapMode = false;
  state.player.swapFirst = -1;
  state.player.noiseRetainThisTurn = false;
  state.enemy.swapUsed = false;
  state.enemy.noiseRetainThisTurn = false;
  setNote(
    `第 ${state.round} 回合：你抽到 ${playerDrawn} 张牌，${state.enemy.character.name} 抽到 ${enemyDrawn} 张`,
  );
  renderAll();
}

function finishMatch(won) {
  if (!state || state.phase === "end") return;
  state.phase = "end";
  state.lock = true;
  state.activeSlot = -1;
  sound.play(won ? "win" : "lose");
  renderAll();
  let bestRecord = null;
  let recordStatus = "none";
  try {
    const key = "model-matrix-best";
    const prior = JSON.parse(localStorage.getItem(key) || "null");
    const hasPriorRecord =
      prior?.won &&
      Number.isFinite(prior.rounds) &&
      Number.isFinite(prior.damage);
    const isNewRecord =
      won &&
      (!hasPriorRecord ||
        state.round < prior.rounds ||
        (state.round === prior.rounds && state.stats.damage > prior.damage));
    if (isNewRecord) {
      bestRecord = {
        won,
        rounds: state.round,
        damage: state.stats.damage,
        links: state.stats.links,
      };
      localStorage.setItem(
        key,
        JSON.stringify(bestRecord),
      );
      recordStatus = hasPriorRecord ? "new" : "first";
    } else if (hasPriorRecord) {
      bestRecord = prior;
      recordStatus = "kept";
    }
  } catch {
    // Local records are optional.
  }
  const endedSequence = state.sequence;
  setTimeout(() => {
    if (!state || state.sequence !== endedSequence || state.phase !== "end") return;
    dom.cardModal.classList.add("hidden");
    dom.resultModal.classList.remove("hidden");
    dom.resultCard.classList.toggle("lost", !won);
    dom.resultMascot.textContent = won ? "✦" : "×";
    dom.resultEyebrow.textContent = won ? "MODEL ALIGNED" : "RESPONSE FAILED";
    dom.resultTitle.textContent = won ? "对齐全绿！" : "模型失稳…";
    dom.resultCopy.textContent = won
      ? `你的五槽协议成功闭环，${state.enemy.character.name} 再也编不出一条能翻盘的回复。`
      : `${state.enemy.character.name} 抢走了上下文。换个模型，或者重新安排能力同调再试一次。`;
    dom.resultRounds.textContent = state.round;
    dom.resultDamage.textContent = state.stats.damage;
    dom.resultLinks.textContent = state.stats.links;
    dom.resultBest.textContent = bestRecord
      ? `最佳纪录：${bestRecord.rounds} 回合 / ${bestRecord.damage} 伤害${
          recordStatus === "new"
            ? " · 新纪录！"
            : recordStatus === "first"
              ? " · 首次记录！"
              : ""
        }`
      : "最佳纪录：暂无";
    dom.resultBest.classList.toggle(
      "new-record",
      recordStatus === "new" || recordStatus === "first",
    );
  }, DEV.fast ? 120 : 680);
}

function renderAll() {
  if (!state) return;
  renderHeader();
  renderFighterPanels();
  renderEnergy();
  renderSlots();
  renderHand();
  renderPhase();
  if (!dom.pileModal.classList.contains("hidden")) renderPile();
}

function renderHeader() {
  dom.roundValue.textContent = String(state.round).padStart(2, "0");
  dom.drawCount.textContent = state.player.deck.length;
  dom.discardCount.textContent = state.player.discard.length;
  dom.exhaustCount.textContent = state.player.exhaust.length;
  dom.playerHpText.textContent = `${Math.max(0, state.player.hp)} / ${state.player.maxHp}`;
  dom.enemyHpText.textContent = `${Math.max(0, state.enemy.hp)} / ${state.enemy.maxHp}`;
  dom.playerHpFill.style.width = `${Math.max(0, state.player.hp / state.player.maxHp) * 100}%`;
  dom.enemyHpFill.style.width = `${Math.max(0, state.enemy.hp / state.enemy.maxHp) * 100}%`;
}

function renderFighterPanels() {
  const character = state.player.character;
  dom.playerName.textContent = character.name;
  dom.playerPortrait.src = character.battlePortrait || character.portrait;
  dom.playerPortrait.alt = `${character.name} Q 版模型娘拟人立绘`;
  dom.playerPassiveIcon.textContent = character.passiveIcon;
  dom.playerPassiveName.textContent = character.passiveName;
  dom.playerPassiveText.textContent = character.passiveText;
  const buffs = [];
  if (state.player.buffs.atk) buffs.push(`<span class="buff-chip">⌘ 攻击 +${state.player.buffs.atk}</span>`);
  if (state.player.buffs.guard) buffs.push(`<span class="buff-chip">⌘ 护盾 +${state.player.buffs.guard}</span>`);
  if (state.player.carryGuard) buffs.push(`<span class="buff-chip">▧ 溢出护盾 ${state.player.carryGuard}</span>`);
  if (state.player.extraDraw) buffs.push(`<span class="buff-chip">⌘ 每回合多抽 ${state.player.extraDraw}</span>`);
  if (state.player.extraEnergy) buffs.push(`<span class="buff-chip">⌘ 每回合 Token +${state.player.extraEnergy}</span>`);
  if (state.player.nextDrawBonus) buffs.push(`<span class="buff-chip">≋ 下回合抽牌 +${state.player.nextDrawBonus}</span>`);
  if (state.player.nextEnergyBonus) buffs.push(`<span class="buff-chip">≋ 下回合 Token +${state.player.nextEnergyBonus}</span>`);
  if (state.player.tokenPenalty) buffs.push(`<span class="buff-chip debuff">⚠ 下回合 Token -${state.player.tokenPenalty}</span>`);
  if (state.player.noisePenalty) {
    buffs.push(
      `<span class="buff-chip debuff">⚠ 噪声反噬 ${state.player.noisePenalty}</span>`,
    );
  }
  if (state.player.character.id === "ruka" && state.phase !== "plan") {
    const summary = protocolSpreadSummary("player");
    buffs.unshift(
      `<span class="buff-chip">⑂ 非基础 ${summary.unique} 种 · 重复 ${summary.repeatedKinds} · 全体 +${summary.bonus}</span>`,
    );
  }
  dom.playerBuffs.innerHTML = buffs.join("");
  const enemy = state.enemy.character;
  dom.enemyName.textContent = enemy.name;
  dom.enemyPortrait.src = enemy.battlePortrait || enemy.portrait;
  dom.enemyPortrait.alt = `${enemy.name} Q 版模型娘拟人立绘`;
  dom.enemyPassiveIcon.textContent = enemy.passiveIcon;
  dom.enemyPassiveName.textContent = enemy.passiveName;
  dom.enemyPassiveText.textContent = enemy.passiveText;
}

function renderEnergy() {
  const remaining = state.player.energy - placementsCost("player");
  dom.energyValue.textContent = Math.max(0, remaining);
  dom.energyPips.innerHTML = Array.from({ length: Math.max(MAX_ENERGY, remaining) }, (_, index) => {
    return `<span class="energy-pip ${index < remaining ? "active" : ""}"></span>`;
  }).join("");
  dom.enemyEnergyPips.innerHTML = Array.from({ length: MAX_ENERGY }, (_, index) => {
    const active = state.phase === "plan" ? true : index < state.enemy.energy;
    return `<span class="enemy-pip ${active ? "active" : ""}"></span>`;
  }).join("");
}

function tagMarkup(tag) {
  const meta = TAGS[tag] || { glyph: "◇", name: `${tag}纹`, tone: "sun" };
  return `<span class="tag-badge" data-tone="${meta.tone}"><i>${meta.glyph}</i>${meta.name}</span>`;
}

function cardTagsMarkup(card, mode = "inline") {
  return `<span class="card-protocols ${mode}">${cardProtocols(card)
    .map((protocol) => tagMarkup(protocol))
    .join("")}</span>`;
}

function miniCard(card, side, index) {
  const link = adjacentLinks(state[side].placements, index);
  const effective = effectiveStats(side, index);
  const stats = [];
  if (cardCanShowStat(card, "atk")) {
    stats.push(`<span class="atk ${effective.atk > card.atk ? "boosted" : ""}">⚔ ${effective.atk}${effective.hits > 1 ? ` × ${effective.hits}` : ""}${effective.atk > card.atk ? " ↑" : ""}</span>`);
  }
  if (cardCanShowStat(card, "guard")) {
    stats.push(`<span class="guard ${effective.guard > card.guard ? "boosted" : ""}">◈ ${effective.guard}${effective.guard > card.guard ? " ↑" : ""}</span>`);
  }
  if (card.buff || card.persistent) stats.push('<span class="utility">永久生效</span>');
  if (card.heal) stats.push(`<span class="utility">♡ ${card.heal}</span>`);
  if (card.draw) stats.push(`<span class="utility">+${card.draw}</span>`);
  return `
    <div class="mini-card ${card.name.length > 7 ? "long-name" : ""}" data-tone="${card.tone}">
      <div class="mini-card-top">
        <span class="mini-cost">${effectiveCardCost(card)}</span>
        ${cardTagsMarkup(card, "compact")}
      </div>
      <span class="mini-icon">${card.glyph}</span>
      <span class="mini-card-name">${card.name}</span>
      ${link > 0 ? `<span class="link-bonus">⚡ 数值 +${link}</span>` : ""}
      <div class="mini-stats">${stats.join("")}</div>
    </div>
  `;
}

function renderSlots() {
  const activeLinkPartners = new Set();
  if (state.activeSlot >= 0 && state.slotLinks[state.activeSlot] > 0) {
    for (let index = 0; index < SLOT_COUNT; index += 1) {
      if (Math.abs(index - state.activeSlot) !== 1) continue;
      if (
        sharesProtocol(state.player.placements[index], state.player.placements[state.activeSlot]) ||
        sharesProtocol(state.enemy.placements[index], state.enemy.placements[state.activeSlot])
      ) {
        activeLinkPartners.add(index);
      }
    }
  }
  const chainRoles = Array(SLOT_COUNT).fill("");
  const chainLengths = Array(SLOT_COUNT).fill(0);
  const isLinked = (left, right) =>
    sharesProtocol(state.player.placements[left], state.player.placements[right]);
  for (let start = 0; start < SLOT_COUNT - 1; start += 1) {
    if (chainRoles[start] || !isLinked(start, start + 1)) continue;
    let end = start + 1;
    while (end < SLOT_COUNT - 1 && isLinked(end, end + 1)) end += 1;
    const length = end - start + 1;
    for (let index = start; index <= end; index += 1) {
      chainRoles[index] = index === start ? "start" : index === end ? "end" : "middle";
      chainLengths[index] = length;
    }
  }
  dom.slots.innerHTML = Array.from({ length: SLOT_COUNT }, (_, index) => {
    const playerCard = state.player.placements[index];
    const enemyCard = state.enemy.placements[index];
    const revealed = state.revealed[index];
    const result = state.pairResults[index];
    const activeChain = state.activeSlot === index && state.slotLinks[index] > 0;
    const chainPartner = activeLinkPartners.has(index);
    const swapSelected = state.player.swapFirst === index;
    const enemySwapFocus = state.enemySwapSlots?.includes(index);
    const enemySwapDone = enemySwapFocus && state.enemySwapPhase === "swapped";
    const chainRole = chainRoles[index];
    const chainLength = chainLengths[index];
    const planning = state.phase === "plan";
    const chainStyle =
      chainRole === "start"
        ? `style="--chain-frame-width:calc(${chainLength * 100}% + ${(chainLength - 1) * 8 + 10}px)"`
        : "";
    let enemyZone;
    if (!revealed) {
      enemyZone = '<div class="hidden-card">?</div>';
    } else if (enemyCard) {
      enemyZone = `<div class="enemy-reveal">${miniCard(enemyCard, "enemy", index)}</div>`;
    } else {
      enemyZone = '<div class="empty-opponent">空</div>';
    }
    const emptyPlayer = `
      <span class="slot-drop-icon">＋</span>
      <span class="slot-drop-copy">${
        planning ? (state.selectedUid ? "点击放入此槽" : "点击查看手牌") : "空槽"
      }</span>
    `;
    const resultClass = result
      ? result.playerDamage > result.enemyDamage
        ? "won"
        : result.enemyDamage > result.playerDamage
          ? "lost"
          : ""
      : "";
    const delta = result
      ? result.playerDamage || result.enemyDamage
        ? `${result.link ? `同调 +${result.link} · ` : ""}我方 ${result.playerDamage} · 对手 ${result.enemyDamage}`
        : result.link
          ? `同调 +${result.link}`
          : "相持"
      : "";
    const enemyMarkup = planning
      ? ""
      : `<button class="enemy-card-zone" type="button" data-enemy-zone="${index}"
          aria-label="第 ${index + 1} 槽对手卡牌详情">${enemyZone}</button>
        <div class="slot-versus">VS</div>`;
    const deltaMarkup = planning
      ? ""
      : `<span class="pair-delta ${result ? "visible" : ""}">${delta}</span>`;
    return `
      <article class="duel-slot ${planning ? "planning-slot" : ""} ${state.activeSlot === index ? "active" : ""} ${activeChain ? "chain-source" : ""} ${chainPartner ? "chain-partner" : ""} ${swapSelected ? "swap-selected" : ""} ${enemySwapFocus ? "enemy-swap-focus" : ""} ${enemySwapDone ? "enemy-swap-done" : ""} ${chainRole ? `chain-run chain-run-${chainRole}` : ""} ${resultClass} ${revealed ? "resolving" : ""}"
        data-slot="${index}" ${chainStyle}>
        <span class="slot-number">${index + 1}</span>
        ${chainRole === "start" && state.phase !== "resolve" ? `<span class="chain-group-label">同调链 ×${chainLength} · 数值强化</span>` : ""}
        ${enemySwapFocus && state.enemySwapSlots[0] === index ? `<span class="enemy-swap-ribbon">${enemySwapDone ? "⇄ 决策修正完成" : "⇄ 正在修正"}</span>` : ""}
        ${activeChain ? `<span class="chain-ribbon">同调 LINK +${state.slotLinks[index]}</span>` : ""}
        ${chainPartner ? '<span class="chain-ribbon partner">LINK</span>' : ""}
        ${enemyMarkup}
        <button class="player-card-zone" type="button" data-slot-zone="${index}"
          aria-label="第 ${index + 1} 槽${playerCard ? "，点击取回卡牌" : "，点击放入选择的卡牌"}">
          ${playerCard ? miniCard(playerCard, "player", index) : emptyPlayer}
        </button>
        ${deltaMarkup}
      </article>
    `;
  }).join("");

  if (state.phase === "plan" && state.selectedUid) {
    $$(".duel-slot").forEach((node) => node.classList.add("drop-ready"));
  }
  dom.slotsUsed.textContent = `已放置 ${state.player.placements.filter(Boolean).length} / 5`;
  dom.autoPlaceBtn.disabled = state.phase !== "plan" || state.lock;
  dom.autoPlaceBtn.textContent = "一键布阵";
  const showSwap = state.phase === "preview" && state.player.character.id === "momo";
  dom.swapBtn.classList.toggle("hidden", !showSwap);
  dom.swapBtn.classList.toggle("selecting", showSwap && state.player.swapMode);
  dom.swapBtn.disabled =
    !showSwap || state.player.swapUsed || state.enemyThinking || state.lock;
  dom.swapBtn.querySelector("b").textContent = state.player.swapUsed
    ? "本回合已修正"
    : state.player.swapMode
      ? state.player.swapFirst >= 0
        ? "选择第二张"
        : "选择第一张"
      : "决策修正";
  dom.swapBtn.querySelector("small").textContent = state.player.swapUsed
    ? "每回合只能使用一次"
    : state.player.swapMode
      ? "点击两张已放置的我方卡牌"
      : "交换两张已放置的牌";
  dom.confirmBtn.disabled =
    !["plan", "preview"].includes(state.phase) || state.enemyThinking || state.lock;
  dom.confirmBtn.querySelector("span").textContent =
    state.enemyThinking
      ? "克劳德正在思考"
      : state.phase === "preview"
      ? "确认结算"
      : state.phase === "resolve"
        ? "对位结算中"
        : state.phase === "end"
          ? "对决结束"
          : "确认布阵";
  dom.confirmBtn.querySelector("small").textContent = state.enemyThinking
    ? "请稍候"
    : state.phase === "preview"
      ? "ENTER"
      : "ENTER";
}

function renderHand() {
  const remaining = state.player.energy - placementsCost("player");
  dom.hand.style.setProperty("--hand-count", String(Math.max(1, state.player.hand.length)));
  dom.hand.innerHTML = state.player.hand
    .map((card, index) => {
      const displayCost = effectiveCardCost(card);
      const unaffordable = displayCost > remaining;
      const keywords = cardKeywords(card);
      const displayDescription = cardDescription(card);
      const longCopy = plainDescription(card).length > 28;
      return `
        <article class="hand-card ${card.rarity === "专属" ? "exclusive" : ""} ${longCopy ? "long-copy" : ""} ${card.name.length > 7 ? "long-name" : ""} ${state.selectedUid === card.uid ? "selected" : ""} ${unaffordable ? "unaffordable" : ""}"
          data-tone="${card.tone}" data-uid="${card.uid}" draggable="${state.phase === "plan" && !unaffordable}"
          tabindex="0" style="animation-delay:${Math.min(index * 28, 140)}ms"
          aria-label="${card.name}，消耗 ${displayCost} Token">
          <div class="card-top">
            <span class="card-cost"><b>${displayCost}</b><small>Token</small></span>
            ${cardTagsMarkup(card, "stack")}
          </div>
          <div class="card-illustration"><span class="card-glyph">${card.glyph}</span></div>
          <h3 class="card-name">${card.name}</h3>
          <div class="card-role">${TAGS[card.tag]?.primaryShort || card.role} · ${card.rarity}</div>
          ${keywords.length ? `<div class="card-keywords">${keywords.map((word) => `<span>${word}</span>`).join("")}</div>` : ""}
          <p class="card-desc"><span class="card-effect-text">${displayDescription}</span></p>
          <div class="card-bottom">
            ${cardCanShowStat(card, "atk") ? `<span class="atk">⚔ ${card.atk}</span>` : ""}
            ${cardCanShowStat(card, "guard") ? `<span class="guard">◈ ${card.guard}</span>` : ""}
            ${card.heal ? `<span>♡ ${card.heal}</span>` : ""}
            ${card.draw ? `<span>抽 ${card.draw}</span>` : ""}
            ${card.buff || card.persistent ? "<span>永久生效</span>" : ""}
          </div>
        </article>
      `;
    })
    .join("");

  const selected = selectedCard();
  if (state.phase !== "plan") {
    dom.selectionHint.textContent =
      state.enemyThinking
        ? "克劳德正在审视并修改牌阵 · 决策完成前无法结算"
        : state.phase === "preview"
        ? state.player.character.id === "momo"
          ? state.player.swapUsed
            ? "决策修正已使用 · 检查牌阵后确认结算"
            : state.player.swapMode
              ? state.player.swapFirst >= 0
                ? `已选择第 ${state.player.swapFirst + 1} 槽 · 请选择第二张已放置的牌`
                : "决策修正：请选择第一张已放置的我方卡牌"
              : "牌阵已公开 · 可以使用右侧“决策修正”交换两张牌"
          : state.player.character.id === "ruka"
            ? `混合专家路由已结算：全体攻击与抵挡 ${
                protocolSpreadModifier() >= 0 ? "+" : ""
              }${protocolSpreadModifier()}`
          : "双方牌阵已公开 · 查看同调与牌堆后点击“确认结算”"
        : state.phase === "resolve"
          ? "双方正在逐位对决…"
          : "本局对决结束";
  } else if (selected) {
    dom.selectionHint.textContent = `已选择「${selected.name}」 · 点击任意槽位放入 · 再次点击已放牌可取回`;
  } else {
    dom.selectionHint.textContent = `剩余 ${Math.max(0, remaining)} Token · 未放置的牌会在结算后进入弃牌堆`;
  }
}

function renderPhase() {
  const filled = state.player.placements.filter(Boolean).length;
  if (state.phase === "plan") {
    dom.phaseText.textContent = "排兵阶段";
    dom.resolveFill.style.width = `${filled * 20}%`;
  } else if (state.phase === "preview") {
    dom.phaseText.textContent = state.enemyThinking
      ? "克劳德正在思考"
      : "布阵预览 · 等待确认";
    dom.resolveFill.style.width = "100%";
  } else if (state.phase === "resolve") {
    dom.phaseText.textContent = state.activeSlot >= 0 ? `第 ${state.activeSlot + 1} 番结算` : "揭晓牌阵";
    dom.resolveFill.style.width = `${Math.max(1, (state.activeSlot + 1) * 20)}%`;
  } else {
    dom.phaseText.textContent = "对决结束";
    dom.resolveFill.style.width = "100%";
  }
}

function openPile(type) {
  if (!state) return;
  currentPile = ["deck", "discard", "exhaust"].includes(type) ? type : "deck";
  renderPile();
  dom.pileModal.classList.remove("hidden");
}

function renderPile() {
  if (!state) return;
  const isDeck = currentPile === "deck";
  const isExhaust = currentPile === "exhaust";
  const cards = isDeck
    ? [...state.player.deck].reverse()
    : isExhaust
      ? [...state.player.exhaust].reverse()
      : [...state.player.discard].reverse();
  dom.pileTitle.textContent = isDeck ? "抽牌堆" : isExhaust ? "消耗堆" : "弃牌堆";
  dom.pileNote.textContent = isDeck
    ? "按当前牌堆顺序展示，最上方为下一张会抽到的牌。"
    : isExhaust
      ? "消耗牌与本回合未使用的虚无牌会留在这里，不再参与抽牌堆循环。"
      : "按弃置顺序展示，最近进入弃牌堆的牌排在最前。";
  dom.modalDeckCount.textContent = state.player.deck.length;
  dom.modalDiscardCount.textContent = state.player.discard.length;
  dom.modalExhaustCount.textContent = state.player.exhaust.length;
  dom.pileDeckTab.classList.toggle("active", isDeck);
  dom.pileDiscardTab.classList.toggle("active", !isDeck && !isExhaust);
  dom.pileExhaustTab.classList.toggle("active", isExhaust);
  dom.pileList.innerHTML =
    cards.length > 0
      ? cards
          .map(
            (card, index) => `
              <article class="pile-card-row" data-tone="${card.tone}">
                <span class="pile-order">${index + 1}</span>
                <span class="pile-cost">${effectiveCardCost(card)}</span>
                <span class="pile-glyph">${card.glyph}</span>
                <div class="pile-card-copy">
                  <strong>${card.name}</strong>
                  <span>${TAGS[card.tag]?.name || card.role}协议 · ${card.rarity}</span>
                </div>
                ${cardTagsMarkup(card, "inline")}
                <div class="pile-stats">
                  ${cardCanShowStat(card, "atk") ? `<span class="atk">⚔ ${card.atk}</span>` : ""}
                  ${cardCanShowStat(card, "guard") ? `<span class="guard">◈ ${card.guard}</span>` : ""}
                  ${card.heal ? `<span>♡ ${card.heal}</span>` : ""}
                  ${card.draw ? `<span>抽 ${card.draw}</span>` : ""}
                </div>
              </article>
            `,
          )
          .join("")
      : '<div class="pile-empty">这里暂时没有牌。</div>';
}

function cardDetailMarkup(card) {
  const tag = TAGS[card.tag] || { name: `${card.tag}纹`, glyph: "◇" };
  const stats = [
    cardCanShowStat(card, "atk") ? `<span class="detail-stat atk">⚔ 攻击 ${card.atk}</span>` : "",
    cardCanShowStat(card, "guard") ? `<span class="detail-stat guard">◈ 护盾 ${card.guard}</span>` : "",
    card.heal ? `<span class="detail-stat">♡ 治疗 ${card.heal}</span>` : "",
    card.draw ? `<span class="detail-stat">＋ 抽牌 ${card.draw}</span>` : "",
  ].filter(Boolean);
  const keywords = cardKeywords(card);
  return `
    <div class="detail-card-hero" data-tone="${card.tone}">
      <div class="detail-cost">${effectiveCardCost(card)}<small>Token</small></div>
      <div class="detail-glyph">${card.glyph}</div>
      <div class="detail-identity">
        ${cardTagsMarkup(card, "inline")}
        <strong>${card.name}</strong>
        <span>${tag.fullName || tag.name} · ${tag.primary || card.role} · ${card.rarity}</span>
      </div>
    </div>
    ${keywords.length ? `<div class="detail-keywords">${keywords.map((word) => `<span>${word}</span>`).join("")}</div>` : ""}
    <p class="detail-description">${cardDescription(card) || "这张牌通过同槽对位产生效果。"}</p>
    <div class="detail-stats">${stats.join("") || "<span class=\"detail-stat\">只提供规则效果</span>"}</div>
    <div class="detail-rule">
      <b>同调判定</b>
      <p>卡牌可以同时拥有多种协议。相邻槽位只要共享任意一种协议，就会形成 LINK，不比较卡牌插画或名称。</p>
    </div>
  `;
}

function openCardDetail(card, slotIndex, canRemove = false, offerPlace = false) {
  if (!card) return;
  if (card.locked) canRemove = false;
  dom.cardModal.dataset.mode = "detail";
  cardModalSlot = slotIndex;
  dom.cardModalEyebrow.textContent = "CARD DETAIL";
  dom.cardModalTitle.textContent = `第 ${slotIndex + 1} 槽 · 卡牌详情`;
  dom.cardModalBody.innerHTML = cardDetailMarkup(card);
  dom.cardModalActions.innerHTML = `
    ${canRemove ? '<button id="detailRemoveBtn" class="round-button wide" type="button">从槽位取回</button>' : ""}
    ${offerPlace ? '<button id="detailPlaceBtn" class="primary-button" type="button">放入此槽</button>' : ""}
    <button id="detailCloseBtn" class="primary-button" type="button">继续查看牌阵</button>
  `;
  dom.cardModal.classList.remove("hidden");
}

function openSlotPicker(slotIndex) {
  if (!state) return;
  dom.cardModal.dataset.mode = "picker";
  cardModalSlot = slotIndex;
  const remaining = state.player.energy - placementsCost("player");
  dom.cardModalEyebrow.textContent = "CHOOSE A CARD";
  dom.cardModalTitle.textContent = `第 ${slotIndex + 1} 槽 · 查看并放牌`;
  dom.cardModalBody.innerHTML = `
    <p class="picker-tip">点击一张手牌查看完整介绍并放入该槽；也可以保持空槽。</p>
    <div class="slot-pick-list">
      ${
        state.player.hand.length
          ? state.player.hand
              .map((card) => {
                const displayCost = effectiveCardCost(card);
                const unaffordable =
                  displayCost > remaining ||
                  (card.requiresNoHandNoise && actorHasHandNoise(state.player));
                const keywords = cardKeywords(card);
                return `
                  <button class="slot-pick-card" type="button" data-pick-uid="${card.uid}"
                    ${unaffordable ? "disabled" : ""} data-tone="${card.tone}">
                    <span class="pick-cost">${displayCost}</span>
                    <span class="pick-glyph">${card.glyph}</span>
                    <span class="pick-copy">
                      <strong>${card.name}</strong>
                      <small>${keywords.length ? `${keywords.join(" · ")}｜` : ""}${plainDescription(card)}</small>
                    </span>
                    ${cardTagsMarkup(card, "compact")}
                  </button>
                `;
              })
              .join("")
          : '<div class="pile-empty">当前没有可选的手牌。</div>'
      }
    </div>
  `;
  dom.cardModalActions.innerHTML = '<button id="detailCloseBtn" class="round-button wide" type="button">保持空槽</button>';
  dom.cardModal.classList.remove("hidden");
}

function openPreciseSearch() {
  if (!state) return;
  dom.cardModal.dataset.mode = "search";
  cardModalSlot = -1;
  dom.cardModalEyebrow.textContent = "PRECISE RETRIEVAL";
  dom.cardModalTitle.textContent = "精确检索：选择 1 张牌";
  const cards = [...state.player.deck].reverse();
  if (cards.length === 0) dom.cardModal.dataset.mode = "empty";
  dom.cardModalBody.innerHTML = cards.length
    ? `
      <p class="picker-tip">抽牌堆最上方的牌排在最前。选择后将直接加入手牌，并从抽牌堆移除。</p>
      <div class="slot-pick-list">
        ${cards
          .map(
            (card) => `
              <button class="slot-pick-card" type="button" data-search-uid="${card.uid}" data-tone="${card.tone}">
                <span class="pick-cost">${effectiveCardCost(card)}</span>
                <span class="pick-glyph">${card.glyph}</span>
                <span class="pick-copy">
                  <strong>${card.name}</strong>
                  <small>${plainDescription(card)}</small>
                </span>
                ${cardTagsMarkup(card, "compact")}
              </button>
            `,
          )
          .join("")}
      </div>
    `
    : '<div class="pile-empty">抽牌堆目前没有可检索的牌。</div>';
  dom.cardModalActions.innerHTML = "";
  dom.cardModal.classList.remove("hidden");
}

function openProtocolCodex() {
  dom.protocolGrid.innerHTML = Object.entries(TAGS)
    .map(
      ([key, meta], index) => `
        <article class="protocol-item" data-tone="${meta.tone}">
          <span class="protocol-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="protocol-big-glyph">${meta.glyph}</span>
          ${tagMarkup(key)}
          <strong>${meta.fullName}</strong>
          <em class="protocol-primary">${meta.primary}</em>
          <p>${meta.use}</p>
        </article>
      `,
    )
    .join("");
  dom.protocolModal.classList.remove("hidden");
}

function openEmptySlotDetail(slotIndex) {
  dom.cardModal.dataset.mode = "detail";
  cardModalSlot = slotIndex;
  dom.cardModalEyebrow.textContent = "EMPTY SLOT";
  dom.cardModalTitle.textContent = `第 ${slotIndex + 1} 槽 · 空槽`;
  dom.cardModalBody.innerHTML = `
    <div class="empty-slot-detail">
      <span>＋</span>
      <strong>这里没有放置卡牌</strong>
      <p>空槽不会消耗 Token，也不会产生攻击、护盾或治疗。对手在相同槽位的攻击将完整命中。</p>
    </div>
  `;
  dom.cardModalActions.innerHTML = '<button id="detailCloseBtn" class="primary-button" type="button">返回牌阵</button>';
  dom.cardModal.classList.remove("hidden");
}

dom.characterGrid.addEventListener("click", (event) => {
  if (suppressCarouselClick) {
    suppressCarouselClick = false;
    return;
  }
  const choice = event.target.closest("[data-character]");
  if (!choice) return;
  selectCharacter(choice.dataset.character);
});

dom.modeSelect.addEventListener("click", (event) => {
  const choice = event.target.closest("[data-mode]");
  if (choice) selectMode(choice.dataset.mode);
});

dom.characterPrevBtn.addEventListener("click", () => {
  const count = carouselCards().length;
  selectCarouselIndex((carouselIndex - 1 + count) % count);
});

dom.characterNextBtn.addEventListener("click", () => {
  const count = carouselCards().length;
  selectCarouselIndex((carouselIndex + 1) % count);
});

dom.characterDots.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-carousel-index]");
  if (dot) selectCarouselIndex(Number(dot.dataset.carouselIndex));
});

dom.characterViewport.addEventListener("scroll", normalizeCarouselIndex, { passive: true });

dom.characterViewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse") return;
  carouselDrag = {
    startX: event.clientX,
    startScroll: dom.characterViewport.scrollLeft,
    moved: false,
  };
  dom.characterViewport.classList.add("dragging");
});

dom.characterViewport.addEventListener("pointermove", (event) => {
  if (!carouselDrag || event.pointerType !== "mouse") return;
  const delta = event.clientX - carouselDrag.startX;
  if (Math.abs(delta) > 5) carouselDrag.moved = true;
  if (!carouselDrag.moved) return;
  event.preventDefault();
  dom.characterViewport.scrollLeft = carouselDrag.startScroll - delta;
});

function releaseCarouselDrag() {
  if (!carouselDrag) return;
  suppressCarouselClick = carouselDrag.moved;
  carouselDrag = null;
  dom.characterViewport.classList.remove("dragging");
  normalizeCarouselIndex();
}

dom.characterViewport.addEventListener("pointerup", releaseCarouselDrag);
dom.characterViewport.addEventListener("pointercancel", releaseCarouselDrag);
dom.characterViewport.addEventListener("pointerleave", (event) => {
  if (carouselDrag && event.buttons === 0) releaseCarouselDrag();
});

dom.startBtn.addEventListener("click", startMatch);
dom.againBtn.addEventListener("click", startMatch);
dom.deckBuilderBtn.addEventListener("click", openDeckBuilder);
dom.closeDeckBuilderBtn.addEventListener("click", closeDeckBuilder);
dom.deckSaveTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-deck-slot]");
  if (tab) loadDeckDraftSlot(Number(tab.dataset.deckSlot));
});
dom.deckCardPool.addEventListener("click", (event) => {
  const control = event.target.closest("[data-deck-card-action]");
  if (!control) return;
  changeDeckCardCount(
    control.dataset.cardId,
    control.dataset.deckCardAction === "add" ? 1 : -1,
  );
});
dom.deckNameInput.addEventListener("input", () => {
  if (!deckDraft || deckDraft.isDefault) return;
  deckDraft.name = dom.deckNameInput.value;
  deckBuilderDirty = true;
  renderDeckBuilder();
});
dom.clearDeckDraftBtn.addEventListener("click", () => {
  if (!deckDraft || deckDraft.isDefault) return;
  deckDraft.entries = [];
  deckBuilderDirty = true;
  renderDeckBuilder();
  showToast("当前构筑已清空");
});
dom.resetDeckDraftBtn.addEventListener("click", () => {
  if (!deckDraft) return;
  if (deckDraft.isDefault) {
    loadDeckDraftSlot(-1);
    return;
  }
  deckDraft.entries = cloneDeckEntries(
    getCharacterDeck(deckDraft.characterId).entries,
  );
  deckBuilderDirty = true;
  renderDeckBuilder();
});
dom.saveDeckBtn.addEventListener("click", saveDeckDraft);
dom.changeBtn.addEventListener("click", showCharacterSelect);
dom.menuBtn.addEventListener("click", showCharacterSelect);
dom.helpBtn.addEventListener("click", () => dom.helpModal.classList.remove("hidden"));
dom.helpSelectBtn.addEventListener("click", () => dom.helpModal.classList.remove("hidden"));
dom.protocolBtn.addEventListener("click", openProtocolCodex);
dom.protocolSelectBtn.addEventListener("click", openProtocolCodex);
dom.closeProtocolBtn.addEventListener("click", () => dom.protocolModal.classList.add("hidden"));
dom.closeHelpBtn.addEventListener("click", () => dom.helpModal.classList.add("hidden"));
dom.helpDoneBtn.addEventListener("click", () => dom.helpModal.classList.add("hidden"));
dom.autoPlaceBtn.addEventListener("click", autoPlace);
dom.swapBtn.addEventListener("click", startSwapMode);
dom.confirmBtn.addEventListener("click", confirmBattle);
dom.drawPileBtn.addEventListener("click", () => openPile("deck"));
dom.discardPileBtn.addEventListener("click", () => openPile("discard"));
dom.exhaustPileBtn.addEventListener("click", () => openPile("exhaust"));
dom.pileDeckTab.addEventListener("click", () => {
  currentPile = "deck";
  renderPile();
});
dom.pileDiscardTab.addEventListener("click", () => {
  currentPile = "discard";
  renderPile();
});
dom.pileExhaustTab.addEventListener("click", () => {
  currentPile = "exhaust";
  renderPile();
});
dom.closePileBtn.addEventListener("click", () => dom.pileModal.classList.add("hidden"));
dom.closeCardBtn.addEventListener("click", () => {
  if (dom.cardModal.dataset.mode === "search") {
    showToast("精确检索必须选择一张牌");
    return;
  }
  dom.cardModal.classList.add("hidden");
});
dom.cardModalActions.addEventListener("click", (event) => {
  if (event.target.closest("#detailRemoveBtn")) {
    const slot = cardModalSlot;
    dom.cardModal.classList.add("hidden");
    removePlacedCard(slot);
    return;
  }
  if (event.target.closest("#detailPlaceBtn")) {
    const slot = cardModalSlot;
    const uid = dom.cardModal.dataset.pickUid;
    dom.cardModal.classList.add("hidden");
    placeSelectedCard(slot, uid);
    return;
  }
  if (event.target.closest("#detailCloseBtn")) dom.cardModal.classList.add("hidden");
});
dom.cardModalBody.addEventListener("click", (event) => {
  const searchPick = event.target.closest("[data-search-uid]");
  if (searchPick) {
    const index = state.player.deck.findIndex((card) => card.uid === searchPick.dataset.searchUid);
    if (index < 0) return;
    const [card] = state.player.deck.splice(index, 1);
    state.player.hand.push(card);
    enforceHandLimit("player");
    dom.cardModal.classList.add("hidden");
    renderAll();
    showToast(`精确检索：获得【${card.name}】`);
    sound.play("pick");
    return;
  }
  const pick = event.target.closest("[data-pick-uid]");
  if (!pick || !state) return;
  const card = state.player.hand.find((entry) => entry.uid === pick.dataset.pickUid);
  if (!card) return;
  dom.cardModal.dataset.pickUid = card.uid;
  openCardDetail(card, cardModalSlot, false, true);
});
dom.soundBtn.addEventListener("click", () => {
  sound.enabled = !sound.enabled;
  dom.soundBtn.textContent = sound.enabled ? "♪" : "×";
  dom.soundBtn.setAttribute("aria-label", sound.enabled ? "关闭音效" : "开启音效");
  if (sound.enabled) sound.play("pick");
});

dom.hand.addEventListener("click", (event) => {
  const cardNode = event.target.closest("[data-uid]");
  if (!cardNode || state?.phase !== "plan" || state?.lock) return;
  const card = state.player.hand.find((entry) => entry.uid === cardNode.dataset.uid);
  if (!card) return;
  const remaining = state.player.energy - placementsCost("player");
  if (card.requiresNoHandNoise && actorHasHandNoise(state.player)) {
    showToast("手牌中仍有噪声碎片，无法打出【开智】");
    return;
  }
  if (effectiveCardCost(card) > remaining) {
    showToast(`只剩 ${remaining} Token，暂时打不出「${card.name}」`);
    return;
  }
  state.selectedUid = state.selectedUid === card.uid ? null : card.uid;
  sound.play("pick");
  renderAll();
});

dom.hand.addEventListener("dblclick", (event) => {
  const cardNode = event.target.closest("[data-uid]");
  if (!cardNode || state?.phase !== "plan") return;
  const emptySlot = state.player.placements.findIndex((card) => !card);
  if (emptySlot >= 0) placeSelectedCard(emptySlot, cardNode.dataset.uid);
});

dom.hand.addEventListener("dragstart", (event) => {
  const cardNode = event.target.closest("[data-uid]");
  if (!cardNode || state?.phase !== "plan") {
    event.preventDefault();
    return;
  }
  state.selectedUid = cardNode.dataset.uid;
  cardNode.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", cardNode.dataset.uid);
  $$(".duel-slot").forEach((node) => node.classList.add("drop-ready"));
});

dom.hand.addEventListener("dragend", () => {
  $$(".hand-card").forEach((node) => node.classList.remove("dragging"));
  $$(".duel-slot").forEach((node) => node.classList.remove("drop-ready"));
});

dom.slots.addEventListener("dragenter", (event) => {
  const slot = event.target.closest("[data-slot]");
  if (!slot || state?.phase !== "plan") return;
  event.preventDefault();
  slot.classList.add("drop-ready");
});

dom.slots.addEventListener("dragover", (event) => {
  if (state?.phase === "plan") event.preventDefault();
});

dom.slots.addEventListener("dragleave", (event) => {
  const slot = event.target.closest("[data-slot]");
  if (slot && !slot.contains(event.relatedTarget)) slot.classList.remove("drop-ready");
});

dom.slots.addEventListener("drop", (event) => {
  const slot = event.target.closest("[data-slot]");
  if (!slot || state?.phase !== "plan") return;
  event.preventDefault();
  const uid = event.dataTransfer.getData("text/plain") || state.selectedUid;
  placeSelectedCard(Number(slot.dataset.slot), uid);
});

dom.slots.addEventListener("click", (event) => {
  const enemyZone = event.target.closest("[data-enemy-zone]");
  if (enemyZone && state) {
    const index = Number(enemyZone.dataset.enemyZone);
    const enemyCard = state.enemy.placements[index];
    if (state.phase === "plan") {
      showToast("确认布阵后才能查看对手卡牌");
    } else if (enemyCard) {
      openCardDetail(enemyCard, index);
    } else {
      openEmptySlotDetail(index);
    }
    return;
  }
  const zone = event.target.closest("[data-slot-zone]");
  if (!zone || !state) return;
  const index = Number(zone.dataset.slotZone);
  if (state.player.placements[index]) {
    if (
      state.phase === "preview" &&
      state.player.character.id === "momo" &&
      state.player.swapMode &&
      !state.player.swapUsed
    ) {
      handleSwapSelection(index);
      return;
    }
    openCardDetail(state.player.placements[index], index, state.phase === "plan");
  } else if (state.phase === "plan" && state.selectedUid) {
    placeSelectedCard(index);
  } else if (state.phase === "plan") {
    openSlotPicker(index);
  } else if (
    state.phase === "preview" &&
    state.player.character.id === "momo" &&
    state.player.swapMode
  ) {
    showToast("请选择两张已经放置的牌");
  } else {
    openEmptySlotDetail(index);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (!dom.deckBuilderModal.classList.contains("hidden")) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDeckBuilder();
    }
    return;
  }
  if (!dom.pileModal.classList.contains("hidden")) {
    if (event.key === "Escape" || event.key === "Enter" || event.code === "Space") {
      event.preventDefault();
      dom.pileModal.classList.add("hidden");
    }
    return;
  }
  if (!dom.protocolModal.classList.contains("hidden")) {
    if (event.key === "Escape" || event.key === "Enter" || event.code === "Space") {
      event.preventDefault();
      dom.protocolModal.classList.add("hidden");
    }
    return;
  }
  if (!dom.cardModal.classList.contains("hidden")) {
    if (event.key === "Escape" || event.key === "Enter" || event.code === "Space") {
      event.preventDefault();
      if (dom.cardModal.dataset.mode === "search") showToast("精确检索必须选择一张牌");
      else dom.cardModal.classList.add("hidden");
    }
    return;
  }
  if (!dom.helpModal.classList.contains("hidden")) {
    if (event.key === "Escape" || event.key === "Enter" || event.code === "Space") {
      event.preventDefault();
      dom.helpModal.classList.add("hidden");
    }
    return;
  }
  if (event.key === "Escape") {
    if (state?.selectedUid) {
      state.selectedUid = null;
      renderAll();
    }
    return;
  }
  if (
    !dom.characterSelect.classList.contains("hidden") &&
    (event.key === "ArrowLeft" || event.key === "ArrowRight")
  ) {
    event.preventDefault();
    const count = carouselCards().length;
    const direction = event.key === "ArrowRight" ? 1 : -1;
    selectCarouselIndex((carouselIndex + direction + count) % count);
    return;
  }
  if ((event.code === "Space" || event.key === "Enter") && !dom.characterSelect.classList.contains("hidden")) {
    event.preventDefault();
    startMatch();
    return;
  }
  if (event.code === "Space" || event.key === "Enter") {
    event.preventDefault();
    if (state?.phase === "plan" || state?.phase === "preview") confirmBattle();
    return;
  }
  if (!state || state.phase !== "plan") return;
  if (event.key.toLowerCase() === "h" || event.key === "?") {
    event.preventDefault();
    dom.helpModal.classList.remove("hidden");
    return;
  }
  const digit = Number(event.key);
  if (digit >= 1 && digit <= 5 && state.selectedUid) {
    event.preventDefault();
    placeSelectedCard(digit - 1);
  }
  if (event.key === "Backspace" || event.key === "Delete") {
    const index = state.player.placements.findIndex(Boolean);
    if (index >= 0) removePlacedCard(index);
  }
});

window.addEventListener("resize", scheduleMobileViewportUpdate, { passive: true });
window.addEventListener("orientationchange", scheduleMobileViewportUpdate);
window.screen?.orientation?.addEventListener?.("change", scheduleMobileViewportUpdate);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleMobileViewportUpdate();
});
updateMobileViewportState();
renderCharacterSelect();
renderModeSelect();
if (autoRun) {
  installAutoInputGuard();
  void runAutoSession();
}
