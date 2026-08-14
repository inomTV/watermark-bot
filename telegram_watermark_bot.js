// ========================================================
// TELEGRAM FULL-IMAGE WATERMARK BOT (Node.js + Sharp + grammY)
// 100% Overlay with '00000000000000.png' + Daily Auto-Clean
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

// Vaqtinchalik fayllar papkasi
const TEMP_DIR = path.join(__dirname, "temp_images");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ----------------------------------------------------
// 🧹 ҲАР КУНИ ВАҚТИНЧАЛИК РАСМЛАРНИ ЎЧИРИШ ФУНКЦИЯСИ
// ----------------------------------------------------
function cleanupOldImages() {
  console.log("🧹 [Daily Cleanup] Расмлар ва кэш тозаланмоқда...");
  try {
    // 1. Sharp кэшини тўлиқ бўшатиш
    sharp.cache(false);
    sharp.cache(true);

    // 2. Temp папкадаги 1 соатдан ошган барча файлларни ўчириш
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = fs.statSync(filePath);
        // 1 соатдан эски бўлган ҳар қандай файлни ўчириш
        if (now - stats.mtimeMs > 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      console.log(`✅ [Daily Cleanup] ${deletedCount} та эски расм файллари ўчирилди.`);
    }
  } catch (err) {
    console.error("❌ Тозалашда хатолик:", err);
  }
}

// Ҳар 24 соатда (ҳар куни) автоматик ишга тушади
setInterval(cleanupOldImages, 24 * 60 * 60 * 1000);
// Бот ишга тушганда ҳам бир марта тозалайди
cleanupOldImages();

// ----------------------------------------------------
// WATERMARK SOZLAMALARI
// ----------------------------------------------------
const WATERMARK_CONFIG = {
  opacity: 1.0,
  replyCaption: "✅ Расмингизга логотип 100% муваффақиятли жойлаштирилди!"
};

// Logotipni olish (00000000000000.png)
function getActiveLogoBuffer() {
  const possibleNames = [
    "00000000000000.png",
    "logo.png"
  ];

  for (const name of possibleNames) {
    const localPath = path.join(__dirname, name);
    if (fs.existsSync(localPath)) {
      console.log(`📁 Logotip fayli '${name}' muvaffaqiyatli yuklandi!`);
      return fs.readFileSync(localPath);
    }
  }

  return Buffer.from('<svg width="800" height="600"><text x="100" y="300" fill="white" font-size="60">LOGO</text></svg>');
}

// 100% Overlay qoplash
async function applyWatermark(imageBuffer) {
  const baseImg = sharp(imageBuffer);
  const metadata = await baseImg.metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 600;

  const logoBuffer = getActiveLogoBuffer();

  let processedLogo = sharp(logoBuffer).resize(imgWidth, imgHeight, {
    fit: "fill"
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

// /start buyrug'i
bot.command("start", (ctx) => ctx.reply("Ассалому алайкум! Менга расм жўнатинг, мен унга 100% логотипингизни жойлаб бераман."));

// /clean ёки /clear орқали қўлда тозалаш
bot.command(["clean", "clear"], async (ctx) => {
  cleanupOldImages();
  await ctx.reply("🧹 Базадаги вақтинчалик расмлар ва кэш муваффақиятли тозаланди!");
});

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

    // Хотирани бўшатиш (Garbage Collector учун)
    inputBuf.fill(0);
  } catch (err) {
    console.error("Error processing photo:", err);
    await ctx.reply("❌ Расмни қайта ишлашда хатолик юз берди.");
  }
});

// Render.com Web Service Port binding (24/7 rejim)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("🤖 Telegram 100% Watermark Bot 24/7 rejimda muvaffaqiyatli ishlamoqda! (Auto-clean active)");
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server port ${PORT} da tinglamoqda`);
});

// Botni ishga tushirish
bot.start();
console.log("🚀 Telegram Watermark Bot (100% Overlay + Auto Cleanup) ishga tushdi!");
