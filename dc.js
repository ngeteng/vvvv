require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto'); // Kita juga butuh library crypto

// ================== BACA KONFIGURASI ==================
const accessToken = process.env.ACCESS_TOKEN;
const clientSeed = process.env.CLIENT_SEED; // <-- TAMBAHKAN INI DI .ENV
const currency = process.env.CURRENCY;
const baseBetAmount = parseFloat(process.env.BASE_BET_AMOUNT);
const martingaleMultiplier = parseFloat(process.env.MARTINGALE_MULTIPLIER);
const delayMs = parseInt(process.env.BET_DELAY_MS, 10);

const apiUrl = 'https://stake.ac/_api/graphql'; // URL BARU KITA!

let currentBetAmount = baseBetAmount;
let nonce = 1; // Nonce dimulai dari 1 (atau bisa juga dari angka acak)

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ================== FUNGSI UTAMA BOT DENGAN GRAPHQL ==================
async function placeBet(target, condition) {
  // Membuat hash dari server seed (di dunia nyata, server seed didapat dari API)
  // Untuk contoh ini, kita tiru saja logika dari skrip referensi
  // PENTING: Untuk bot sesungguhnya, perlu ada cara mendapatkan server_seed yang aktif
  const serverSeedHash = '000000000000000000032b534720448a60349883d6ccc4838e12620409a473b1';

  const payload = {
    // Ini adalah 'surat perintah' GraphQL
    query: `mutation DiceRoll($amount: Float!, $target: Float!, $condition: CasinoGameDiceConditionEnum!, $currency: CurrencyEnum!, $clientSeed: String!, $hash: String!, $nonce: Int!) {
      diceRoll(amount: $amount, target: $target, condition: $condition, currency: $currency, clientSeed: $clientSeed, hash: $hash, nonce: $nonce) {
        id
        payoutMultiplier
        amount
        payout
        state {
          ... on CasinoGameDice {
            result
            target
            condition
          }
        }
      }
    }`,
    // Ini adalah variabel yang akan diisi ke dalam 'surat perintah'
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
    console.log(`[INFO] Nonce: ${nonce} | Memasang taruhan: ${currentBetAmount.toFixed(8)} ${currency} | Target: ${condition} ${target}`);
    const response = await axios.post(apiUrl, payload, { headers: headers });

    // Struktur respons GraphQL sedikit berbeda
    const diceRollResult = response.data.data.diceRoll;
    if (!diceRollResult) {
        throw new Error('Respons GraphQL tidak valid: ' + JSON.stringify(response.data.errors));
    }

    const { state, payout, amount } = diceRollResult;
    
    // Nonce harus selalu bertambah untuk taruhan berikutnya
    nonce++; 

    if (payout > amount) {
      console.log(`%c[MENANG] Roll: ${state.result}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount;
    } else {
      console.log(`%c[KALAH] Roll: ${state.result}. Taruhan dikalikan x${martingaleMultiplier}.`, 'color: red');
      currentBetAmount *= martingaleMultiplier;
    }

  } catch (error) {
    if (error.response) {
      console.error(`[ERROR] Gagal: Status ${error.response.status}`, error.response.data);
    } else {
      console.error('[ERROR] Terjadi kesalahan:', error.message);
    }
    console.log("[INFO] Bot dihentikan karena error.");
    return false; // Hentikan loop jika ada error
  }
  return true;
}

async function startBot() {
    if (!clientSeed) {
        console.error("Harap tambahkan CLIENT_SEED di file .env Anda!");
        return;
    }
  console.log("================== BOT STAKE DIMULAI (Metode GraphQL) ==================");
  
  while (true) {
    // Contoh strategi: ganti-ganti target dan kondisi
    const shouldContinue = await placeBet(98, 'under');
    if(!shouldContinue) break;
    await sleep(delayMs);
  }
  console.log("================== BOT DIHENTIKAN ==================");
}

startBot();
