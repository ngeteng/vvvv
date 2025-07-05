// Langkah 1: Muat semua variabel dari file .env ke dalam process.env
require('dotenv').config();

// Langkah 2: Baca konfigurasi dari process.env
// Kredensial
const accessToken = process.env.ACCESS_TOKEN;
const lockdownToken = process.env.LOCKDOWN_TOKEN;
const apiUrl = process.env.API_URL;

// Pengaturan Strategi (ubah string dari .env menjadi tipe data yang benar)
const currency = process.env.CURRENCY;
const condition = process.env.CONDITION;
const target = parseFloat(process.env.TARGET);
const baseBetAmount = parseFloat(process.env.BASE_BET_AMOUNT);
const martingaleMultiplier = parseFloat(process.env.MARTINGALE_MULTIPLIER);
const delayMs = parseInt(process.env.BET_DELAY_MS, 10);

// Variabel untuk menyimpan state taruhan saat ini
let currentBetAmount = baseBetAmount;

// Helper function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateIdentifier = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/**
 * Fungsi utama untuk menempatkan satu taruhan.
 */
async function placeBet() {
  const payload = {
    amount: currentBetAmount,
    target: target,
    condition: condition,
    currency: currency,
    identifier: generateIdentifier()
  };

  try {
    console.log(`[INFO] Memasang taruhan: ${currentBetAmount.toFixed(8)} ${currency} | Target: ${condition} ${target}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': accessToken,
        'x-lockdown-token': lockdownToken,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const { state, payout, amount } = data.diceRoll;

    if (payout > amount) { // Kondisi Menang
      console.log(`%c[MENANG] Roll: ${state.result}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount;
    } else { // Kondisi Kalah
      console.log(`%c[KALAH] Roll: ${state.result}. Taruhan dikalikan x${martingaleMultiplier}.`, 'color: red');
      currentBetAmount *= martingaleMultiplier;
    }

  } catch (error) {
    console.error('[ERROR] Gagal melakukan bet:', error.message);
    if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
      console.error("[FATAL] Token tidak valid atau sudah expired. Harap perbarui token di file .env dan restart bot.");
      return false; // Hentikan bot
    }
    console.log("[INFO] Mencoba lagi setelah jeda singkat...");
  }
  return true; // Lanjutkan bot
}

/**
 * Loop utama bot.
 */
async function startBot() {
  if (!accessToken || !lockdownToken || accessToken.includes('PASTE')) {
    console.error("[KESALAHAN] Harap isi ACCESS_TOKEN dan LOCKDOWN_TOKEN di file .env!");
    return;
  }

  console.log("================== BOT STAKE DIMULAI ==================");
  console.log(`Strategi: Martingale (x${martingaleMultiplier}) | Mata Uang: ${currency}`);
  console.log(`Taruhan Dasar: ${baseBetAmount.toFixed(8)} | Jeda: ${delayMs / 1000} detik`);
  console.log("======================================================");
  
  await sleep(3000);

  while (true) {
    const shouldContinue = await placeBet();
    if (!shouldContinue) break;
    await sleep(delayMs);
  }

  console.log("=================== BOT DIHENTIKAN ===================");
}

// Jalankan bot
startBot();
