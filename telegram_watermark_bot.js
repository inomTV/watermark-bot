// ========================================================
// TELEGRAM FULL-IMAGE WATERMARK BOT (Node.js + Sharp + grammY)
// 100% Full-Screen Overlay with '00000000000000.png'
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
  opacity: 1.0, // 100% to'liq ko'rinish (kerak bo'lsa 0.9 yoki 0.8 qilishingiz mumkin)
  replyCaption: "✅ Расмингизга логотип 100% муваффақиятли жойлаштирилди!"
};

// 00000000000000.png faylini olish
function getActiveLogoBuffer() {
  const possibleNames = [
    "00000000000000.png",
    "logo.png"
  ];

  for (const name of possibleNames) {
    const localPath = path.join(__dirname, name);
    if (fs.existsSync(localPath)) {
      console.log(`📁 Logotip fayli '${name}' muvaffaqiyatli topildi va yuklandi!`);
      return fs.readFileSync(localPath);
    }
  }

  console.warn("⚠️ Maxsus fayl topilmadi, standart o'lcham olinmoqda.");
  return Buffer.from('<svg width="800" height="600"><text x="100" y="300" fill="white" font-size="60">LOGO</text></svg>');
}

// Rasmni butun 100% ustiga logotipni qoplash (Full 100% Overlay)
async function applyWatermark(imageBuffer) {
  const baseImg = sharp(imageBuffer);
  const metadata = await baseImg.metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 600;

  const logoBuffer = getActiveLogoBuffer();

  // Logotipni kelgan rasmning 100% aniq eni va bo'yiga to'liq moslab cho'zish
  let processedLogo = sharp(logoBuffer).resize(imgWidth, imgHeight, {
    fit: "fill" // 100% butun rasmni to'liq qoplaydi
  });

  let resizedLogoBuffer = await processedLogo.png().toBuffer();
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
    .composite([{ input: compositingBuffer, left: 0, top: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();
}

// /start komandasi
bot.command("start", (ctx) => ctx.reply("Ассалому алайкум! Менга расм жўнатинг, мен унга 100% логотипингизни жойлаб бераман."));

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

// Render.com Web Service Port binding (24/7 rejim)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Telegram 100% Watermark Bot 24/7 rejimda muvaffaqiyatli ishlamoqda!");
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server port ${PORT} da tinglamoqda`);
});

// Botni ishga tushirish
bot.start();
console.log("🚀 Telegram Watermark Bot (100% Overlay) muvaffaqiyatli ishga tushdi!");
