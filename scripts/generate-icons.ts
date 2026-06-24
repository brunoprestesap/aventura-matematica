import sharp from "sharp";
import { readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

const svgFull = readFileSync(join(root, "assets/icon-source.svg"));
const svgAdaptive = readFileSync(join(root, "assets/icon-source-adaptive.svg"));
const svgSplash = readFileSync(join(root, "assets/splash-source.svg"));
const svgOgImage = readFileSync(join(root, "assets/og-image-source.svg"));

// Cria versão maskable com fundo #CCFBF1 (safe zone para ícones adaptáveis)
const svgAdaptiveStr = svgAdaptive.toString("utf-8");
const maskableBackgroundRect =
  '<rect width="1024" height="1024" fill="#CCFBF1"/>';
const svgMaskable = Buffer.from(
  svgAdaptiveStr.replace(
    /(<svg[^>]*>)/,
    `$1\n  ${maskableBackgroundRect}`
  )
);

const icons: Array<{ svg: Buffer | string; out: string; size: number }> = [
  // Expo / App Store
  { svg: svgFull, out: "continha-magica-app/assets/icon.png", size: 1024 },
  {
    svg: svgAdaptive,
    out: "continha-magica-app/assets/adaptive-icon.png",
    size: 1024,
  },
  { svg: svgSplash, out: "continha-magica-app/assets/splash.png", size: 1284 },

  // PWA
  { svg: svgFull, out: "public/icons/icon-192x192.png", size: 192 },
  { svg: svgFull, out: "public/icons/icon-512x512.png", size: 512 },
  { svg: svgMaskable, out: "public/icons/maskable-icon-512x512.png", size: 512 },
  { svg: svgFull, out: "public/apple-touch-icon.png", size: 180 },

  // SEO — og:image (tamanho dummy; tratado como caso especial abaixo)
  { svg: svgOgImage, out: "public/og-image.png", size: 1200 },
];

async function main() {
  for (const { svg, out, size } of icons) {
    const isSplash = out.includes("splash");
    const isOgImage = out.includes("og-image");
    const pipeline = sharp(svg);

    if (isSplash) {
      // O splash já possui dimensões exatas no viewBox (1284×2778)
      pipeline.resize(1284, 2778, { fit: "contain" });
    } else if (isOgImage) {
      // og:image padrão Open Graph: 1200×630
      pipeline.resize(1200, 630, { fit: "fill" });
    } else {
      pipeline.resize(size, size, { fit: "contain" });
    }

    await pipeline.png().toFile(out);
    console.log(`✓ ${out} gerado`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
