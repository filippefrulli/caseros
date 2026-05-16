import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const CATEGORIES = [
  { name: "Art & Prints",   slug: "art-prints",    description: "Paintings, drawings, illustrations, photography and prints" },
  { name: "Jewelry",        slug: "jewelry",        description: "Handmade rings, necklaces, earrings and bracelets" },
  { name: "Home & Living",  slug: "home-living",    description: "Ceramics, candles, textiles and home decor" },
  { name: "Clothing",       slug: "clothing",       description: "Handmade garments, knitwear and embroidery" },
  { name: "Accessories",    slug: "accessories",    description: "Handmade bags, scarves, hats and belts" },
  { name: "Stationery",     slug: "stationery",     description: "Cards, notebooks, gift wrap and planners" },
  { name: "Toys & Play",    slug: "toys-play",      description: "Handmade toys, plushies, puzzles and games" },
  { name: "Food & Drink",   slug: "food-drink",     description: "Artisan preserves, baked goods, teas and honey" },
  { name: "Craft Supplies", slug: "craft-supplies", description: "Yarn, fabric, tools and materials for makers" },
  { name: "Vintage",        slug: "vintage",        description: "Vintage items, antiques and pre-loved pieces" },
];

// price in euro cents
const LISTINGS = [
  // Art & Prints
  {
    slug: "seed-watercolor-botanical-print",
    categorySlug: "art-prints",
    title: "Watercolor Botanical Print — Eucalyptus",
    description: "Hand-painted A4 watercolor print of eucalyptus branches. Printed on 300gsm cotton-rag paper. Unframed, ships rolled in a protective tube.\n\nEach print is individually painted, so minor variations in colour are part of the charm.",
    priceAmount: 2800,
    stock: 12,
    images: ["eucalyptus", "plants", "botanical"],
  },
  {
    slug: "seed-abstract-oil-painting",
    categorySlug: "art-prints",
    title: "Original Abstract Oil Painting — Dusk",
    description: "Original oil on canvas, 40×50 cm. Rich ochre, burnt sienna and deep indigo tones — inspired by the Mediterranean coastline at dusk.\n\nVarnished and ready to hang. Ships with bubble wrap and a certificate of authenticity.",
    priceAmount: 18500,
    stock: 1,
    images: ["painting", "abstract", "art"],
  },
  // Jewelry
  {
    slug: "seed-sterling-silver-leaf-ring",
    categorySlug: "jewelry",
    title: "Sterling Silver Pressed-Leaf Ring",
    description: "Delicate ring cast from a real fern leaf in 925 sterling silver. Textured surface preserves every detail of the original frond.\n\nAvailable in sizes 48–58. Please note your size at checkout.",
    priceAmount: 4500,
    stock: 8,
    images: ["ring", "silver", "jewelry"],
  },
  {
    slug: "seed-ceramic-bead-necklace",
    categorySlug: "jewelry",
    title: "Handmade Ceramic Bead Necklace",
    description: "Glazed stoneware beads strung on waxed linen cord, 46 cm length with a brass clasp. Each bead is individually thrown and glazed in a soft sage–cream palette.\n\nComes in a recycled kraft gift box.",
    priceAmount: 6200,
    stock: 5,
    images: ["necklace", "ceramic", "beads"],
  },
  {
    slug: "seed-gold-filled-hoop-earrings",
    categorySlug: "jewelry",
    title: "14k Gold-Filled Hammered Hoop Earrings",
    description: "Lightweight 30 mm hoops, hand-hammered for a subtle organic texture. Gold-filled (not plated) — the gold layer is thick enough to last years with everyday wear.\n\nNickel-free and suitable for sensitive ears.",
    priceAmount: 3800,
    stock: 14,
    images: ["earrings", "gold", "hoops"],
  },
  // Home & Living
  {
    slug: "seed-hand-thrown-ceramic-mug",
    categorySlug: "home-living",
    title: "Hand-Thrown Stoneware Mug",
    description: "Wheel-thrown stoneware mug, holds 350 ml. Fired to cone 6 with a food-safe speckled white glaze inside and a raw, toasty exterior. Dishwasher safe.\n\nMinor variations in form and colour make each mug one of a kind.",
    priceAmount: 3400,
    stock: 20,
    images: ["mug", "ceramic", "coffee"],
  },
  {
    slug: "seed-beeswax-pillar-candle-set",
    categorySlug: "home-living",
    title: "Beeswax Pillar Candle Set (3 pieces)",
    description: "Three unbleached beeswax pillar candles (6, 9 and 12 cm tall). Naturally honey-scented with a clean, long burn. Cotton wick, no additives.\n\nBurn time approx. 8, 14 and 22 hours respectively. Presented in a linen drawstring bag.",
    priceAmount: 2200,
    stock: 30,
    images: ["candle", "beeswax", "natural"],
  },
  {
    slug: "seed-macrame-wall-hanging",
    categorySlug: "home-living",
    title: "Macramé Wall Hanging — Large",
    description: "Hand-knotted in natural unbleached cotton rope on a driftwood branch, 60 cm wide × 90 cm long. Boho-inspired design with fringe details.\n\nEach piece is made to order — allow 5–7 days before shipping.",
    priceAmount: 7800,
    stock: 6,
    images: ["macrame", "wall", "decor"],
  },
  {
    slug: "seed-hand-painted-ceramic-bowl",
    categorySlug: "home-living",
    title: "Hand-Painted Terracotta Serving Bowl",
    description: "Medium terracotta bowl (22 cm diameter) hand-painted with a cobalt-blue geometric pattern. Food-safe glaze, microwave and dishwasher safe.\n\nPerfect for salads, fruit or as a centrepiece. Ships double-boxed.",
    priceAmount: 4800,
    stock: 9,
    images: ["bowl", "terracotta", "kitchen"],
  },
  // Clothing
  {
    slug: "seed-merino-wool-sweater",
    categorySlug: "clothing",
    title: "Hand-Knitted Merino Wool Jumper",
    description: "Chunky hand-knitted jumper in 100% extra-fine merino wool. Relaxed fit, drop shoulder, ribbed cuffs and hem. Available in oat, slate and forest green.\n\nMachine washable on wool cycle. Please indicate your preferred colour and size (XS–XL) at checkout.",
    priceAmount: 14500,
    stock: 4,
    images: ["sweater", "knit", "wool"],
  },
  {
    slug: "seed-natural-dye-silk-scarf",
    categorySlug: "clothing",
    title: "Hand-Dyed Silk Scarf — Botanical",
    description: "90×90 cm square scarf in habotai silk, dyed with plant extracts (weld, madder and indigo). Each piece develops unique patterns during the dye bath — no two are identical.\n\nHand-wash cold, lay flat to dry. Comes with a card describing the dye plants used.",
    priceAmount: 8900,
    stock: 7,
    images: ["scarf", "silk", "dye"],
  },
  {
    slug: "seed-linen-tote-bag",
    categorySlug: "accessories",
    title: "Embroidered Linen Tote Bag",
    description: "Heavy-weight natural linen tote (38×42 cm, 10 L capacity) with hand-embroidered wildflower motif. Long handles, fully washable.\n\nFair-trade linen sourced from Lithuania. Embroidery takes 3–4 hours per bag.",
    priceAmount: 5200,
    stock: 11,
    images: ["tote", "linen", "bag"],
  },
  // Accessories
  {
    slug: "seed-leather-crossbody-bag",
    categorySlug: "accessories",
    title: "Vegetable-Tanned Leather Crossbody Bag",
    description: "Hand-stitched crossbody bag in full-grain vegetable-tanned leather, 26×18 cm with a front slip pocket. Adjustable strap, solid brass hardware.\n\nThe leather will develop a rich patina over time. Handmade in Spain.",
    priceAmount: 12800,
    stock: 3,
    images: ["leather", "bag", "crossbody"],
  },
  {
    slug: "seed-hand-woven-wool-hat",
    categorySlug: "accessories",
    title: "Hand-Woven Alpaca Wool Hat",
    description: "Cosy bucket hat woven in a blend of baby alpaca and merino wool. One size fits most (adjustable inner ribbon). Available in terracotta, ecru and midnight blue.\n\nWarm yet lightweight — perfect for autumn and mild winters.",
    priceAmount: 4200,
    stock: 16,
    images: ["hat", "wool", "alpaca"],
  },
  // Stationery
  {
    slug: "seed-letterpress-card-set",
    categorySlug: "stationery",
    title: "Letterpress Greeting Card Set (6 cards)",
    description: "Set of 6 assorted letterpress cards printed on 400gsm cotton paper. Botanical and geometric motifs, each with a blank interior. Matching kraft envelopes included.\n\nPrinted on a vintage Heidelberg press in Edinburgh.",
    priceAmount: 1800,
    stock: 40,
    images: ["cards", "letterpress", "stationery"],
  },
  {
    slug: "seed-hand-bound-leather-journal",
    categorySlug: "stationery",
    title: "Hand-Bound Leather Journal — A5",
    description: "A5 journal with a soft full-grain leather cover and 192 pages of 120gsm laid paper. Coptic-stitch binding opens completely flat. Brass clasp closure.\n\nRefillable — the cover can be reused with a new text block. Made to order, ships in 3–4 days.",
    priceAmount: 5600,
    stock: 8,
    images: ["journal", "leather", "notebook"],
  },
  // Toys & Play
  {
    slug: "seed-wooden-stacking-blocks",
    categorySlug: "toys-play",
    title: "Organic Wood Stacking Blocks (12 pieces)",
    description: "Set of 12 smooth beech-wood blocks in four shapes: cube, cylinder, arch and cone. Finished with food-safe beeswax — no paint or stain.\n\nSuitable from 12 months. Comes in a cotton muslin drawstring bag. FSC-certified timber.",
    priceAmount: 3200,
    stock: 25,
    images: ["blocks", "wood", "toys"],
  },
  {
    slug: "seed-felt-animal-set",
    categorySlug: "toys-play",
    title: "Hand-Sewn Felt Farm Animal Set (5 pieces)",
    description: "Five hand-sewn felt animals: cow, sheep, pig, hen and horse. Stuffed with hypoallergenic polyester filling, hand-embroidered faces.\n\nApproximately 10 cm tall. Suitable for ages 3+. All materials meet EN 71 toy safety standards.",
    priceAmount: 4400,
    stock: 18,
    images: ["felt", "animals", "toys"],
  },
  // Food & Drink
  {
    slug: "seed-wildflower-honey",
    categorySlug: "food-drink",
    title: "Raw Wildflower Honey — 250 g",
    description: "Unpasteurised single-origin wildflower honey from family beehives in the Pyrenees foothills. Cold-extracted and coarse-filtered to preserve pollen, enzymes and natural aroma.\n\nMay crystallise naturally — this is a sign of quality, not a defect. Best before 24 months from harvest.",
    priceAmount: 1200,
    stock: 50,
    images: ["honey", "jar", "food"],
  },
  // Vintage
  {
    slug: "seed-1970s-ceramic-vase",
    categorySlug: "vintage",
    title: "1970s West German Ceramic Vase — Lava Glaze",
    description: "Vintage West German fat-lava vase, approx. 22 cm tall, in excellent condition with no chips or cracks. Deep orange and brown volcanic glaze typical of the era.\n\nStamped on the base with the maker's mark. A characterful piece for any shelf or mantelpiece.",
    priceAmount: 6800,
    stock: 1,
    images: ["vase", "vintage", "ceramic"],
  },
];

function placeholderImages(seeds: string[]): { url: string; position: number }[] {
  return seeds.map((seed, position) => ({
    url: `https://picsum.photos/seed/${seed}/600/600`,
    position,
  }));
}

async function main() {
  // ── Categories ──────────────────────────────────────────────────────────────
  console.log("\nSeeding categories…");
  const categoryMap = new Map<string, string>();

  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
    console.log(`  ✓ ${cat.name}`);
  }

  // ── Seller ──────────────────────────────────────────────────────────────────
  console.log("\nLooking for an existing seller…");
  const seller = await prisma.sellerProfile.findFirst();

  if (!seller) {
    console.log("  ✗ No seller found. Open a shop in the app first, then re-run this seed.");
    return;
  }

  console.log(`  ✓ Using seller: ${seller.shopName}`);

  // ── Listings ────────────────────────────────────────────────────────────────
  console.log("\nSeeding listings…");

  for (const item of LISTINGS) {
    const existing = await prisma.listing.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });

    if (existing) {
      console.log(`  – skipped (already exists): ${item.title}`);
      continue;
    }

    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      console.log(`  ✗ Category not found for slug "${item.categorySlug}", skipping ${item.title}`);
      continue;
    }

    await prisma.listing.create({
      data: {
        sellerId:    seller.id,
        categoryId,
        title:       item.title,
        slug:        item.slug,
        description: item.description,
        priceAmount: item.priceAmount,
        currency:    seller.currency,
        stock:       item.stock,
        status:      "ACTIVE",
        images: {
          create: placeholderImages(item.images),
        },
      },
    });

    console.log(`  ✓ ${item.title} (€${(item.priceAmount / 100).toFixed(2)})`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
