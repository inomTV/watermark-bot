// ========================================================
// TELEGRAM WATERMARK LOGO BOT (Node.js + Sharp + grammY)
// Standalone 24/7 Production Script for Render.com
// ========================================================

const { Bot, InputFile } = require("grammy");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const http = require("http");

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN topilmadi! Render Environment Variables ga BOT_TOKEN ni kiriting.");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// Watermark sozlamalari
const WATERMARK_CONFIG = {
  position: "bottom-right",
  scale: 25, // Rasmni 25% qismini egallaydigan qulay optimal o'lcham
  opacity: 0.95,
  rotation: 0,
  margin: 20,
  offsetX: 0,
  offsetY: 0,
  replyCaption: "✅ Rasmingizga logotip muvaffaqiyatli joylashtirildi!"
};

// Logotipni olish (logo.png bo'lsa uni oladi)
function getActiveLogoBuffer() {
  const localLogoPath = path.join(__dirname, "logo.png");
  if (fs.existsSync(localLogoPath)) {
    console.log("📁 'logo.png' muvaffaqiyatli yuklandi!");
    return fs.readFileSync(localLogoPath);
  }
  return Buffer.from('<svg width="300" height="80"><text x="10" y="50" fill="white" font-size="30">LOGO</text></svg>');
}

async function applyWatermark(imageBuffer) {
  const baseImg = sharp(imageBuffer);
  const metadata = await baseImg.metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 600;

  const logoBuffer = getActiveLogoBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  const logoWidth = logoMeta.width || 200;
  const logoHeight = logoMeta.height || 100;
  const logoAspect = logoWidth / logoHeight;

  // Rasmdan chiqib ketmaydigan xavfsiz o'lcham hisoblash
  const margin = Math.max(0, WATERMARK_CONFIG.margin || 20);
  const maxAllowedW = Math.max(30, imgWidth - margin * 2);
  const maxAllowedH = Math.max(30, imgHeight - margin * 2);

  let scaleRatio = (WATERMARK_CONFIG.scale || 25) / 100;
  if (scaleRatio > 0.6) {
    scaleRatio = 0.25;
  }

  let targetLogoWidth = Math.round(imgWidth * scaleRatio);
  let targetLogoHeight = Math.round(targetLogoWidth / logoAspect);

  if (targetLogoWidth > maxAllowedW) {
    targetLogoWidth = maxAllowedW;
    targetLogoHeight = Math.max(10, Math.round(targetLogoWidth / logoAspect));
  }
  if (targetLogoHeight > maxAllowedH) {
    targetLogoHeight = maxAllowedH;
    targetLogoWidth = Math.max(10, Math.round(targetLogoHeight * logoAspect));
  }

  let processedLogo = sharp(logoBuffer).resize(targetLogoWidth, targetLogoHeight, { fit: "contain" });

  if (WATERMARK_CONFIG.rotation !== 0) {
    processedLogo = processedLogo.rotate(WATERMARK_CONFIG.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }

  const resizedLogoBuffer = await processedLogo.png().toBuffer();
  const rotatedMeta = await sharp(resizedLogoBuffer).metadata();
  const finalW = Math.min(imgWidth, rotatedMeta.width || targetLogoWidth);
  const finalH = Math.min(imgHeight, rotatedMeta.height || targetLogoHeight);

  let left = margin;
  let top = margin;

  switch (WATERMARK_CONFIG.position) {
    case "top-left": left = margin; top = margin; break;
    case "top-right": left = imgWidth - finalW - margin; top = margin; break;
    case "bottom-left": left = margin; top = imgHeight - finalH - margin; break;
    case "bottom-right": left = imgWidth - finalW - margin; top = imgHeight - finalH - margin; break;
    case "center": left = Math.round((imgWidth - finalW) / 2); top = Math.round((imgHeight - finalH) / 2); break;
    default: left = imgWidth - finalW - margin; top = imgHeight - finalH - margin; break;
  }

  left = Math.max(0, Math.min(imgWidth - finalW, left + (WATERMARK_CONFIG.offsetX || 0)));
  top = Math.max(0, Math.min(imgHeight - finalH, top + (WATERMARK_CONFIG.offsetY || 0)));

  let compositingBuffer = resizedLogoBuffer;
  if (WATERMARK_CONFIG.opacity < 0.99) {
    compositingBuffer = await sharp(resizedLogoBuffer)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(WATERMARK_CONFIG.opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in"
      }])
      .toBuffer();
  }

  return baseImg
    .composite([{ input: compositingBuffer, left, top }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// /start komandasi
bot.command("start", (ctx) => ctx.reply("Ассалому алайкум! Менга расм жўнатинг, мен унга логотипингизни жойлаб бераман."));

// Rasmlarni qabul qilish
bot.on("message:photo", async (ctx) => {
  try {
    const photo = ctx.message.photo.pop();
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

// Render.com Web Service Port binding
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Telegram Watermark Bot 24/7 rejimda muvaffaqiyatli ishlamoqda!");
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server port ${PORT} da tinglamoqda`);
});

// Botni ishga tushirish
bot.start();
console.log("🚀 Telegram Watermark Bot muvaffaqiyatli ishga tushdi!");
