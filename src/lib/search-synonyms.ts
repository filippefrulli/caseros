// Each group is a set of interchangeable search terms for a handmade goods marketplace.
// Groups are bidirectional: searching any term in a group expands to all others.
// Keep terms as single words, multi-word phrases don't work in to_tsquery lexemes.

const GROUPS: string[][] = [
  // ── Stationery ─────────────────────────────────────────────────────────────
  ["notebook", "journal", "diary", "notepad", "jotter", "sketchbook", "planner", "logbook"],
  ["card", "postcard", "stationery"],
  ["bookmark", "pagemarker"],

  // ── Jewelry ────────────────────────────────────────────────────────────────
  ["necklace", "pendant", "choker", "collar", "chain"],
  ["earrings", "studs", "hoops", "drops", "dangles"],
  ["ring", "band", "signet"],
  ["bracelet", "bangle", "cuff", "armband", "wristband"],
  ["brooch", "pin", "badge", "clip"],
  ["anklet", "anklet"],

  // ── Mugs & Drinkware ───────────────────────────────────────────────────────
  ["mug", "cup", "tumbler", "beaker", "goblet"],

  // ── Vessels & Containers ───────────────────────────────────────────────────
  ["vase", "vessel", "urn", "jug", "pitcher", "carafe"],
  ["bowl", "dish", "basin", "platter"],
  ["plate", "charger", "saucer"],
  ["pot", "planter", "jar", "canister", "crock"],
  ["basket", "hamper", "wicker"],
  ["tray", "board", "trivet"],

  // ── Candles & Fragrance ────────────────────────────────────────────────────
  ["candle", "taper", "tealight", "votive", "pillar"],
  ["diffuser", "fragrance", "scent", "incense"],
  ["soap", "cleanser", "balm"],

  // ── Soft Furnishings ───────────────────────────────────────────────────────
  ["cushion", "pillow", "bolster"],
  ["blanket", "throw", "quilt", "comforter", "bedspread"],
  ["rug", "mat", "carpet", "runner", "doormat"],
  ["towel", "cloth"],

  // ── Wall & Surface ─────────────────────────────────────────────────────────
  ["mirror", "reflector"],
  ["lamp", "lantern", "lightshade", "light"],
  ["clock", "timepiece"],

  // ── Clothing: Tops ─────────────────────────────────────────────────────────
  ["sweater", "jumper", "pullover", "knitwear", "jersey"],
  ["cardigan", "layer"],
  ["shirt", "blouse", "tee", "top"],
  ["dress", "frock", "gown", "shift"],
  ["apron", "pinafore", "smock"],
  ["kimono", "robe", "wrap"],

  // ── Clothing: Bottoms ──────────────────────────────────────────────────────
  ["trousers", "pants", "bottoms", "slacks"],
  ["skirt", "miniskirt", "midi", "maxi"],
  ["overalls", "dungarees", "coveralls"],

  // ── Outerwear ──────────────────────────────────────────────────────────────
  ["jacket", "coat", "blazer", "outerwear", "overcoat"],

  // ── Hats & Headwear ────────────────────────────────────────────────────────
  ["hat", "cap", "beanie", "beret", "headwear", "bonnet", "toque", "fedora",
   "cloche", "boater", "bucket"],

  // ── Scarves & Wraps ────────────────────────────────────────────────────────
  ["scarf", "shawl", "stole", "muffler", "snood", "neckerchief", "wrap", "pashmina"],

  // ── Gloves ─────────────────────────────────────────────────────────────────
  ["gloves", "mittens", "gauntlets"],

  // ── Socks & Hosiery ────────────────────────────────────────────────────────
  ["socks", "stockings", "hosiery"],

  // ── Hair Accessories ───────────────────────────────────────────────────────
  ["scrunchie", "hairband", "headband", "hairtie", "hairclip", "barrette"],

  // ── Bags ───────────────────────────────────────────────────────────────────
  ["bag", "purse", "tote", "satchel", "pouch", "clutch", "handbag"],
  ["backpack", "rucksack", "knapsack", "daypack"],
  ["wallet", "cardholder", "billfold"],
  ["belt", "strap", "sash", "waistband"],
  ["keychain", "keyring", "fob"],

  // ── Toys & Play ────────────────────────────────────────────────────────────
  ["toy", "plaything", "game", "activity"],
  ["puzzle", "jigsaw"],
  ["doll", "plush", "plushie", "teddy", "puppet"],
  ["blocks", "bricks"],

  // ── Art & Prints ───────────────────────────────────────────────────────────
  ["print", "poster", "artwork", "illustration", "lithograph", "reproduction"],
  ["painting", "canvas", "original"],
  ["drawing", "sketch"],
  ["watercolor", "aquarelle"],
  ["photograph", "photo", "print"],

  // ── Food ───────────────────────────────────────────────────────────────────
  ["jam", "preserve", "conserve", "marmalade", "jelly", "spread"],
  ["chutney", "relish", "condiment", "pickle"],
  ["tea", "infusion", "tisane"],
  ["biscuit", "cookie", "shortbread"],
  ["cake", "loaf", "tart", "gateau"],
  ["bread", "loaf", "sourdough"],
  ["sauce", "dressing", "dip"],
  ["chocolate", "cocoa", "cacao", "confection"],
  ["coffee", "espresso", "brew"],
  ["oil", "infusion"],

  // ── Craft Supplies ─────────────────────────────────────────────────────────
  ["yarn", "wool", "fleece", "fiber", "roving"],
  ["fabric", "cloth", "textile", "material"],
  ["thread", "string", "twine", "cord", "floss"],
  ["ribbon", "trim", "band"],
  ["button", "fastener", "clasp", "snap"],
  ["stamp", "seal"],

  // ── Materials ──────────────────────────────────────────────────────────────
  ["ceramic", "pottery", "stoneware", "earthenware", "terracotta", "porcelain", "clay"],
  ["leather", "suede", "hide"],
  ["wood", "wooden", "timber", "oak", "walnut", "beech"],
  ["linen", "cotton", "silk"],
  ["merino", "alpaca", "cashmere", "mohair"],
  ["glass", "crystal", "glassware"],
  ["resin", "epoxy"],
  ["stone", "marble", "granite", "slate"],
  ["silver", "sterling", "gold", "brass", "copper", "bronze"],

  // ── Techniques ─────────────────────────────────────────────────────────────
  ["knitted", "crocheted", "woven", "handwoven", "knitwear"],
  ["embroidered", "embroidery", "needlework", "crossstitch", "stitched"],
  ["printed", "screenprinted", "blockprinted", "letterpress"],
  ["painted", "handpainted"],
  ["dyed", "tiedye", "batik", "handyed"],
  ["carved", "engraved", "etched"],
  ["felted", "felt"],
  ["macrame", "knotted"],

  // ── Styles & Aesthetics ────────────────────────────────────────────────────
  ["vintage", "antique", "retro", "secondhand", "preloved", "classic", "heirloom"],
  ["handmade", "artisan", "handcrafted", "bespoke", "crafted", "homemade"],
  ["boho", "bohemian", "eclectic", "folk"],
  ["rustic", "farmhouse", "country", "primitive", "earthy"],
  ["minimalist", "minimal", "simple", "contemporary", "modern", "sleek"],
  ["organic", "natural", "sustainable", "ecological", "ecofriendly"],
  ["personalized", "custom", "customized", "monogrammed", "engraved", "bespoke"],

  // ── Occasions & Purpose ────────────────────────────────────────────────────
  ["gift", "present", "keepsake", "souvenir", "memento", "token"],
  ["wedding", "bridal", "marriage", "nuptial", "bride"],
  ["birthday", "anniversary", "celebration"],
  ["christmas", "xmas", "festive", "holiday", "yuletide"],
  ["baby", "infant", "newborn", "nursery"],
  ["kids", "children", "toddler", "child", "youth"],
  ["decoration", "decor", "ornament", "accessory"],

  // ── Rooms & Spaces ─────────────────────────────────────────────────────────
  ["garden", "outdoor", "patio", "terrace", "balcony"],
  ["kitchen", "dining", "culinary"],
  ["bedroom", "sleeping", "boudoir"],
  ["bathroom", "bath", "washroom"],
  ["office", "desk", "workspace", "study"],
];

// Build a bidirectional lookup: every term maps to all other terms in its group(s).
// A term can appear in multiple groups; its synonyms are the union of all groups it belongs to.
const synonymMap = new Map<string, Set<string>>();

for (const group of GROUPS) {
  for (const term of group) {
    if (!synonymMap.has(term)) synonymMap.set(term, new Set());
    for (const other of group) {
      if (other !== term) synonymMap.get(term)!.add(other);
    }
  }
}

// Build a to_tsquery compatible string from the user's query.
// Each word is expanded to (word | syn1 | syn2 | …) and words are AND-ed together.
// Returns null if the cleaned query is empty.
export function buildSearchQuery(userQuery: string): string | null {
  const words = userQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2);

  if (!words.length) return null;

  const parts = words.map((word) => {
    const syns = synonymMap.get(word);
    if (!syns || syns.size === 0) return word;
    return `(${[word, ...syns].join(" | ")})`;
  });

  return parts.join(" & ");
}
