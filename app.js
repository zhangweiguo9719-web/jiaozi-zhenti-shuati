const STORAGE_KEYS = {
  answers: "quiz_app_answers",
  wrongBook: "quiz_app_wrong_book",
  favorites: "quiz_app_favorites",
};

const state = {
  questions: [],
  questionMap: new Map(),
  paper: null,
  paperQuestions: [],
  paperIndex: 0,
  practiceQuestions: [],
  practiceIndex: 0,
  currentView: "home-view",
  realtimeJudge: true,
  answers: loadLocalJson(STORAGE_KEYS.answers, {}),
  wrongBook: loadLocalJson(STORAGE_KEYS.wrongBook, []),
  favorites: loadLocalJson(STORAGE_KEYS.favorites, []),
};

const views = {
  home: document.getElementById("home-view"),
  paper: document.getElementById("paper-view"),
  practice: document.getElementById("practice-view"),
};

const template = document.getElementById("question-template");

init().catch((err) => {
  console.error(err);
  alert("初始化失败，请检查 data 目录文件是否存在。");
});

async function init() {
  const [questions, paper] = await Promise.all([
    fetchJson("data/questions.json"),
    fetchJson("data/papers/paper_demo.json"),
  ]);

  state.questions = questions;
  state.questionMap = new Map(questions.map((q) => [q.id, q]));
  state.paper = paper;
  state.paperQuestions = paper.questionIds.map((id) => state.questionMap.get(id)).filter(Boolean);

  bindEvents();
  renderYearOptions();
  showView("home-view");
}

function bindEvents() {
  document.getElementById("start-paper-btn").addEventListener("click", () => {
    state.paperIndex = 0;
    showView("paper-view");
    renderPaperMeta();
    renderPaperQuestion();
  });

  document.getElementById("start-practice-btn").addEventListener("click", () => {
    showView("practice-view");
    document.getElementById("practice-source-info").textContent = "请设置筛选条件后开始练习。";
    document.getElementById("practice-question").innerHTML = "";
  });

  document.querySelectorAll("[data-back-home]").forEach((btn) => {
    btn.addEventListener("click", () => showView("home-view"));
  });

  document.getElementById("realtime-toggle").addEventListener("change", (e) => {
    state.realtimeJudge = e.target.checked;
    renderPaperQuestion();
  });

  document.getElementById("paper-prev-btn").addEventListener("click", () => {
    if (state.paperIndex > 0) {
      state.paperIndex -= 1;
      renderPaperQuestion();
    }
  });

  document.getElementById("paper-next-btn").addEventListener("click", () => {
    if (state.paperIndex < state.paperQuestions.length - 1) {
      state.paperIndex += 1;
      renderPaperQuestion();
    }
  });

  document.getElementById("paper-submit-btn").addEventListener("click", submitPaper);

  document.getElementById("practice-filter-form").addEventListener("submit", (e) => {
    e.preventDefault();
    startPractice();
  });

  document.getElementById("practice-prev-btn").addEventListener("click", () => {
    if (state.practiceIndex > 0) {
      state.practiceIndex -= 1;
      renderPracticeQuestion();
    }
  });

  document.getElementById("practice-next-btn").addEventListener("click", () => {
    if (state.practiceIndex < state.practiceQuestions.length - 1) {
      state.practiceIndex += 1;
      renderPracticeQuestion();
    }
  });
}

function showView(viewId) {
  Object.values(views).forEach((el) => el.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
  state.currentView = viewId;
}

function renderYearOptions() {
  const yearSelect = document.getElementById("year-filter");
  const years = [...new Set(state.questions.map((q) => q.year))].sort((a, b) => b - a);
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.append(option);
  });
}

function renderPaperMeta() {
  const meta = document.getElementById("paper-meta");
  meta.textContent = `${state.paper.title}（共 ${state.paperQuestions.length} 题）`;
  document.getElementById("paper-result").innerHTML = "";
}

function renderPaperQuestion() {
  const question = state.paperQuestions[state.paperIndex];
  const mount = document.getElementById("paper-question");
  mount.innerHTML = "";
  if (!question) return;
  mount.append(buildQuestionCard(question, state.paperIndex + 1, "paper"));
}

function startPractice() {
  const year = document.getElementById("year-filter").value;
  const type = document.getElementById("type-filter").value;
  const keyword = document.getElementById("keyword-filter").value.trim();
  const count = Number(document.getElementById("count-filter").value) || 20;

  let pool = state.questions.filter((q) => (!year || String(q.year) === year) && (!type || q.type === type));
  if (keyword) {
    pool = pool.filter((q) => q.stem.includes(keyword));
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  state.practiceQuestions = shuffled.slice(0, Math.max(1, count));
  state.practiceIndex = 0;

  const info = document.getElementById("practice-source-info");
  info.textContent = `筛选到 ${pool.length} 题，已随机抽取 ${state.practiceQuestions.length} 题。`;

  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  const mount = document.getElementById("practice-question");
  mount.innerHTML = "";
  const question = state.practiceQuestions[state.practiceIndex];
  if (!question) {
    mount.innerHTML = "<p>暂无题目，请调整筛选条件后重试。</p>";
    return;
  }
  mount.append(buildQuestionCard(question, state.practiceIndex + 1, "practice", true));
}

function buildQuestionCard(question, index, scope, alwaysJudge = false) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = node.querySelector(".question-title");
  const stem = node.querySelector(".question-stem");
  const optionsWrap = node.querySelector(".options");
  const feedback = node.querySelector(".feedback");
  const favBtn = node.querySelector(".favorite-btn");

  title.textContent = `第 ${index} 题（${question.year} / ${question.subject} / ${question.type}）`;
  stem.textContent = question.stem;

  const answerState = state.answers[question.id] || {};

  Object.entries(question.options).forEach(([key, val]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "option-item";
    option.textContent = `${key}. ${val}`;
    if (answerState.choice === key) {
      option.classList.add("selected");
    }

    option.addEventListener("click", () => {
      saveAnswer(question, key, scope);
      if (state.currentView === "paper-view") {
        renderPaperQuestion();
      } else {
        renderPracticeQuestion();
      }
    });

    optionsWrap.append(option);
  });

  const shouldJudge = alwaysJudge || (scope === "paper" && state.realtimeJudge);
  if (answerState.choice && shouldJudge) {
    markFeedback(question, node, feedback, answerState.choice);
  }

  const favored = state.favorites.includes(question.id);
  favBtn.textContent = favored ? "取消收藏" : "收藏";
  favBtn.addEventListener("click", () => toggleFavorite(question.id, scope));

  return node;
}

function saveAnswer(question, choice, scope) {
  const correct = choice === question.answer;
  state.answers[question.id] = {
    choice,
    correct,
    at: new Date().toISOString(),
    scope,
  };
  persist(STORAGE_KEYS.answers, state.answers);

  if (!correct) {
    pushWrongQuestion(question.id);
  }
}

function markFeedback(question, node, feedbackEl, choice) {
  const options = node.querySelectorAll(".option-item");
  options.forEach((el) => {
    const key = el.textContent.slice(0, 1);
    if (key === question.answer) {
      el.classList.add("correct");
    }
    if (key === choice && key !== question.answer) {
      el.classList.add("wrong");
    }
  });

  if (choice === question.answer) {
    feedbackEl.className = "feedback pass";
    feedbackEl.textContent = `回答正确。解析：${question.analysis}`;
  } else {
    feedbackEl.className = "feedback fail";
    feedbackEl.textContent = `回答错误，正确答案是 ${question.answer}。解析：${question.analysis}`;
  }
}

function submitPaper() {
  let totalScore = 0;
  let correctCount = 0;
  const wrongIds = [];

  state.paperQuestions.forEach((q, idx) => {
    const answer = state.answers[q.id]?.choice;
    if (answer === q.answer) {
      totalScore += q.score;
      correctCount += 1;
    } else {
      wrongIds.push({ id: q.id, no: idx + 1 });
      pushWrongQuestion(q.id);
    }
  });

  const result = document.getElementById("paper-result");
  const total = state.paperQuestions.reduce((sum, q) => sum + q.score, 0);

  result.innerHTML = `
    <h3>交卷结果</h3>
    <p>总分：${totalScore} / ${total}</p>
    <p>正确题数：${correctCount} / ${state.paperQuestions.length}</p>
    <p>错误题数：${wrongIds.length}</p>
    <ul>
      ${wrongIds
        .map(
          (item) =>
            `<li><button type="button" class="jump-btn" data-qno="${item.no}">第 ${item.no} 题（ID: ${item.id}）</button></li>`
        )
        .join("")}
    </ul>
  `;

  result.querySelectorAll(".jump-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const no = Number(btn.dataset.qno);
      state.paperIndex = Math.max(0, no - 1);
      renderPaperQuestion();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function toggleFavorite(questionId) {
  const set = new Set(state.favorites);
  if (set.has(questionId)) {
    set.delete(questionId);
  } else {
    set.add(questionId);
  }
  state.favorites = [...set];
  persist(STORAGE_KEYS.favorites, state.favorites);

  if (state.currentView === "paper-view") {
    renderPaperQuestion();
  } else if (state.currentView === "practice-view") {
    renderPracticeQuestion();
  }
}

function pushWrongQuestion(questionId) {
  if (!state.wrongBook.includes(questionId)) {
    state.wrongBook.push(questionId);
    persist(STORAGE_KEYS.wrongBook, state.wrongBook);
  }
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`读取失败: ${path}`);
  }
  return res.json();
}

function loadLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
