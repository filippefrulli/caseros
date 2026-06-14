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
  { name: "Jewelry",                  slug: "jewelry",            description: "Handmade rings, necklaces, earrings and bracelets" },
  { name: "Prints & Digital Art",     slug: "prints-digital-art", description: "Paintings, illustrations, photography and digital prints" },
  { name: "Home Décor",               slug: "home-decor",         description: "Candles, wall hangings, textiles and decorative pieces" },
  { name: "Clothing & Knitwear",      slug: "clothing-knitwear",  description: "Handmade garments, knitted and crocheted clothing" },
  { name: "Ceramics & Pottery",       slug: "ceramics-pottery",   description: "Wheel-thrown and hand-built mugs, bowls, vases and sculptures" },
  { name: "Stationery & Paper Goods", slug: "stationery-paper",   description: "Cards, journals, notebooks and paper gifts" },
  { name: "Bath & Beauty",            slug: "bath-beauty",        description: "Handmade soaps, bath bombs, balms and skincare" },
  { name: "Embroidery",               slug: "embroidery",         description: "Hand-embroidered pieces, cross-stitch and textile art" },
];

// price in euro cents
const LISTINGS = [
  // Prints & Digital Art
  {
    slug: "seed-watercolor-botanical-print",
    categorySlug: "prints-digital-art",
    title: "Watercolor Botanical Print — Eucalyptus",
    description: "Hand-painted A4 watercolor print of eucalyptus branches. Printed on 300gsm cotton-rag paper. Unframed, ships rolled in a protective tube.\n\nEach print is individually painted, so minor variations in colour are part of the charm.",
    priceAmount: 2800,
    stock: 12,
    images: ["eucalyptus", "plants", "botanical"],
  },
  {
    slug: "seed-abstract-oil-painting",
    categorySlug: "prints-digital-art",
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
  // Home Décor
  {
    slug: "seed-beeswax-pillar-candle-set",
    categorySlug: "home-decor",
    title: "Beeswax Pillar Candle Set (3 pieces)",
    description: "Three unbleached beeswax pillar candles (6, 9 and 12 cm tall). Naturally honey-scented with a clean, long burn. Cotton wick, no additives.\n\nBurn time approx. 8, 14 and 22 hours respectively. Presented in a linen drawstring bag.",
    priceAmount: 2200,
    stock: 30,
    images: ["candle", "beeswax", "natural"],
  },
  {
    slug: "seed-macrame-wall-hanging",
    categorySlug: "home-decor",
    title: "Macramé Wall Hanging — Large",
    description: "Hand-knotted in natural unbleached cotton rope on a driftwood branch, 60 cm wide × 90 cm long. Boho-inspired design with fringe details.\n\nEach piece is made to order — allow 5–7 days before shipping.",
    priceAmount: 7800,
    stock: 6,
    images: ["macrame", "wall", "decor"],
  },
  // Ceramics & Pottery
  {
    slug: "seed-hand-thrown-ceramic-mug",
    categorySlug: "ceramics-pottery",
    title: "Hand-Thrown Stoneware Mug",
    description: "Wheel-thrown stoneware mug, holds 350 ml. Fired to cone 6 with a food-safe speckled white glaze inside and a raw, toasty exterior. Dishwasher safe.\n\nMinor variations in form and colour make each mug one of a kind.",
    priceAmount: 3400,
    stock: 20,
    images: ["mug", "ceramic", "coffee"],
  },
  {
    slug: "seed-hand-painted-ceramic-bowl",
    categorySlug: "ceramics-pottery",
    title: "Hand-Painted Terracotta Serving Bowl",
    description: "Medium terracotta bowl (22 cm diameter) hand-painted with a cobalt-blue geometric pattern. Food-safe glaze, microwave and dishwasher safe.\n\nPerfect for salads, fruit or as a centrepiece. Ships double-boxed.",
    priceAmount: 4800,
    stock: 9,
    images: ["bowl", "terracotta", "kitchen"],
  },
  // Clothing & Knitwear
  {
    slug: "seed-merino-wool-sweater",
    categorySlug: "clothing-knitwear",
    title: "Hand-Knitted Merino Wool Jumper",
    description: "Chunky hand-knitted jumper in 100% extra-fine merino wool. Relaxed fit, drop shoulder, ribbed cuffs and hem. Available in oat, slate and forest green.\n\nMachine washable on wool cycle. Please indicate your preferred colour and size (XS–XL) at checkout.",
    priceAmount: 14500,
    stock: 4,
    images: ["sweater", "knit", "wool"],
  },
  {
    slug: "seed-natural-dye-silk-scarf",
    categorySlug: "clothing-knitwear",
    title: "Hand-Dyed Silk Scarf — Botanical",
    description: "90×90 cm square scarf in habotai silk, dyed with plant extracts (weld, madder and indigo). Each piece develops unique patterns during the dye bath — no two are identical.\n\nHand-wash cold, lay flat to dry. Comes with a card describing the dye plants used.",
    priceAmount: 8900,
    stock: 7,
    images: ["scarf", "silk", "dye"],
  },
  // Stationery & Paper Goods
  {
    slug: "seed-letterpress-card-set",
    categorySlug: "stationery-paper",
    title: "Letterpress Greeting Card Set (6 cards)",
    description: "Set of 6 assorted letterpress cards printed on 400gsm cotton paper. Botanical and geometric motifs, each with a blank interior. Matching kraft envelopes included.\n\nPrinted on a vintage Heidelberg press in Edinburgh.",
    priceAmount: 1800,
    stock: 40,
    images: ["cards", "letterpress", "stationery"],
  },
  {
    slug: "seed-hand-bound-leather-journal",
    categorySlug: "stationery-paper",
    title: "Hand-Bound Leather Journal — A5",
    description: "A5 journal with a soft full-grain leather cover and 192 pages of 120gsm laid paper. Coptic-stitch binding opens completely flat. Brass clasp closure.\n\nRefillable — the cover can be reused with a new text block. Made to order, ships in 3–4 days.",
    priceAmount: 5600,
    stock: 8,
    images: ["journal", "leather", "notebook"],
  },
  // Bath & Beauty
  {
    slug: "seed-natural-soap-bar-set",
    categorySlug: "bath-beauty",
    title: "Cold-Process Soap Bar Set (4 bars)",
    description: "Four 100g cold-process soap bars: lavender & oat, rosemary & mint, calendula & honey, and unscented castile. Made with olive oil, coconut oil and shea butter — no SLS, parabens or synthetic fragrance.\n\nEach bar is hand-cut and stamped. Cured for 6 weeks for a long-lasting, skin-kind lather.",
    priceAmount: 2400,
    stock: 22,
    images: ["soap", "natural", "skincare"],
  },
  {
    slug: "seed-lavender-bath-oil",
    categorySlug: "bath-beauty",
    title: "Lavender & Chamomile Bath Oil — 100 ml",
    description: "Lightweight bath oil in sweet almond and jojoba base, scented with pure lavender and Roman chamomile essential oils. A few capfuls turn a bath silky and calming.\n\nSuitable for all skin types. Packaged in a dark-glass bottle with a dropper cap.",
    priceAmount: 1800,
    stock: 35,
    images: ["lavender", "oil", "bath"],
  },
  // Embroidery
  {
    slug: "seed-embroidered-floral-hoop",
    categorySlug: "embroidery",
    title: "Hand-Embroidered Wildflower Hoop — 20 cm",
    description: "Framed embroidery in a natural beech hoop, 20 cm diameter. Stitched in silk floss on linen: poppies, cornflowers and cow parsley in a loose botanical style.\n\nReady to hang. Each piece is unique and takes around 8 hours to complete.",
    priceAmount: 6500,
    stock: 4,
    images: ["embroidery", "floral", "hoop"],
  },
  {
    slug: "seed-cross-stitch-wildflower-kit",
    categorySlug: "embroidery",
    title: "Wildflower Meadow Cross-Stitch Kit",
    description: "Complete beginner-friendly kit: 18-count Aida cloth, full colour chart, DMC thread, needle and 15 cm hoop. The design features 12 meadow flowers across a 12×15 cm finished area.\n\nInstructions in English, French and Spanish. Suitable for ages 12+.",
    priceAmount: 2200,
    stock: 30,
    images: ["crossstitch", "kit", "needlework"],
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
  .finally(async () => { await prisma.$disconnect(); process.exit(0); });
