// 24 節氣與地支月抽考工具（內建資料 + 隨機出題）

const DATA = [
  { month: "1月", branchMonth: "丑月", jie: "小寒", qi: "大寒", season: "冬末" },
  { month: "2月", branchMonth: "寅月", jie: "立春", qi: "雨水", season: "初春" },
  { month: "3月", branchMonth: "卯月", jie: "驚蟄", qi: "春分", season: "春" },
  { month: "4月", branchMonth: "辰月", jie: "清明", qi: "穀雨", season: "春末" },
  { month: "5月", branchMonth: "巳月", jie: "立夏", qi: "小滿", season: "初夏" },
  { month: "6月", branchMonth: "午月", jie: "芒種", qi: "夏至", season: "夏" },
  { month: "7月", branchMonth: "未月", jie: "小暑", qi: "大暑", season: "夏末" },
  { month: "8月", branchMonth: "申月", jie: "立秋", qi: "處暑", season: "初秋" },
  { month: "9月", branchMonth: "酉月", jie: "白露", qi: "秋分", season: "秋" },
  { month: "10月", branchMonth: "戌月", jie: "寒露", qi: "霜降", season: "秋末" },
  { month: "11月", branchMonth: "亥月", jie: "立冬", qi: "小雪", season: "初冬" },
  { month: "12月", branchMonth: "子月", jie: "大雪", qi: "冬至", season: "冬" },
];

// 5 個欄位（共 12*5=60 個資料格）
const FIELDS = [
  { key: "month", label: "月份" },
  { key: "branchMonth", label: "地支月" },
  { key: "jie", label: "節（前半月）" },
  { key: "qi", label: "氣（後半月）" },
  { key: "season", label: "季節" },
];

const els = {
  month: document.getElementById("month"),
  branchMonth: document.getElementById("branchMonth"),
  jie: document.getElementById("jie"),
  qi: document.getElementById("qi"),
  season: document.getElementById("season"),
  status: document.getElementById("status"),
  progressText: document.getElementById("progressText"),
  progressBar: document.getElementById("progressBar"),
  statsLine1: document.getElementById("statsLine1"),
  statsLine2: document.getElementById("statsLine2"),
  checkBtn: document.getElementById("checkBtn"),
  nextBtn: document.getElementById("nextBtn"),
  revealBtn: document.getElementById("revealBtn"),
  resetBtn: document.getElementById("resetBtn"),
  resetProgressBtn: document.getElementById("resetProgressBtn"),
};

// 題庫：12 個月份 × 5 個欄位 = 60 題（出過不重複）
const TOTAL_QUESTIONS = DATA.length * FIELDS.length;
let remainingQuestions = [];
let currentQuestion = null; // { rowIndex, givenFieldKey }
let currentRow = null;      // DATA[currentQuestion.rowIndex]
let givenFieldKey = null;   // currentQuestion.givenFieldKey
let locked = false;         // 防止答對自動跳題時重複觸發
let correctCount = 0;
let wrongCount = 0;
let answeredCount = 0;
let totalAnswerMs = 0;
let questionStartTime = null;

function normalize(s) {
  return (s ?? "")
    .toString()
    .replace(/\s+/g, "")
    .replace(/[　]/g, "")
    .trim();
}

function normalizeMonth(s) {
  // 只比對阿拉伯數字：1,2,...,12；忽略「月」與其他字元
  return (s ?? "")
    .toString()
    .replace(/[^\d]/g, "")
    .trim();
}

function normalizeBranchMonth(s) {
  // 比對地支：丑、寅...；忽略「月」與空白
  return (s ?? "")
    .toString()
    .replace(/月/g, "")
    .replace(/\s+/g, "")
    .replace(/[　]/g, "")
    .trim();
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clearMarks() {
  for (const f of FIELDS) {
    const input = els[f.key];
    input.classList.remove("okInput", "badInput");
  }
}

function setStatus(html) {
  els.status.innerHTML = html;
}

function updateStatsDisplay() {
  const total = answeredCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const totalSeconds = totalAnswerMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  const avgSeconds = total > 0 ? (totalSeconds / total) : 0;

  if (els.statsLine1) {
    els.statsLine1.textContent = `答對：${correctCount} 題　｜　答錯：${wrongCount} 題　｜　正確率：${accuracy}%`;
  }

  if (els.statsLine2) {
    const secStr = String(seconds).padStart(2, "0");
    const avgStr = avgSeconds.toFixed(1).replace(/\.0$/, "");
    els.statsLine2.textContent = `總答題時間：${minutes}:${secStr}（平均 ${avgStr} 秒 / 題）`;
  }
}

function setProgress() {
  const doneNow = TOTAL_QUESTIONS - remainingQuestions.length;
  if (els.progressText) els.progressText.textContent = `進度：${doneNow} / ${TOTAL_QUESTIONS}`;
  if (els.progressBar) els.progressBar.style.width = `${(doneNow / TOTAL_QUESTIONS) * 100}%`;
  const track = document.querySelector(".progressTrack[role='progressbar']");
  if (track) track.setAttribute("aria-valuenow", String(doneNow));
}

function setGivenField(fieldKey) {
  givenFieldKey = fieldKey;
  for (const f of FIELDS) {
    const input = els[f.key];
    const isGiven = f.key === givenFieldKey;
    input.disabled = isGiven;
    input.dataset.given = isGiven ? "1" : "0";
  }
}

function fillInputsForNewQuestion() {
  clearMarks();
  locked = false;
  setStatus("請輸入其餘 4 個欄位，完成後按「核對」。");
  questionStartTime = performance.now();

  // 題目欄位：顯示且鎖定；其他欄位：清空讓使用者輸入
  for (const f of FIELDS) {
    const input = els[f.key];
    if (f.key === givenFieldKey) {
      input.value = currentRow[f.key];
    } else {
      input.value = "";
    }
  }

  // 游標跳到第一個可輸入欄位
  const firstEditable = FIELDS.map(f => els[f.key]).find(i => !i.disabled);
  if (firstEditable) firstEditable.focus();
}

function buildQuestionBank() {
  const q = [];
  for (let rowIndex = 0; rowIndex < DATA.length; rowIndex++) {
    for (const f of FIELDS) {
      q.push({ rowIndex, givenFieldKey: f.key });
    }
  }
  return q;
}

function resetProgress() {
  remainingQuestions = shuffleInPlace(buildQuestionBank());
  currentQuestion = null;
  currentRow = null;
  givenFieldKey = null;
  correctCount = 0;
  wrongCount = 0;
  answeredCount = 0;
  totalAnswerMs = 0;
  questionStartTime = null;
  els.checkBtn.disabled = false;
  els.nextBtn.disabled = false;
  els.revealBtn.disabled = false;
  els.resetBtn.disabled = false;
  setProgress();
  updateStatsDisplay();
  nextQuestion();
}

function nextQuestion() {
  if (remainingQuestions.length === 0) {
    clearMarks();
    locked = false;
    setProgress();
    updateStatsDisplay();
    const total = answeredCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const totalSeconds = totalAnswerMs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    const secStr = String(seconds).padStart(2, "0");
    setStatus(
      `<span class="okText">恭喜完成 60 題！</span><br>` +
      `正確率：${accuracy}%　｜　總時間：${minutes}:${secStr}<br>` +
      `可按「進度歸 0」重新開始一輪。`
    );
    els.checkBtn.disabled = true;
    els.nextBtn.disabled = true;
    els.revealBtn.disabled = true;
    els.resetBtn.disabled = true;
    return;
  }

  currentQuestion = remainingQuestions.pop(); // 出過就移除，不再重複
  currentRow = DATA[currentQuestion.rowIndex];
  setGivenField(currentQuestion.givenFieldKey);
  setProgress();
  fillInputsForNewQuestion();
}

function getUserAnswers() {
  const out = {};
  for (const f of FIELDS) out[f.key] = els[f.key].value;
  return out;
}

function checkAnswer() {
  if (locked) return;
  if (!currentRow || !givenFieldKey) nextQuestion();

  clearMarks();

  // 記錄作答時間與統計
  const now = performance.now();
  if (questionStartTime != null) {
    totalAnswerMs += now - questionStartTime;
    answeredCount += 1;
    questionStartTime = null;
  }

  const user = getUserAnswers();
  const correct = currentRow;

  let allCorrect = true;
  const wrongKeys = [];

  for (const f of FIELDS) {
    const input = els[f.key];
    const isGiven = input.disabled;
    if (isGiven) {
      input.classList.add("okInput");
      continue;
    }
    let ok;
    if (f.key === "month") {
      ok = normalizeMonth(user[f.key]) === normalizeMonth(correct[f.key]);
    } else if (f.key === "branchMonth") {
      ok = normalizeBranchMonth(user[f.key]) === normalizeBranchMonth(correct[f.key]);
    } else {
      ok = normalize(user[f.key]) === normalize(correct[f.key]);
    }
    if (ok) {
      input.classList.add("okInput");
    } else {
      input.classList.add("badInput");
      allCorrect = false;
      wrongKeys.push(f.key);
    }
  }

  if (allCorrect) {
    correctCount += 1;
    updateStatsDisplay();
    locked = true;
    setStatus(`<span class="okText">正確</span>（50ms 後自動下一題）`);
    window.setTimeout(() => {
      nextQuestion();
    }, 50);
    return;
  }

  const correctLine = `正解：${correct.month}／${correct.branchMonth}／${correct.jie}／${correct.qi}／${correct.season}`;
  const wrongLabels = wrongKeys
    .map(k => FIELDS.find(f => f.key === k)?.label ?? k)
    .join("、");

  wrongCount += 1;
  updateStatsDisplay();

  setStatus(
    `<span class="badText">錯誤</span>（錯在：${wrongLabels}）<br>${correctLine}<br>請按「下一題」繼續。`
  );
}

function revealAnswer() {
  if (!currentRow) return;
  const c = currentRow;
  setStatus(
    `本題正解：${c.month}／${c.branchMonth}／${c.jie}／${c.qi}／${c.season}`
  );
}

function wireEvents() {
  els.checkBtn.addEventListener("click", checkAnswer);
  els.nextBtn.addEventListener("click", () => nextQuestion());
  els.revealBtn.addEventListener("click", revealAnswer);
  // 重新隨機：本版等同「下一題」（但仍不重複）
  els.resetBtn.addEventListener("click", () => nextQuestion());
  els.resetProgressBtn.addEventListener("click", resetProgress);

  // Enter 直接核對（Shift+Enter 不做事）
  for (const f of FIELDS) {
    els[f.key].addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        checkAnswer();
      }
    });
  }
}

wireEvents();
resetProgress();

