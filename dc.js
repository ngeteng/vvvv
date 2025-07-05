// Langkah 1: Muat semua variabel dari file .env ke dalam process.env
require('dotenv').config();

// Langkah 2: Baca konfigurasi dari process.env
// ... (bagian ini tetap sama)
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateIdentifier = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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

    // ================== PERUBAHAN DI SINI ==================
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        // Headers wajib untuk otentikasi
        'x-access-token': accessToken,
        'x-lockdown-token': lockdownToken,
        
        // Headers tambahan agar terlihat seperti browser asli
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin': 'https://stake.ac',
        'Referer': 'https://stake.ac/casino/games/dice',
      },
      // =======================================================
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Cek jika responsnya adalah HTML (tanda Cloudflare)
        const responseText = await response.text();
        if (responseText.includes('<html')) {
            throw new Error(`HTTP error! Status: ${response.status} - DIBLOKIR OLEH CLOUDFLARE.`);
        }
        throw new Error(`HTTP error! Status: ${response.status} - ${responseText}`);
    }

    const data = await response.json();
    const { state, payout, amount } = data.diceRoll;

    if (payout > amount) {
      console.log(`%c[MENANG] Roll: ${state.result}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount;
    } else {
      console.log(`%c[KALAH] Roll: ${state.result}. Taruhan dikalikan x${martingaleMultiplier}.`, 'color: red');
      currentBetAmount *= martingaleMultiplier;
    }

  } catch (error) {
    console.error('[ERROR] Gagal melakukan bet:', error.message);
    if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
      console.error("[FATAL] Token tidak valid atau sudah expired. Harap perbarui token di file .env dan restart bot.");
      return false;
    }
    console.log("[INFO] Mencoba lagi setelah jeda singkat...");
  }
  return true;
}

// Fungsi startBot tetap sama
async function startBot() {
    // ... (tidak ada perubahan di sini)
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

startBot();
