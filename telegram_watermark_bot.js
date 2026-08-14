// ========================================================
// TELEGRAM WATERMARK LOGO BOT (Node.js + Sharp + grammY)
// Auto-generated production script
// ========================================================

const { Bot, InputFile } = require("grammy");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const BOT_TOKEN = process.env.BOT_TOKEN || "8990050422:AAHAz-pG9hmCnd-5xroYDkZSR3LNFIuM9WQ";

if (!BOT_TOKEN || BOT_TOKEN.includes("YOUR_TELEGRAM")) {
  console.error("❌ Илтимос, BOT_TOKEN ни .env файлига киритинг!");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Watermark configurations
const WATERMARK_CONFIG = {
  position: "bottom-right",
  scale: 25, // 25% of image width
  opacity: 0.85,
  rotation: 0,
  margin: 20,
  offsetX: 0,
  offsetY: 0,
  replyCaption: "✅ Рaсмга логотип муваффақиятли жойлаштирилди!"
};

// Base64 or path to logo
const LOGO_DATA = `data:image/svg+xml;utf8,%0A%20%20%20%20%20%20%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22120%22%20viewBox%3D%220%200%20300%20120%22%3E%0A%20%20%20%20%20%20%20%20%3Crect%20width%3D%22280%22%20height%3D%22100%22%20x%3D%2210%22%20y%3D%2210%22%20rx%3D%2220%22%20fill%3D%22rgba(0%2C0%2C0%2C0.5)%22%20stroke%3D%22white%22%20stroke-width%3D%223%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ccircle%20cx%3D%2250%22%20cy%3D%2260%22%20r%3D%2225%22%20fill%3D%22%233B82F6%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Cpath%20d%3D%22M42%2060%20L48%2066%20L60%2052%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2290%22%20y%3D%2252%22%20fill%3D%22white%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22bold%22%20font-size%3D%2220%22%3EOFFICIAL%20LOGO%3C%2Ftext%3E%0A%20%20%20%20%20%20%20%20%3Ctext%20x%3D%2290%22%20y%3D%2275%22%20fill%3D%22%23E2E8F0%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%2214%22%3E%40telegram_channel%3C%2Ftext%3E%0A%20%20%20%20%20%20%3C%2Fsvg%3E%0A%20%20%20%20`;

async function applyWatermark(imageBuffer) {
  const baseImg = sharp(imageBuffer);
  const metadata = await baseImg.metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 600;

  // Prepare logo buffer
  let logoBuffer;
  if (LOGO_DATA.startsWith('data:image/svg+xml;utf8,')) {
    const svgContent = decodeURIComponent(LOGO_DATA.replace('data:image/svg+xml;utf8,', ''));
    logoBuffer = Buffer.from(svgContent);
  } else if (LOGO_DATA.startsWith('data:image/')) {
    const base64Data = LOGO_DATA.split(',')[1];
    logoBuffer = Buffer.from(base64Data, 'base64');
  } else {
    logoBuffer = Buffer.from('<svg width="300" height="80"><text x="10" y="50" fill="white" font-size="30">LOGO</text></svg>');
  }

  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width || 200;
  const logoHeight = logoMeta.height || 100;
  const logoAspect = logoWidth / logoHeight;

  const targetLogoWidth = Math.round(imgWidth * (WATERMARK_CONFIG.scale / 100));
  const targetLogoHeight = Math.round(targetLogoWidth / logoAspect);

  let processedLogo = sharp(logoBuffer).resize(targetLogoWidth, targetLogoHeight, { fit: 'contain' });

  if (WATERMARK_CONFIG.rotation !== 0) {
    processedLogo = processedLogo.rotate(WATERMARK_CONFIG.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }

  const resizedLogoBuffer = await processedLogo.png().toBuffer();
  const rotatedMeta = await sharp(resizedLogoBuffer).metadata();
  const finalW = rotatedMeta.width || targetLogoWidth;
  const finalH = rotatedMeta.height || targetLogoHeight;

  const margin = WATERMARK_CONFIG.margin;
  let left = margin;
  let top = margin;

  switch (WATERMARK_CONFIG.position) {
    case 'top-left': left = margin; top = margin; break;
    case 'top-right': left = imgWidth - finalW - margin; top = margin; break;
    case 'bottom-left': left = margin; top = imgHeight - finalH - margin; break;
    case 'bottom-right': left = imgWidth - finalW - margin; top = imgHeight - finalH - margin; break;
    case 'center': left = Math.round((imgWidth - finalW) / 2); top = Math.round((imgHeight - finalH) / 2); break;
    case 'custom': left = Math.round((imgWidth - finalW) / 2 + WATERMARK_CONFIG.offsetX); top = Math.round((imgHeight - finalH) / 2 + WATERMARK_CONFIG.offsetY); break;
  }

  left = Math.max(0, Math.min(imgWidth - finalW, left + WATERMARK_CONFIG.offsetX));
  top = Math.max(0, Math.min(imgHeight - finalH, top + WATERMARK_CONFIG.offsetY));

  let compositingBuffer = resizedLogoBuffer;
  if (WATERMARK_CONFIG.opacity < 0.99) {
    compositingBuffer = await sharp(resizedLogoBuffer)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(WATERMARK_CONFIG.opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in'
      }])
      .toBuffer();
  }

  return baseImg
    .composite([{ input: compositingBuffer, left, top }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// /start command
bot.command("start", (ctx) => ctx.reply("Ассалому алайкум! Менга расм жўнатинг, мен унга логотипингизни жойлаб бераман."));

// Handle photo uploads
bot.on("message:photo", async (ctx) => {
  try {
    const photo = ctx.message.photo.pop(); // highest res
    const file = await ctx.getFile();
    const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const res = await fetch(downloadUrl);
    const arrayBuf = await res.arrayBuffer();
    const inputBuf = Buffer.from(arrayBuf);

    const watermarkedBuf = await applyWatermark(inputBuf);

    await ctx.replyWithPhoto(new InputFile(watermarkedBuf, "watermarked.jpg"), {
      caption: ctx.message.caption || WATERMARK_CONFIG.replyCaption
    });
  } catch (err) {
    console.error("Error processing photo:", err);
    await ctx.reply("❌ Расмни қайта ишлашда хатолик юз берди.");
  }
});

bot.start();
console.log("🚀 Telegram Watermark Bot muvaffaqiyatli ishga tushdi!");
