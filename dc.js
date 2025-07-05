require('dotenv').config();
const axios = require('axios');

// ================== BACA KONFIGURASI ==================
const accessToken = process.env.ACCESS_TOKEN;
const lockdownToken = process.env.LOCKDOWN_TOKEN;
const apiUrl = process.env.API_URL;
const currency = process.env.CURRENCY;
const condition = process.env.CONDITION;
const target = parseFloat(process.env.TARGET);
const baseBetAmount = parseFloat(process.env.BASE_BET_AMOUNT);
const martingaleMultiplier = parseFloat(process.env.MARTINGALE_MULTIPLIER);
const delayMs = parseInt(process.env.BET_DELAY_MS, 10);

let currentBetAmount = baseBetAmount;
const generateIdentifier = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ================== FUNGSI UTAMA BOT DENGAN AXIOS ==================
async function placeBet() {
  const payload = {
    amount: currentBetAmount,
    target: target,
    condition: condition,
    currency: currency,
    identifier: generateIdentifier()
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-access-token': accessToken,
    'x-lockdown-token': lockdownToken,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Origin': 'https://stake.ac',
    'Referer': 'https://stake.ac/casino/games/dice',
  };

  try {
    console.log(`[INFO] Memasang taruhan: ${currentBetAmount.toFixed(8)} ${currency}`);
    
    // Kirim request POST menggunakan Axios
    const response = await axios.post(apiUrl, payload, { headers: headers });
    
    const { state, payout, amount } = response.data.diceRoll;

    if (payout > amount) {
      console.log(`%c[MENANG] Roll: ${state.result}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount;
    } else {
      console.log(`%c[KALAH] Roll: ${state.result}. Taruhan dikalikan x${martingaleMultiplier}.`, 'color: red');
      currentBetAmount *= martingaleMultiplier;
    }
    
  } catch (error) {
    // Axios akan melempar error untuk status 4xx/5xx secara otomatis
    if (error.response) {
      // Server merespons dengan status error
      const status = error.response.status;
      const data = error.response.data;
      // Cek jika ini adalah blokir Cloudflare
      if (typeof data === 'string' && data.includes('<html')) {
        console.error(`[ERROR] Gagal melakukan bet: Status ${status} - DIBLOKIR OLEH CLOUDFLARE.`);
      } else {
        console.error(`[ERROR] Gagal melakukan bet: Status ${status} -`, data);
      }
    } else if (error.request) {
      // Request dibuat tapi tidak ada respons
      console.error('[ERROR] Tidak ada respons dari server. Cek koneksi internet atau endpoint API.');
    } else {
      // Error lain saat setup request
      console.error('[ERROR] Terjadi kesalahan:', error.message);
    }
    
    console.log("[INFO] Mencoba lagi setelah jeda singkat...");
  }
}


async function startBot() {
  if (!apiUrl || !accessToken || !lockdownToken) {
    console.error("[KESALAHAN] Pastikan API_URL, ACCESS_TOKEN, dan LOCKDOWN_TOKEN sudah diisi di .env!");
    return;
  }
  console.log("================== BOT STAKE DIMULAI (Metode Axios) ==================");
  console.log(`Target Endpoint: ${apiUrl}`);
  console.log("====================================================================");
  
  await sleep(2000);

  while (true) {
    await placeBet();
    await sleep(delayMs);
  }
}

startBot();
