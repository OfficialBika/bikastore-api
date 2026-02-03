<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BIKA STORE — MLBB & PUBG Top-up</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: "#6A5DE8",
            secondary: "#00A6FF",
            glass: "rgba(255,255,255,0.08)"
          },
          boxShadow: {
            neon: "0 0 20px rgba(0,166,255,0.6)",
            glow: "0 0 25px rgba(106,93,232,0.7)"
          }
        }
      }
    }
  </script>

  <style>
    body {
      background: #0A0F1F;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    #topHeader {
      position: sticky;
      top: 0;
      z-index: 40;
      transition: transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease;
    }

    .header-hidden {
      transform: translateY(-100%);
      opacity: 0;
      box-shadow: none;
    }
  </style>
</head>

<body class="text-white">

<!-- Toast (Added to cart) -->
<div id="toast"
     class="fixed left-1/2 bottom-6 z-50 -translate-x-1/2 px-4 py-2 bg-black/80 text-xs rounded-full shadow-neon opacity-0 pointer-events-none transition-opacity duration-200">
  <span id="toastText">Added to cart</span>
</div>

<!-- HEADER -->
<div id="topHeader" class="w-full p-4 bg-gradient-to-r from-primary to-secondary rounded-b-3xl shadow-glow">
  <div class="max-w-xl mx-auto flex justify-between items-center gap-3">
    <div>
      <h1 class="text-3xl font-bold tracking-wide">BIKA STORE</h1>
      <p id="txtSubtitle" class="opacity-80 text-sm">MLBB Diamonds & PUBG UC</p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Language switch -->
      <button id="btnLang"
        class="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold hover:bg-white/30 transition"
        onclick="toggleLanguage()">
        MM
      </button>

      <!-- For browser use / outside Telegram -->
      <a id="btnOpenBot"
        href="https://t.me/BikaStoreBot"
        class="px-3 py-2 bg-white/20 backdrop-blur-md rounded-xl shadow-neon hover:bg-white/30 transition text-xs">
        Open Bot
      </a>
    </div>
  </div>
</div>

<!-- MAIN APP -->
<div class="p-5 pt-4 max-w-xl mx-auto" id="app">

  <!-- STEP 1 — SELECT ITEMS -->
  <div id="step1">
    <div class="flex items-center justify-between mt-2 mb-3">
      <h2 id="txtSelectTitle" class="text-xl font-bold">🎮 Select Game & Package</h2>
      <!-- Back Menu (reset all) -->
      <button id="btnReset"
        onclick="resetAll()"
        class="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition">
        Reset
      </button>
    </div>

    <!-- GAME TABS -->
    <div class="flex gap-2 mb-4">
      <button
        id="tabMLBB"
        class="flex-1 py-2 rounded-xl bg-white/20 backdrop-blur shadow-neon font-semibold text-center text-sm"
        onclick="setGame('MLBB')">
        MLBB
      </button>
      <button
        id="tabPUBG"
        class="flex-1 py-2 rounded-xl bg-white/5 backdrop-blur font-semibold text-center text-sm"
        onclick="setGame('PUBG')">
        PUBG
      </button>
    </div>

    <!-- DYNAMIC TITLE -->
    <h2 id="priceTitle" class="text-lg font-semibold mb-2">
      💎 MLBB Diamonds — Select Items
    </h2>

    <!-- PRICE LIST -->
    <div id="priceList" class="grid grid-cols-2 gap-3"></div>

    <!-- CART -->
    <div class="mt-6">
      <div class="flex items-center justify-between">
        <h2 id="cartTitle" class="text-xl font-bold">🛒 Cart</h2>
        <button id="btnClearCart"
          onclick="clearCart()"
          class="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 transition">
          Clear
        </button>
      </div>
      <div id="cartList" class="mt-2"></div>
    </div>

    <!-- GAME ID FORMS -->
    <div class="mt-6" id="mlbbFields">
      <label id="lblMlbbId" class="block mb-1 text-sm">MLBB ID</label>
      <input id="mlbbId" class="w-full p-3 bg-glass rounded-xl backdrop-blur shadow-glow text-sm" />

      <label id="lblSvId" class="block mt-4 mb-1 text-sm">Server ID</label>
      <input id="svId" class="w-full p-3 bg-glass rounded-xl backdrop-blur shadow-glow text-sm" />
    </div>

    <div class="mt-6 hidden" id="pubgFields">
      <label id="lblPubgId" class="block mb-1 text-sm">PUBG ID</label>
      <input id="pubgId" class="w-full p-3 bg-glass rounded-xl backdrop-blur shadow-glow text-sm" />
    </div>

    <!-- NEXT BUTTON -->
    <button id="btnNext"
      onclick="goStep2()"
      class="w-full mt-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-neon text-sm font-semibold">
      Confirm Order (Step 2)
    </button>
  </div>

  <!-- STEP 2 — PREVIEW & GO TO BOT -->
  <div id="step2" class="hidden">
    <h2 id="step2Title" class="text-xl font-bold mt-5 mb-3">📄 Order Preview</h2>
    <div id="preview" class="p-4 bg-glass rounded-xl backdrop-blur shadow-glow text-sm"></div>

    <h3 id="paymentTitle" class="text-lg mt-6 mb-2 font-semibold">💵 Payment Info</h3>
    <div class="p-4 bg-glass rounded-xl backdrop-blur shadow-glow text-sm space-y-1">
      <p id="kpayLine"><span class="font-semibold">KPay</span>: Shine Htet Aung (09 264 202 637)</p>
      <p id="waveLine"><span class="font-semibold">WavePay</span>: Shine Htet Aung (09 264 202 637)</p>
      <p id="paymentNote" class="opacity-70 text-xs mt-2 leading-relaxed">
        ➜ Tap the button below to go to the Bot. In the Bot, send your payment slip photo and confirm.
      </p>
    </div>

    <button id="btnConfirmGo"
      onclick="confirmOrderAndOpenBot()"
      class="w-full mt-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl shadow-neon text-sm font-semibold">
      ✅ Confirm & Go To Bot
    </button>

    <button id="btnBackMenu"
      onclick="backToStep1()"
      class="w-full mt-3 py-2 bg-white/5 rounded-xl text-sm">
      ⬅️ Back Menu
    </button>
  </div>

  <!-- REVIEW BOX -->
  <div id="reviewBox"
       class="mt-8 p-4 bg-glass rounded-2xl backdrop-blur shadow-glow text-sm">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 id="txtReviewTitle" class="font-semibold text-sm">⭐ Reviews</h3>
        <p id="txtReviewHint" class="text-xs opacity-70 mt-1">
          See what other players say about BIKA STORE.
        </p>
      </div>
      <a id="btnReview"
         href="https://t.me/BikaStoreBot?start=review"
         class="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition">
        Open Reviews
      </a>
    </div>
  </div>

</div>

<script>
// =================== CONFIG =====================
// API base URL (backend)
const API_BASE = "https://bikastore-api.onrender.com";

// =================== I18N =======================
const i18n = {
  en: {
    subtitle: "MLBB Diamonds & PUBG UC",
    openBot: "Open Bot",
    langShort: "EN",

    selectTitle: "🎮 Select Game & Package",
    reset: "Reset",
    mlbbTab: "MLBB",
    pubgTab: "PUBG",

    priceTitleMLBB: "💎 MLBB Diamonds — Select Items",
    priceTitlePUBG: "🥤 PUBG UC — Select Items",
    sectionDiamonds: "Diamonds",
    sectionWeekly: "Weekly / Web / MEB",
    sectionUc: "UC Packages",
    sectionPrime: "Prime",

    cartTitle: "🛒 Cart",
    clearCart: "Clear",
    cartEmpty: "Cart is empty. Please add some items.",
    totalLabel: "Total:",

    lblMlbbId: "MLBB ID",
    lblSvId: "Server ID",
    lblPubgId: "PUBG ID",

    btnNext: "Confirm Order (Step 2)",

    step2Title: "📄 Order Preview",
    paymentTitle: "💵 Payment Info",
    kpayLine: "KPay: Shine Htet Aung (09 264 202 637)",
    waveLine: "WavePay: Shine Htet Aung (09 264 202 637)",
    paymentNote:
      "➜ Tap the button below to go to the Bot. In the Bot, send your payment slip photo and confirm.",

    btnConfirmGo: "✅ Confirm & Go To Bot",
    btnBackMenu: "⬅️ Back Menu",

    previewItemsTitle: "Items:",
    previewTotalLabel: "Total:",

    toastAddedPrefix: "Added:",

    alertAddItem: "Please add at least one item to cart.",
    alertFillMlbb: "Please fill MLBB ID and Server ID.",
    alertFillPubg: "Please fill PUBG ID.",
    alertCartEmpty: "Cart is empty.",
    alertServerError: "Server error, please try again.",
    alertNetworkError: "Network error, please try again.",

    reviewTitle: "⭐ Reviews",
    reviewHint: "See what other players say about BIKA STORE.",
    reviewButton: "Open Reviews",
  },
  mm: {
    subtitle: "MLBB Diamonds & PUBG UC",
    openBot: "Bot ဖွင့်ရန်",
    langShort: "MM",

    selectTitle: "🎮 ဂိမ်းနဲ့ Package ရွေးချယ်ရန်",
    reset: "ပြန်စမည်",
    mlbbTab: "MLBB",
    pubgTab: "PUBG",

    priceTitleMLBB: "💎 MLBB Diamonds — Item ရွေးချယ်ရန်",
    priceTitlePUBG: "🥤 PUBG UC — Item ရွေးချယ်ရန်",
    sectionDiamonds: "Diamonds",
    sectionWeekly: "Weekly / Web / MEB",
    sectionUc: "UC Packages",
    sectionPrime: "Prime",

    cartTitle: "🛒 စျေးခြင်းတောင်း",
    clearCart: "ဖျက်မည်",
    cartEmpty: "စျေးခြင်းတောင်းထဲ Item မရှိသေးပါ။ အနည်းဆုံး Item တစ်ခု ထည့်ပေးပါ။",
    totalLabel: "စုစုပေါင်း:",

    lblMlbbId: "MLBB ID",
    lblSvId: "Server ID",
    lblPubgId: "PUBG ID",

    btnNext: "Order အတည်ပြုရန် (Step 2)",

    step2Title: "📄 Order အသေးစိတ်",
    paymentTitle: "💵 ငွေပေးချေမှုပုံစံ",
    kpayLine: "KPay: Shine Htet Aung (09 264 202 637)",
    waveLine: "WavePay: Shine Htet Aung (09 264 202 637)",
    paymentNote:
      "➜ အောက်က button ကိုနှိပ်ပြီး Bot ထဲသို့ ဝင်ပါ။ Bot ထဲမှာ Slip ပုံကို ပို့ပြီး အော်ဒါအတည်ပြုရပါမယ်။",

    btnConfirmGo: "✅ အတည်ပြုပြီး Bot သို့သွားမည်",
    btnBackMenu: "⬅️ နောက်သို့",

    previewItemsTitle: "Items:",
    previewTotalLabel: "စုစုပေါင်း:",

    toastAddedPrefix: "ထည့်ပြီး:",

    alertAddItem: "စျေးခြင်းတောင်းထဲ Item အနည်းဆုံး ၁ ခု ထည့်ပေးပါ။",
    alertFillMlbb: "MLBB ID နဲ့ Server ID ကို ဖြည့်ပေးပါ။",
    alertFillPubg: "PUBG ID ကို ဖြည့်ပေးပါ။",
    alertCartEmpty: "စျေးခြင်းတောင်းထဲ Item မရှိသေးပါ။",
    alertServerError: "Server မှာ အမှားတစ်ခု ဖြစ်နေပါတယ်။ နောက်တစ်ခါ ပြန်ကြိုးစားပေးပါ။",
    alertNetworkError: "Network ပြဿနာ ဖြစ်နေပါတယ်။ နောက်တစ်ခါ ပြန်ကြိုးစားပေးပါ။",

    reviewTitle: "⭐ ဝယ်ယူသူများ Review",
    reviewHint: "အခြား Player များရဲ့ သုံးသပ်ချက်တွေကိုလည်း ကြည့်ရှုနိုင်ပါတယ်။",
    reviewButton: "Review များကြည့်ရန်",
  }
};

let currentLang = "mm";

function t(key) {
  const langPack = i18n[currentLang] || i18n.en;
  return (langPack && langPack[key]) || i18n.en[key] || key;
}

function applyLanguage() {
  document.getElementById("txtSubtitle").textContent = t("subtitle");
  document.getElementById("btnOpenBot").textContent = t("openBot");
  document.getElementById("btnLang").textContent = t("langShort");

  document.getElementById("txtSelectTitle").textContent = t("selectTitle");
  document.getElementById("btnReset").textContent = t("reset");

  document.getElementById("tabMLBB").textContent = t("mlbbTab");
  document.getElementById("tabPUBG").textContent = t("pubgTab");

  document.getElementById("cartTitle").textContent = t("cartTitle");
  document.getElementById("btnClearCart").textContent = t("clearCart");

  document.getElementById("lblMlbbId").textContent = t("lblMlbbId");
  document.getElementById("lblSvId").textContent = t("lblSvId");
  document.getElementById("lblPubgId").textContent = t("lblPubgId");
  document.getElementById("btnNext").textContent = t("btnNext");

  document.getElementById("step2Title").textContent = t("step2Title");
  document.getElementById("paymentTitle").textContent = t("paymentTitle");
  document.getElementById("kpayLine").textContent = t("kpayLine");
  document.getElementById("waveLine").textContent = t("waveLine");
  document.getElementById("paymentNote").textContent = t("paymentNote");

  document.getElementById("btnConfirmGo").textContent = t("btnConfirmGo");
  document.getElementById("btnBackMenu").textContent = t("btnBackMenu");

  document.getElementById("txtReviewTitle").textContent = t("reviewTitle");
  document.getElementById("txtReviewHint").textContent = t("reviewHint");
  document.getElementById("btnReview").textContent = t("reviewButton");

  // price title + list & cart re-render
  renderPrices();
  renderCart();
}

function toggleLanguage() {
  currentLang = currentLang === "en" ? "mm" : "en";
  applyLanguage();
}

// =================== PRODUCTS ====================
const PRODUCTS = [
  // MLBB Diamonds
  { id: "mlbb_11",   game: "MLBB", category: "diamond", label: "11",   display: "11 Diamonds",   price: 800 },
  { id: "mlbb_22",   game: "MLBB", category: "diamond", label: "22",   display: "22 Diamonds",   price: 1600 },
  { id: "mlbb_33",   game: "MLBB", category: "diamond", label: "33",   display: "33 Diamonds",   price: 2350 },
  { id: "mlbb_55",   game: "MLBB", category: "diamond", label: "55",   display: "55 Diamonds",   price: 3600 },
  { id: "mlbb_86",   game: "MLBB", category: "diamond", label: "86",   display: "86 Diamonds",   price: 4800 },
  { id: "mlbb_112",  game: "MLBB", category: "diamond", label: "112",  display: "112 Diamonds",  price: 8200 },
  { id: "mlbb_172",  game: "MLBB", category: "diamond", label: "172",  display: "172 Diamonds",  price: 9800 },
  { id: "mlbb_257",  game: "MLBB", category: "diamond", label: "257",  display: "257 Diamonds",  price: 14500 },
  { id: "mlbb_343",  game: "MLBB", category: "diamond", label: "343",  display: "343 Diamonds",  price: 20000 },
  { id: "mlbb_429",  game: "MLBB", category: "diamond", label: "429",  display: "429 Diamonds",  price: 25000 },
  { id: "mlbb_514",  game: "MLBB", category: "diamond", label: "514",  display: "514 Diamonds",  price: 29900 },
  { id: "mlbb_600",  game: "MLBB", category: "diamond", label: "600",  display: "600 Diamonds",  price: 34500 },
  { id: "mlbb_706",  game: "MLBB", category: "diamond", label: "706",  display: "706 Diamonds",  price: 39900 },
  { id: "mlbb_792",  game: "MLBB", category: "diamond", label: "792",  display: "792 Diamonds",  price: 44500 },
  { id: "mlbb_878",  game: "MLBB", category: "diamond", label: "878",  display: "878 Diamonds",  price: 48500 },
  { id: "mlbb_963",  game: "MLBB", category: "diamond", label: "963",  display: "963 Diamonds",  price: 53000 },
  { id: "mlbb_1049", game: "MLBB", category: "diamond", label: "1049", display: "1049 Diamonds", price: 59900 },
  { id: "mlbb_1135", game: "MLBB", category: "diamond", label: "1135", display: "1135 Diamonds", price: 63500 },
  { id: "mlbb_1412", game: "MLBB", category: "diamond", label: "1412", display: "1412 Diamonds", price: 77000 },
  { id: "mlbb_1584", game: "MLBB", category: "diamond", label: "1584", display: "1584 Diamonds", price: 88000 },
  { id: "mlbb_1669", game: "MLBB", category: "diamond", label: "1669", display: "1669 Diamonds", price: 94000 },
  { id: "mlbb_2195", game: "MLBB", category: "diamond", label: "2195", display: "2195 Diamonds", price: 118900 },
  { id: "mlbb_3158", game: "MLBB", category: "diamond", label: "3158", display: "3158 Diamonds", price: 172000 },
  { id: "mlbb_3688", game: "MLBB", category: "diamond", label: "3688", display: "3688 Diamonds", price: 202000 },
  { id: "mlbb_4390", game: "MLBB", category: "diamond", label: "4390", display: "4390 Diamonds", price: 237000 },
  { id: "mlbb_5100", game: "MLBB", category: "diamond", label: "5100", display: "5100 Diamonds", price: 280000 },
  { id: "mlbb_5532", game: "MLBB", category: "diamond", label: "5532", display: "5532 Diamonds", price: 300000 },
  { id: "mlbb_6055", game: "MLBB", category: "diamond", label: "6055", display: "6055 Diamonds", price: 330000 },

  // MLBB Specials
  { id: "mlbb_wp1", game: "MLBB", category: "special", label: "wp1", display: "Weekly Pass 1 (wp1)", price: 5900 },
  { id: "mlbb_wp2", game: "MLBB", category: "special", label: "wp2", display: "Weekly Pass 2 (wp2)", price: 11800 },
  { id: "mlbb_wp3", game: "MLBB", category: "special", label: "wp3", display: "Weekly Pass 3 (wp3)", price: 17700 },
  { id: "mlbb_wp4", game: "MLBB", category: "special", label: "wp4", display: "Weekly Pass 4 (wp4)", price: 23600 },
  { id: "mlbb_wp5", game: "MLBB", category: "special", label: "wp5", display: "Weekly Pass 5 (wp5)", price: 29500 },
  { id: "mlbb_web", game: "MLBB", category: "special", label: "web", display: "WEB", price: 3500 },
  { id: "mlbb_meb", game: "MLBB", category: "special", label: "meb", display: "MEB", price: 16500 },

  // PUBG UC
  { id: "pubg_60",   game: "PUBG", category: "uc",    label: "60",   display: "60 UC",   price: 4500 },
  { id: "pubg_325",  game: "PUBG", category: "uc",    label: "325",  display: "325 UC",  price: 19500 },
  { id: "pubg_660",  game: "PUBG", category: "uc",    label: "660",  display: "660 UC",  price: 38000 },
  { id: "pubg_1800", game: "PUBG", category: "uc",    label: "1800", display: "1800 UC", price: 90500 },
  { id: "pubg_3850", game: "PUBG", category: "uc",    label: "3850", display: "3850 UC", price: 185000 },
  { id: "pubg_8100", game: "PUBG", category: "uc",    label: "8100", display: "8100 UC", price: 363000 },

  // PUBG Prime
  { id: "pubg_prime1m",  game: "PUBG", category: "prime", label: "prime1m",  display: "Prime 1 Month", price: 4500 },
  { id: "pubg_primeplus", game: "PUBG", category: "prime", label: "primeplus", display: "Prime Plus",  price: 39500 },
];

function filterProducts(game, category) {
  return PRODUCTS.filter(p => p.game === game && p.category === category);
}

// =================== STATE ====================
let currentGame = "MLBB";
let cart = [];
let toastTimeout;

// =================== TOAST ====================
function showToast(message) {
  const toast = document.getElementById("toast");
  const text = document.getElementById("toastText");
  if (!toast || !text) return;

  text.textContent = message;
  toast.classList.remove("opacity-0", "pointer-events-none");
  toast.classList.add("opacity-100");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("opacity-0", "pointer-events-none");
    toast.classList.remove("opacity-100");
  }, 1200);
}

// =================== RENDER ====================
function setGame(game) {
  currentGame = game;
  renderPrices();
  updateGameTabs();
  clearCart();
}

function updateGameTabs() {
  const tabMLBB = document.getElementById("tabMLBB");
  const tabPUBG = document.getElementById("tabPUBG");

  if (currentGame === "MLBB") {
    tabMLBB.classList.add("bg-white/20", "shadow-neon");
    tabMLBB.classList.remove("bg-white/5");
    tabPUBG.classList.remove("bg-white/20", "shadow-neon");
    tabPUBG.classList.add("bg-white/5");

    document.getElementById("mlbbFields").classList.remove("hidden");
    document.getElementById("pubgFields").classList.add("hidden");
  } else {
    tabPUBG.classList.add("bg-white/20", "shadow-neon");
    tabPUBG.classList.remove("bg-white/5");
    tabMLBB.classList.remove("bg-white/20", "shadow-neon");
    tabMLBB.classList.add("bg-white/5");

    document.getElementById("mlbbFields").classList.add("hidden");
    document.getElementById("pubgFields").classList.remove("hidden");
  }
}

function productCardHTML(item) {
  return `
    <div class="p-3 bg-glass rounded-xl backdrop-blur shadow-glow text-sm">
      <p class="font-semibold text-xs">${item.display}</p>
      <p class="opacity-75 text-xs">${item.price.toLocaleString()} Ks</p>
      <button onclick="addToCart('${item.id}')"
        class="mt-2 w-full bg-gradient-to-r from-primary to-secondary py-1 rounded-xl shadow-neon text-xs font-semibold">
        + Add
      </button>
    </div>
  `;
}

function renderPrices() {
  const box = document.getElementById("priceList");
  const title = document.getElementById("priceTitle");
  box.innerHTML = "";

  if (currentGame === "MLBB") {
    title.textContent = t("priceTitleMLBB");
    const diamonds = filterProducts("MLBB", "diamond");
    const specials = filterProducts("MLBB", "special");

    box.innerHTML += `<h3 class="col-span-2 text-xs opacity-60 uppercase tracking-wide">${t("sectionDiamonds")}</h3>`;
    diamonds.forEach(item => {
      box.innerHTML += productCardHTML(item);
    });

    box.innerHTML += `<h3 class="col-span-2 mt-3 text-xs opacity-60 uppercase tracking-wide">${t("sectionWeekly")}</h3>`;
    specials.forEach(item => {
      box.innerHTML += productCardHTML(item);
    });
  } else {
    title.textContent = t("priceTitlePUBG");
    const ucs = filterProducts("PUBG", "uc");
    const primes = filterProducts("PUBG", "prime");

    box.innerHTML += `<h3 class="col-span-2 text-xs opacity-60 uppercase tracking-wide">${t("sectionUc")}</h3>`;
    ucs.forEach(item => {
      box.innerHTML += productCardHTML(item);
    });

    box.innerHTML += `<h3 class="col-span-2 mt-3 text-xs opacity-60 uppercase tracking-wide">${t("sectionPrime")}</h3>`;
    primes.forEach(item => {
      box.innerHTML += productCardHTML(item);
    });
  }
}

function renderCart() {
  const box = document.getElementById("cartList");
  box.innerHTML = "";

  if (!cart.length) {
    box.innerHTML = `<p class="text-sm opacity-70 mt-1">${t("cartEmpty")}</p>`;
    return;
  }

  cart.forEach((item, i) => {
    const lineTotal = item.price * item.qty;
    box.innerHTML += `
      <div class="p-3 bg-glass rounded-xl backdrop-blur shadow-glow mt-2 text-sm">
        <div class="flex justify-between items-center">
          <div>
            <p class="font-semibold text-xs">${item.game} — ${item.display}</p>
            <p class="text-xs opacity-70">${item.price.toLocaleString()} Ks × ${item.qty} = ${lineTotal.toLocaleString()} Ks</p>
          </div>
          <div class="flex gap-2 items-center">
            <button class="px-3 bg-gray-700 rounded" onclick="dec(${i})">-</button>
            <p>${item.qty}</p>
            <button class="px-3 bg-gray-700 rounded" onclick="inc(${i})">+</button>
          </div>
        </div>
      </div>
    `;
  });

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  box.innerHTML += `
    <div class="mt-3 text-right text-sm">
      <span class="opacity-80">${t("totalLabel")}</span>
      <span class="font-semibold"> ${total.toLocaleString()} Ks</span>
    </div>
  `;
}

// =================== CART OPS ====================
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const exists = cart.find(c => c.id === product.id);
  if (exists) {
    exists.qty++;
  } else {
    cart.push({
      id: product.id,
      game: product.game,
      label: product.label,
      display: product.display,
      price: product.price,
      qty: 1,
    });
  }
  renderCart();
  showToast(`${t("toastAddedPrefix")} ${product.display}`);
}

function inc(i) {
  cart[i].qty++;
  renderCart();
}

function dec(i) {
  if (cart[i].qty > 1) cart[i].qty--;
  else cart.splice(i, 1);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
}

// =================== FLOW ====================
function goStep2() {
  const mlbbId = document.getElementById("mlbbId").value.trim();
  const svId = document.getElementById("svId").value.trim();
  const pubgId = document.getElementById("pubgId").value.trim();

  if (!cart.length) {
    alert(t("alertAddItem"));
    return;
  }

  if (currentGame === "MLBB") {
    if (!mlbbId || !svId) {
      alert(t("alertFillMlbb"));
      return;
    }
  } else {
    if (!pubgId) {
      alert(t("alertFillPubg"));
      return;
    }
  }

  // build preview
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemsHTML = cart
    .map(i => `• ${i.display} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} Ks`)
    .join("<br>");

  let idLine = "";
  if (currentGame === "MLBB") {
    idLine = `ID + SV ID: ${mlbbId} ${svId}`;
  } else {
    idLine = `PUBG ID: ${pubgId}`;
  }

  const preview = document.getElementById("preview");
  preview.innerHTML = `
    <p><b>Game:</b> ${currentGame}</p>
    <p><b>${idLine}</b></p>
    <hr class="my-2 opacity-40" />
    <p class="mb-1"><b>${t("previewItemsTitle")}</b></p>
    <p>${itemsHTML}</p>
    <hr class="my-2 opacity-40" />
    <p class="text-base"><b>${t("previewTotalLabel")}</b> ${total.toLocaleString()} Ks</p>
  `;

  document.getElementById("step1").classList.add("hidden");
  document.getElementById("step2").classList.remove("hidden");
}

function backToStep1() {
  document.getElementById("step2").classList.add("hidden");
  document.getElementById("step1").classList.remove("hidden");
}

// Reset all (header Reset button)
function resetAll() {
  cart = [];
  renderCart();
  document.getElementById("mlbbId").value = "";
  document.getElementById("svId").value = "";
  document.getElementById("pubgId").value = "";
  setGame("MLBB");
  document.getElementById("step2").classList.add("hidden");
  document.getElementById("step1").classList.remove("hidden");
}

// =================== CONFIRM & OPEN BOT ====================
async function confirmOrderAndOpenBot() {
  const mlbbId = document.getElementById("mlbbId").value.trim();
  const svId   = document.getElementById("svId").value.trim();
  const pubgId = document.getElementById("pubgId").value.trim();

  if (!cart.length) {
    alert(t("alertCartEmpty"));
    backToStep1();
    return;
  }

  const payload = {
    game: currentGame,
    cart: cart.map(i => ({
      game: i.game,
      label: i.label,
      price: i.price,
      qty: i.qty,
    })),
    mlbbId,
    svId,
    pubgId,
  };

  if (currentGame === "MLBB") {
    if (!mlbbId || !svId) {
      alert(t("alertFillMlbb"));
      return;
    }
  } else {
    if (!pubgId) {
      alert(t("alertFillPubg"));
      return;
    }
  }

  try {
    const res = await fetch(API_BASE + "/api/orders/web-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) {
      alert(data.message || t("alertServerError"));
      return;
    }

    const startCode = data.startCode; // e.g. web_xxxxx
    const botUrl = "https://t.me/BikaStoreBot?start=" + encodeURIComponent(startCode);
    window.location.href = botUrl;
  } catch (err) {
    console.error(err);
    alert(t("alertNetworkError"));
  }
}

// =================== HEADER HIDE ON SCROLL ====================
let lastScrollY = 0;
window.addEventListener("scroll", () => {
  const header = document.getElementById("topHeader");
  if (!header) return;
  const current = window.scrollY || document.documentElement.scrollTop;

  if (current > lastScrollY && current > 60) {
    header.classList.add("header-hidden");
  } else {
    header.classList.remove("header-hidden");
  }
  lastScrollY = current;
});

// =================== INIT ====================
renderPrices();
renderCart();
updateGameTabs();
applyLanguage();
</script>

</body>
</html>
