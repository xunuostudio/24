// 天干臨官位／地支藏干 抽考工具（SPA）

const TIANGAN_DATA = [
  { stem: "甲", attr: "陽木", pos: "寅" },
  { stem: "乙", attr: "陰木", pos: "卯" },
  { stem: "丙", attr: "陽火", pos: "巳" },
  { stem: "丁", attr: "陰火", pos: "午" },
  { stem: "戊", attr: "陽土", pos: "寅巳" },
  { stem: "己", attr: "陰土", pos: "酉午" },
  { stem: "庚", attr: "陽金", pos: "申" },
  { stem: "辛", attr: "陰金", pos: "酉" },
  { stem: "壬", attr: "陽水", pos: "亥" },
  { stem: "癸", attr: "陰水", pos: "子" },
];

const DIZHI_DATA = [
  { branch: "子", main: "癸水", mid: "-", rem: "-" },
  { branch: "丑", main: "己土", mid: "癸水", rem: "辛金" },
  { branch: "寅", main: "甲木", mid: "丙火", rem: "戊土" },
  { branch: "卯", main: "乙木", mid: "-", rem: "-" },
  { branch: "辰", main: "戊土", mid: "乙木", rem: "癸水" },
  { branch: "巳", main: "丙火", mid: "庚金", rem: "戊土" },
  { branch: "午", main: "丁火", mid: "己土", rem: "-" },
  { branch: "未", main: "己土", mid: "丁火", rem: "乙木" },
  { branch: "申", main: "庚金", mid: "壬水", rem: "戊土" },
  { branch: "酉", main: "辛金", mid: "-", rem: "-" },
  { branch: "戌", main: "戊土", mid: "辛金", rem: "丁火" },
  { branch: "亥", main: "壬水", mid: "甲木", rem: "-" },
];

const els = {
  menuView: document.getElementById("menuView"),
  quizView: document.getElementById("quizView"),
  backBtn: document.getElementById("backBtn"),
  startTiangan: document.getElementById("startTiangan"),
  startDizhi: document.getElementById("startDizhi"),

  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  progressTrack: document.querySelector(".progressTrack[role='progressbar']"),

  skipBtn: document.getElementById("skipBtn"),
  status: document.getElementById("status"),

  tianganPanel: document.getElementById("tianganPanel"),
  tg_stem: document.getElementById("tg_stem"),
  tg_attr: document.getElementById("tg_attr"),
  tg_pos: document.getElementById("tg_pos"),

  dizhiPanel: document.getElementById("dizhiPanel"),
  dz_branch: document.getElementById("dz_branch"),
  dz_main: document.getElementById("dz_main"),
  dz_mid: document.getElementById("dz_mid"),
  dz_rem: document.getElementById("dz_rem"),

  doneScreen: document.getElementById("doneScreen"),
  doneText: document.getElementById("doneText"),
  doneBackBtn: document.getElementById("doneBackBtn"),
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalize(s) {
  return (s ?? "").toString().replace(/\s+/g, "").replace(/[　]/g, "").trim();
}

function normalizeDash(s) {
  const t = normalize(s);
  if (t === "" || t === "-" || t === "－" || t === "—" || t === "–") return "-";
  return t;
}

function clearMarks(inputs) {
  for (const i of inputs) i.classList.remove("okInput", "badInput");
}

function setStatus(html) {
  els.status.innerHTML = html;
}

function setProgress(done, total) {
  els.progressText.textContent = `進度：${done}/${total}`;
  els.progressTrack?.setAttribute("aria-valuemin", "0");
  els.progressTrack?.setAttribute("aria-valuemax", String(total));
  els.progressTrack?.setAttribute("aria-valuenow", String(done));
  const pct = total === 0 ? 0 : (done / total) * 100;
  els.progressBar.style.width = `${pct}%`;
}

function showMenu() {
  els.menuView.style.display = "block";
  els.quizView.classList.remove("show");
  els.tianganPanel.style.display = "none";
  els.dizhiPanel.style.display = "none";
  els.doneScreen.classList.remove("show");
  setStatus("請選擇一個測驗模式。");
  setProgress(0, 0);
}

function showQuiz() {
  els.menuView.style.display = "none";
  els.quizView.classList.add("show");
  els.doneScreen.classList.remove("show");
}

let mode = null; // "tiangan" | "dizhi"
let bank = [];
let total = 0;
let current = null;
let locked = false;

function buildTianganBank() {
  const keys = ["stem", "attr", "pos"];
  const q = [];
  for (let i = 0; i < TIANGAN_DATA.length; i++) {
    for (const showKey of keys) q.push({ idx: i, showKey });
  }
  return q;
}

function buildDizhiBank() {
  const q = [];
  for (let i = 0; i < DIZHI_DATA.length; i++) q.push({ idx: i });
  return q;
}

function setDisabledAll(panelInputs, disabled) {
  for (const i of panelInputs) i.disabled = disabled;
}

function focusFirstEditable(panelInputs) {
  const first = panelInputs.find(i => !i.disabled);
  first?.focus();
}

function validateAndMaybeAdvance() {
  if (!current || locked) return;

  if (mode === "tiangan") {
    const data = TIANGAN_DATA[current.idx];
    const mapping = { stem: els.tg_stem, attr: els.tg_attr, pos: els.tg_pos };
    const inputs = [els.tg_stem, els.tg_attr, els.tg_pos];

    let allOk = true;
    for (const key of ["stem", "attr", "pos"]) {
      const input = mapping[key];
      const isGiven = input.disabled;
      if (isGiven) {
        input.classList.add("okInput");
        continue;
      }
      const ok = normalize(input.value) === normalize(data[key]);
      input.classList.toggle("okInput", ok);
      input.classList.toggle("badInput", !ok && normalize(input.value) !== "");
      if (!ok) allOk = false;
    }

    if (allOk) {
      locked = true;
      setStatus(`<span class="okText">正確</span>（1 秒後自動下一題）`);
      window.setTimeout(() => nextQuestion(), 1000);
    } else {
      setStatus("持續修正到全部正確後會自動跳題。");
    }

    // 空白不紅：維持中性
    for (const i of inputs) {
      if (!i.disabled && normalize(i.value) === "") i.classList.remove("badInput");
    }
    return;
  }

  // mode === "dizhi"
  const data = DIZHI_DATA[current.idx];
  const inputs = [els.dz_branch, els.dz_main, els.dz_mid, els.dz_rem];

  // 地支是題目（鎖定）
  els.dz_branch.classList.add("okInput");

  const checks = [
    { input: els.dz_main, correct: data.main, normalizer: normalize },
    { input: els.dz_mid, correct: data.mid, normalizer: normalizeDash },
    { input: els.dz_rem, correct: data.rem, normalizer: normalizeDash },
  ];

  let allOk = true;
  for (const c of checks) {
    const user = c.normalizer(c.input.value);
    const ok = user === c.normalizer(c.correct);
    c.input.classList.toggle("okInput", ok);
    c.input.classList.toggle("badInput", !ok && normalize(c.input.value) !== "");
    if (!ok) allOk = false;
  }

  // 空白不紅：維持中性
  for (const c of checks) {
    if (normalize(c.input.value) === "") c.input.classList.remove("badInput");
  }

  if (allOk) {
    locked = true;
    setStatus(`<span class="okText">正確</span>（1 秒後自動下一題）`);
    window.setTimeout(() => nextQuestion(), 1000);
  } else {
    setStatus("提示：無中氣/餘氣者請輸入「-」。修正到全對會自動跳題。");
  }
}

function renderQuestion() {
  locked = false;
  clearMarks([els.tg_stem, els.tg_attr, els.tg_pos, els.dz_branch, els.dz_main, els.dz_mid, els.dz_rem]);

  const done = total - bank.length;
  setProgress(done, total);

  if (mode === "tiangan") {
    els.tianganPanel.style.display = "block";
    els.dizhiPanel.style.display = "none";
    els.doneScreen.classList.remove("show");

    const data = TIANGAN_DATA[current.idx];
    const mapping = { stem: els.tg_stem, attr: els.tg_attr, pos: els.tg_pos };
    const inputs = [els.tg_stem, els.tg_attr, els.tg_pos];

    for (const key of ["stem", "attr", "pos"]) {
      const input = mapping[key];
      const isGiven = key === current.showKey;
      input.disabled = isGiven;
      input.value = isGiven ? data[key] : "";
    }

    setStatus("請填寫其餘兩項；全對後 1 秒自動下一題。");
    focusFirstEditable(inputs);
    return;
  }

  // mode === "dizhi"
  els.tianganPanel.style.display = "none";
  els.dizhiPanel.style.display = "block";
  els.doneScreen.classList.remove("show");

  const data = DIZHI_DATA[current.idx];
  els.dz_branch.disabled = true;
  els.dz_branch.value = data.branch;
  els.dz_main.disabled = false;
  els.dz_mid.disabled = false;
  els.dz_rem.disabled = false;
  els.dz_main.value = "";
  els.dz_mid.value = "";
  els.dz_rem.value = "";

  setStatus("請填寫主氣／中氣／餘氣；全對後 1 秒自動下一題。");
  focusFirstEditable([els.dz_main, els.dz_mid, els.dz_rem]);
}

function finishMode() {
  setProgress(total, total);
  els.skipBtn.disabled = true;
  els.doneScreen.classList.add("show");
  els.tianganPanel.style.display = "none";
  els.dizhiPanel.style.display = "none";
  setStatus(`<span class="okText">完成</span>：本模式題目已全部作答。`);
  els.doneText.textContent =
    mode === "tiangan"
      ? "你已完成「天干臨官位」全部 30 題。"
      : "你已完成「地支藏干」全部 12 題。";
}

function nextQuestion() {
  if (bank.length === 0) return finishMode();
  current = bank.pop();
  renderQuestion();
}

function startMode(nextMode) {
  mode = nextMode;
  els.skipBtn.disabled = false;
  showQuiz();

  if (mode === "tiangan") {
    bank = shuffleInPlace(buildTianganBank());
    total = bank.length;
    nextQuestion();
    return;
  }

  bank = shuffleInPlace(buildDizhiBank());
  total = bank.length;
  nextQuestion();
}

function wireLiveValidation(inputs) {
  for (const i of inputs) {
    i.addEventListener("input", () => validateAndMaybeAdvance());
    i.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        validateAndMaybeAdvance();
      }
    });
  }
}

function wireEvents() {
  els.startTiangan.addEventListener("click", () => startMode("tiangan"));
  els.startDizhi.addEventListener("click", () => startMode("dizhi"));

  els.backBtn.addEventListener("click", () => showMenu());
  els.doneBackBtn.addEventListener("click", () => showMenu());

  els.skipBtn.addEventListener("click", () => {
    if (!mode) return;
    nextQuestion();
  });

  wireLiveValidation([els.tg_stem, els.tg_attr, els.tg_pos, els.dz_main, els.dz_mid, els.dz_rem]);
}

wireEvents();
showMenu();

