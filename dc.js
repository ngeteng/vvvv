// == Konfigurasi Bot ==
// Ganti dengan token dari header 'x-access-token' di screenshot-mu
const accessToken = 'PASTE_X-ACCESS-TOKEN_ANDA_DI_SINI'; 

// Ganti dengan token dari header 'x-lockdown-token' di screenshot-mu
const lockdownToken = 'PASTE_X-LOCKDOWN-TOKEN_ANDA_DI_SINI';

// URL API yang sudah kita temukan
const apiUrl = 'https://stake.ac/api/casino/dice/roll'; 

// Pengaturan awal taruhan
let baseBetAmount = 0.0000001; // Jumlah taruhan dasar (gunakan angka desimal biasa)
let currentBetAmount = baseBetAmount;
const currency = 'bnb';      // Sesuaikan dengan koinmu
let condition = 'above';     // 'above' atau 'below'
let target = 49.5;           // Target roll

// Fungsi untuk menunda eksekusi (wajib, biar tidak kena ban)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi untuk membuat string 'identifier' acak seperti di contoh
const generateIdentifier = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Fungsi utama untuk melakukan satu kali bet
async function placeBet() {
  const identifier = generateIdentifier();
  
  // 1. Siapkan Payload (data yang mau dikirim)
  const betPayload = {
    amount: currentBetAmount,
    target: target,
    condition: condition,
    currency: currency,
    identifier: identifier
  };

  try {
    console.log(`[INFO] Memasang taruhan: ${currentBetAmount.toFixed(8)} ${currency} | Target: ${condition} ${target}`);

    // 2. Kirim request dengan header dan payload yang sudah benar
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': accessToken,
        'x-lockdown-token': lockdownToken,
        // Header lain seperti User-Agent biasanya tidak wajib, tapi bisa ditambahkan jika perlu
      },
      body: JSON.stringify(betPayload) 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 3. Olah respons dari server berdasarkan struktur baru
    const rollResult = data.diceRoll.state.result;
    const payout = data.diceRoll.payout;
    const amount = data.diceRoll.amount;

    // 4. Terapkan strategi berdasarkan hasil menang/kalah
    if (payout > amount) { // Menang jika payout lebih besar dari amount
      console.log(`%c[MENANG] Roll: ${rollResult}. Payout: ${payout}. Kembali ke taruhan dasar.`, 'color: green');
      currentBetAmount = baseBetAmount; // Kembali ke taruhan awal
    } else {
      console.log(`%c[KALAH] Roll: ${rollResult}. Menggandakan taruhan.`, 'color: red');
      currentBetAmount *= 2; // Gandakan taruhan jika kalah (Strategi Martingale)
    }

  } catch (error) {
    console.error('[ERROR] Gagal melakukan bet:', error);
    if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        console.error("[FATAL] Token tidak valid atau sudah expired. Harap perbarui token dan restart bot.");
        return false; // Hentikan bot jika token tidak valid
    }
  }
  
  return true; // Lanjutkan ke taruhan berikutnya
}

// == Loop Utama Bot ==
async function startBot() {
  if (!accessToken || !lockdownToken || accessToken.includes('PASTE') || lockdownToken.includes('PASTE')) {
    console.error("[KESALAHAN] Harap isi 'accessToken' dan 'lockdownToken' di dalam skrip terlebih dahulu!");
    return;
  }
  console.log("Bot dimulai dalam 3 detik...");
  await sleep(3000);

  while (true) {
    const success = await placeBet();
    if (!success) {
      console.log("Bot dihentikan karena error fatal.");
      break;
    }
    
    // Jeda 1.5 detik antar taruhan untuk keamanan
    await sleep(1500); 
  }
}

// Jalankan botnya
startBot();
