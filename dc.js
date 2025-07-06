// Memuat library yang dibutuhkan
require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// ================== MEMUAT SEMUA KONFIGURASI DARI .ENV ==================
// Kredensial
const accessToken = process.env.ACCESS_TOKEN;
const clientSeed = process.env.CLIENT_SEED;

// Pengaturan Taruhan
const currency = process.env.CURRENCY;
const baseBetAmount = parseFloat(process.env.BASE_BET_AMOUNT);

// Pengaturan Strategi
const target = parseFloat(process.env.TARGET);
const condition = process.env.CONDITION;
const enableMartingale = process.env.ENABLE_MARTINGALE === 'true';
const martingaleMultiplier = parseFloat(process.env.MARTINGALE_MULTIPLIER);

// Pengaturan Bot
const delayMs = parseInt(process.env.BET_DELAY_MS, 10);
const apiUrl = 'https://stake.ac/_api/graphql';

// Variabel internal bot
let currentBetAmount = baseBetAmount;
let nonce = 1; // Nonce akan selalu dimulai dari 1 untuk setiap sesi baru bot

// Fungsi helper untuk jeda
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


/**
 * Fungsi utama untuk memasang satu taruhan.
 * Fungsi ini tidak lagi butuh parameter, karena semua dibaca dari konfigurasi.
 */
async function placeBet() {
  const serverSeedHash = '000000000000000000032b534720448a60349883d6ccc4838e12620409a473b1'; // Hash ini perlu diperbarui jika seed server berubah

  // Payload atau "surat perintah" untuk dikirim ke API GraphQL
  const payload = {
    query: `mutation DiceRoll($amount: Float!, $target: Float!, $condition: CasinoGameDiceConditionEnum!, $currency: CurrencyEnum!, $clientSeed: String!, $hash: String!, $nonce: Int!) {
      diceRoll(amount: $amount, target: $target, condition: $condition, currency: $currency, clientSeed: $clientSeed, hash: $hash, nonce: $nonce) {
        id
        payoutMultiplier
        amount
        payout
        state {
          ... on CasinoGameDice { result, target, condition }
        }
      }
    }`,
    variables: {
      amount: currentBetAmount,
      target: target,
      condition: condition,
      currency: currency,
      clientSeed: clientSeed,
      hash: serverSeedHash,
      nonce: nonce
    }
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-access-token': accessToken,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  };

  try {
    console.log(`[INFO] Nonce: ${nonce} | Bet: ${currentBetAmount.toFixed(8)} ${currency} | Target: ${condition} ${target}`);
    const response = await axios.post(apiUrl, payload, { headers });

    const diceRollResult = response.data.data.diceRoll;
    if (!diceRollResult) {
      throw new Error('Respons GraphQL tidak valid: ' + JSON.stringify(response.data.errors || 'Unknown error'));
    }

    const { state, payout, amount } = diceRollResult;
    nonce++; // Naikkan nonce untuk taruhan berikutnya

    // Logika Menang/Kalah
    if (payout > amount) {
      console.log(`%c[MENANG] Roll: ${state.result}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount;
    } else {
      console.log(`%c[KALAH] Roll: ${state.result}.`, 'color: red');
      if (enableMartingale) {
        const newBetAmount = currentBetAmount * martingaleMultiplier;
        console.log(`%c   -> Martingale Aktif: Taruhan digandakan menjadi ${newBetAmount.toFixed(8)}`, 'color: orange');
        currentBetAmount = newBetAmount;
      } else {
        console.log(`%c   -> Martingale Non-Aktif: Kembali ke taruhan dasar.`, 'color: gray');
        currentBetAmount = baseBetAmount;
      }
    }

  } catch (error) {
    if (error.response) {
      console.error(`[ERROR] Gagal: Status ${error.response.status}`, error.response.data);
    } else {
      console.error('[ERROR] Terjadi kesalahan:', error.message);
    }
    console.log("[FATAL] Bot dihentikan karena error.");
    return false; // Hentikan loop
  }
  return true; // Lanjutkan loop
}

/**
 * Fungsi untuk memulai dan menjalankan loop bot.
 */
async function startBot() {
  if (!accessToken || !clientSeed || accessToken.includes('PASTE')) {
    console.error("[KESALAHAN] Harap isi ACCESS_TOKEN dan CLIENT_SEED di file .env!");
    return;
  }
  
  console.log("================== BOT STAKE DIMULAI ==================");
  console.log(`STRATEGI: Target ${condition} ${target} | Taruhan Dasar: ${baseBetAmount}`);
  console.log(`MARTINGALE: ${enableMartingale ? `AKTIF (x${martingaleMultiplier})` : 'NON-AKTIF'}`);
  console.log("======================================================");
  
  await sleep(3000); // Jeda awal

  while (true) {
    const shouldContinue = await placeBet();
    if (!shouldContinue) break; // Hentikan bot jika ada error fatal
    await sleep(delayMs);
  }

  console.log("=================== BOT DIHENTIKAN ===================");
}

// Jalankan bot!
startBot();
