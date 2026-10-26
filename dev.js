const VALID_FOES = new Set(["lumi", "momo", "ruka", "dou", "gpt", "boss"]);
const VALID_PLAYERS = new Set(["lumi", "momo", "ruka", "dou", "gpt"]);

function parseAutoCount(value) {
  if (value == null || value === "") return 1;
  const count = Number(value);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

function parseSeed(value) {
  if (value == null || !/^-?\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed >>> 0 : null;
}

function normalizePlayer(value) {
  const player = value?.toLowerCase() || null;
  if (!VALID_PLAYERS.has(player)) return null;
  return player === "gpt" ? "ruka" : player;
}

export function parseDevOptions(search = "") {
  const params = new URLSearchParams(search);
  const rawFoe = params.get("foe")?.toLowerCase() || null;
  const rawDeck = params.get("deck")?.toLowerCase() || "default";
  const rawBot = params.get("bot")?.toLowerCase() || null;
  return Object.freeze({
    fast: params.has("fast"),
    seed: parseSeed(params.get("seed")),
    foe: VALID_FOES.has(rawFoe) ? rawFoe : null,
    me: normalizePlayer(params.get("me")),
    deck: rawDeck === "attack" ? "attack" : "default",
    bot: rawBot === "smart" ? "smart" : null,
    auto: params.has("auto") ? parseAutoCount(params.get("auto")) : null,
  });
}

export const DEV = parseDevOptions(window.location.search);
