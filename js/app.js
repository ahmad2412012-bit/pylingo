// ============ PyLingo App ============

const app = {
  state: {
    units: [],
    currentLesson: null,
    currentExerciseIndex: 0,
    selectedAnswer: null,
    correctCount: 0,
    totalCount: 0,
    lessonHearts: 5,
    currentUnitId: null,
    pendingAction: null,
    currentExercises: [],
    isQuiz: false,
    lessonMistakes: 0,
    quizUnitId: null,
    isReplay: false,
    isMistakesReview: false,
    currentSectionIndex: 0,
    codeTask: null,
    codeTaskMode: null
  },

  sectionTitles: [
    { title: 'القسم 1: أساسيات بايثون', icon: '🐍' },
    { title: 'القسم 2: هياكل البيانات', icon: '📊' },
    { title: 'القسم 3: البرمجة الكائنية', icon: '🏗️' },
    { title: 'القسم 4: تطوير الويب', icon: '🌐' },
    { title: 'القسم 5: تحليل البيانات', icon: '📈' },
    { title: 'القسم 6: الذكاء الاصطناعي', icon: '🤖' }
  ],

  heartsTimer: null,
  _syncTimeout: null,

  async loadUnits() {
    try {
      const promises = [];
      for (let i = 1; i <= 30; i++) {
        promises.push(
          fetch('data/unit' + i + '.json')
            .then(res => (res.ok ? res.json() : null))
            .catch(() => null)
        );
      }
      const results = await Promise.all(promises);
      this.state.units = results.filter(u => u !== null);
      return this.state.units;
    } catch (error) {
      return [];
    }
  },

  async init() {
    await this.loadUnits();
    if (this.state.units.length === 0) return;

    const savedSection = localStorage.getItem('pylingo_current_section');
    if (savedSection) this.state.currentSectionIndex = parseInt(savedSection, 10) || 0;

    this.setupSidebar();
    this.setupGlobalButtons();
    this.generateDailyQuests();
    this.renderHome();
    this.updateHeaderStats();

    if (typeof authModule !== 'undefined') authModule.init();

    setTimeout(() => {
      if (typeof firestoreModule !== 'undefined' && !firestoreModule.db) firestoreModule.init();
    }, 1500);

    this.startHeartsTimer();
  },

  setupGlobalButtons() {
    const bindings = [
      ['run-code-btn', () => this.runCodeTask()],
      ['reset-code-btn', () => this.resetCodeDraft()],
      ['close-code-btn', () => this.closeCodeTask()],
      ['start-exercises-btn', () => this.startExercises()],
      ['close-explanation-btn', () => this.closeExplanation()],
      ['continue-complete-btn', () => this.continueFromComplete()],
      ['close-lesson-btn', () => this.closeLesson()],
      ['open-shop-btn', () => this.openShop()],
      ['close-shop-btn', () => this.closeShop()],
      ['buy-hearts-btn', () => this.buyHearts()],
      ['buy-freeze-btn', () => this.buyStreakFreeze()],
      ['buy-double-xp-btn', () => this.buyDoubleXP()],
      ['open-achievements-btn', () => this.openAchievements()],
      ['close-achievements-btn', () => this.closeAchievements()],
      ['open-leaderboard-btn', () => this.openLeaderboard()],
      ['close-leaderboard-btn', () => this.closeLeaderboard()],
      ['open-quests-btn', () => this.openQuests()],
      ['close-quests-btn', () => this.closeQuests()],
      ['open-mistakes-btn', () => this.openMistakes()],
      ['close-mistakes-btn', () => this.closeMistakes()]
    ];

    bindings.forEach(([id, handler]) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'BUTTON' && !el.getAttribute('type')) {
          el.setAttribute('type', 'button');
        }
        el.onclick = (e) => {
          e.preventDefault();
          handler();
        };
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (typeof this[action] === 'function') {
        e.preventDefault();
        this[action]();
      }
    });
  },

  setupSidebar() {
    const menuBtn = document.getElementById('sections-menu-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const overlay = document.getElementById('sidebar-overlay');
    if (menuBtn) menuBtn.onclick = () => this.openSidebar();
    if (closeBtn) closeBtn.onclick = () => this.closeSidebar();
    if (overlay) overlay.onclick = () => this.closeSidebar();
  },

  openSidebar() {
    this.renderSidebar();
    const s = document.getElementById('sections-sidebar');
    const o = document.getElementById('sidebar-overlay');
    if (s) s.classList.add('show');
    if (o) o.classList.add('show');
    if (window.sounds) sounds.playClick();
  },

  closeSidebar() {
    const s = document.getElementById('sections-sidebar');
    const o = document.getElementById('sidebar-overlay');
    if (s) s.classList.remove('show');
    if (o) o.classList.remove('show');
  },

  switchSection(index) {
    this.state.currentSectionIndex = index;
    localStorage.setItem('pylingo_current_section', index);
    this.renderHome();
    this.closeSidebar();
    if (window.sounds) sounds.playClick();
  },

  renderSidebar() {
    const container = document.getElementById('sections-list');
    if (!container) return;
    container.innerHTML = '';
    this.sectionTitles.forEach((sec, index) => {
      if (index * 5 >= this.state.units.length) return;
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      if (index === this.state.currentSectionIndex) item.classList.add('active');
      item.innerHTML = `<span style="font-size: 24px;">${sec.icon}</span> <span>${sec.title}</span>`;
      item.onclick = () => this.switchSection(index);
      container.appendChild(item);
    });
  },

  generateDailyQuests() {
    const user = storage.getUser();
    const today = new Date().toDateString();
    if (user.dailyQuests && user.dailyQuests.date === today) return;

    const pool = [
      { id: 'xp50', icon: '⚡', text: 'اكسب 50 XP', stat: 'xp', target: 50, reward: 20 },
      { id: 'les2', icon: '📚', text: 'خلّص درسين', stat: 'lessons', target: 2, reward: 30 },
      { id: 'gems20', icon: '💎', text: 'اكسب 20 جوهرة', stat: 'gems', target: 20, reward: 15 },
      { id: 'perf1', icon: '🔥', text: 'خلّص درس بدون أخطاء', stat: 'perfect', target: 1, reward: 40 }
    ];

    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
    const quests = shuffled.map(q => ({ ...q, current: 0, claimed: false }));

    user.dailyQuests = { date: today, quests: quests };
    storage.setUser(user);
  },

  updateQuestProgress(stat, amount) {
    const user = storage.getUser();
    if (!user.dailyQuests) return;
    let changed = false;
    user.dailyQuests.quests.forEach(q => {
      if (q.stat === stat && !q.claimed && q.current < q.target) {
        q.current += amount;
        if (q.current > q.target) q.current = q.target;
        changed = true;
      }
    });
    if (changed) storage.setUser(user);
  },

  openQuests() { this.renderQuests(); this.showScreen('quests-screen'); if (window.sounds) sounds.playClick(); },
  closeQuests() { this.showScreen('home-screen'); },

  renderQuests() {
    const container = document.getElementById('quests-list');
    if (!container) return;
    container.innerHTML = '';
    const user = storage.getUser();
    this.generateDailyQuests();
    const quests = user.dailyQuests.quests;
    let completed = 0;

    quests.forEach(q => {
      if (q.claimed) completed++;
      const card = document.createElement('div');
      card.className = 'achievement-card' + (q.claimed ? ' unlocked' : '');
      card.innerHTML = `
        <div class="achievement-icon">${q.claimed ? '✅' : q.icon}</div>
        <div class="achievement-info">
          <h3>${q.text}</h3>
          <p>${Math.min(q.current, q.target)} / ${q.target}</p>
        </div>
        ${q.current >= q.target && !q.claimed
          ? `<button type="button" class="btn-primary" onclick="app.claimQuest('${q.id}', ${q.reward})" style="padding: 5px 15px; font-size: 14px; width:auto;">استلام 💎${q.reward}</button>`
          : (q.claimed ? '<div class="achievement-check">✓</div>' : '')}
      `;
      container.appendChild(card);
    });
    const countEl = document.getElementById('quests-count');
    if (countEl) countEl.textContent = completed + ' / ' + quests.length;
  },

  claimQuest(questId, reward) {
    const user = storage.getUser();
    const q = user.dailyQuests.quests.find(x => x.id === questId);
    if (q && q.current >= q.target && !q.claimed) {
      q.claimed = true;
      user.gems += reward;
      storage.setUser(user);
      if (window.sounds) sounds.playLevelUp();
      this.updateHeaderStats();
      this.renderQuests();
      this.showToast('🎉 تم استلام المكافأة!', 'success');
    }
  },

  openMistakes() { this.renderMistakes(); this.showScreen('mistakes-screen'); if (window.sounds) sounds.playClick(); },
  closeMistakes() { this.showScreen('home-screen'); },

  renderMistakes() {
    const container = document.getElementById('mistakes-list');
    if (!container) return;
    const user = storage.getUser();
    const mistakes = user.mistakes || [];
    const countEl = document.getElementById('mistakes-count');
    if (countEl) countEl.textContent = mistakes.length;

    if (mistakes.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--primary); font-weight:bold; margin-top:20px;">🎉 عاش! مفيش أخطاء مسجلة.</p>';
      return;
    }

    container.innerHTML = `<button type="button" class="btn-primary" onclick="app.startMistakesReview()" style="margin-bottom:20px;">🚀 ابدأ مراجعة الأخطاء</button>`;
    mistakes.forEach((ex, i) => {
      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `<div class="achievement-icon">🩹</div><div class="achievement-info"><h3>سؤال ${i + 1}</h3><p style="font-size:12px; color:var(--gray-500);">${(ex.question || '').substring(0, 50)}...</p></div>`;
      container.appendChild(card);
    });
  },

  startMistakesReview() {
    const mistakes = storage.getUser().mistakes || [];
    if (mistakes.length === 0) return;
    this.state.currentExercises = mistakes;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;
    this.state.totalCount = mistakes.length;
    this.state.isMistakesReview = true;
    this.state.isQuiz = false;
    this.state.isReplay = true;
    this.state.lessonMistakes = 0;
    this.state.lessonHearts = storage.getUser().hearts;

    const heartsEl = document.getElementById('lesson-hearts');
    if (heartsEl) heartsEl.textContent = this.state.lessonHearts;
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  renderHome() {
    const container = document.getElementById('units-container');
    const user = storage.getUser();
    if (!container) return;
    container.innerHTML = '';
    if (!this.state.units || this.state.units.length === 0) return;

    const currentSec = this.state.currentSectionIndex;
    const startIdx = currentSec * 5;
    const endIdx = startIdx + 5;
    const sectionUnits = this.state.units.slice(startIdx, endIdx);
    const secData = this.sectionTitles[currentSec] || { title: 'قسم جديد', icon: '📚' };

    const divider = document.createElement('div');
    divider.className = 'section-divider';
    divider.innerHTML = `<span class="section-icon">${secData.icon}</span><h2>${secData.title}</h2>`;
    container.appendChild(divider);

    if (sectionUnits.length === 0) {
      container.innerHTML += '<p style="text-align:center; color:var(--gray-500); margin-top:20px;">قريباً...</p>';
      return;
    }

    sectionUnits.forEach((unit, localIdx) => {
      const unitIndex = startIdx + localIdx;
      let isUnitUnlocked = true;
      if (unitIndex > 0) {
        const prevUnit = this.state.units[unitIndex - 1];
        const allPrevLessonsDone = prevUnit.lessons.every(l => user.completedLessons.includes(l.id));
        const prevQuizDone = user.completedProjects.includes(prevUnit.id + '-quiz');
        isUnitUnlocked = allPrevLessonsDone && prevQuizDone;
      }

      const unitEl = document.createElement('div');
      unitEl.className = 'unit';
      const allLessonsDone = unit.lessons.every(l => user.completedLessons.includes(l.id));
      const quizDone = user.completedProjects.includes(unit.id + '-quiz');

      unitEl.innerHTML = `
        <div class="unit-header">
          <div class="unit-icon">${unit.icon}</div>
          <div class="unit-info"><h3>${unit.title}</h3><p>${unit.description}</p></div>
        </div>
        <div class="unit-lessons" id="unit-${unit.id}-lessons"></div>
      `;
      container.appendChild(unitEl);
      const lessonsContainer = document.getElementById('unit-' + unit.id + '-lessons');

      unit.lessons.forEach((lesson, idx) => {
        const isCompleted = user.completedLessons.includes(lesson.id);
        const prevLesson = idx > 0 ? unit.lessons[idx - 1] : null;
        const isUnlocked = isUnitUnlocked && (!prevLesson || user.completedLessons.includes(prevLesson.id));

        const node = document.createElement('div');
        node.className = 'lesson-node' + (isCompleted ? ' completed' : '') + (!isUnlocked ? ' locked' : '');
        node.textContent = isCompleted ? '✓' : (idx + 1);
        node.title = lesson.title;
        if (isUnlocked) node.onclick = () => this.startLesson(unit.id, lesson.id);
        if (lessonsContainer) lessonsContainer.appendChild(node);
      });

      const quizUnlocked = isUnitUnlocked && allLessonsDone;
      const quizNode = document.createElement('div');
      quizNode.className = 'lesson-node project' + (quizDone ? ' completed' : '') + (!quizUnlocked ? ' locked' : '');
      quizNode.textContent = quizDone ? '✓' : '🚀';
      quizNode.title = 'مشروع الوحدة - ' + unit.title;
      if (quizUnlocked) quizNode.onclick = () => this.startUnitProject(unit.id);
      if (lessonsContainer) lessonsContainer.appendChild(quizNode);
    });
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
  },

  startLesson(unitId, lessonId) {
    const user = storage.getUser();
    if (user.hearts <= 0) { alert('مفيش قلوب!'); return; }
    const unit = this.state.units.find(u => u.id === unitId);
    const lesson = unit.lessons.find(l => l.id === lessonId);

    this.state.currentLesson = lesson;
    this.state.currentUnitId = unitId;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;

    let exercises = [...lesson.exercises];
    exercises.push(this.createLessonCodeChallenge(unit, lesson));

    this.state.currentExercises = exercises;
    this.state.totalCount = exercises.length;
    this.state.selectedAnswer = null;
    this.state.lessonHearts = user.hearts;
    this.state.isQuiz = false;
    this.state.isMistakesReview = false;
    this.state.isReplay = user.completedLessons.includes(lessonId);
    this.state.lessonMistakes = 0;

    const heartsEl = document.getElementById('lesson-hearts');
    if (heartsEl) heartsEl.textContent = this.state.lessonHearts;

    this.showExplanation(lesson, unit);
  },

  normalizeTaskKey(unit, lesson) {
    const uNum = String(unit.id).replace(/\D+/g, '');
    const lStr = String(lesson.id || '');
    const lNum = lStr.replace(/\D+/g, '');
    return {
      byNum: `${uNum}-${lNum}`,
      byRaw: `${unit.id}:${lStr}`
    };
  },

  createLessonCodeChallenge(unit, lesson) {
    const rawTitle = (lesson.title || '').trim();
    const { byNum, byRaw } = this.normalizeTaskKey(unit, lesson);

    // ✅ تم تعديل المهام لتتطابق 100% مع منهجك (خاصة الوحدة الأولى)
    const fixedTasks = {
      // الوحدة 1: الأساسيات
      '1-1': {
        ideaTitle: 'أمر الطباعة print()',
        explanation: 'اكتب كود بايثون يطبع جملة "Hello Python" على الشاشة.',
        requiredVariables: [],
        expectedOutput: 'Hello Python',
        testInput: '',
        hints: ['استخدم print("Hello Python")']
      },
      '1-2': {
        ideaTitle: 'كتابة تعليق #',
        explanation: 'اكتب تعليقاً يبدأ بـ # يحتوي على كلمة "Comment"، ثم اطبع كلمة "Done".',
        requiredVariables: [],
        expectedOutput: 'Done',
        testInput: '',
        hints: ['التعليق يبدأ بـ # ولا يُنفّذ.', 'اطبع "Done" في سطر جديد']
      },
      '1-3': {
        ideaTitle: 'تحديث قيمة متغير',
        explanation: 'عرّف متغيراً باسم points بقيمة 10، ثم حدّث قيمته لتصبح 20 واطبع points.',
        requiredVariables: ['points'],
        expectedOutput: '20',
        testInput: '',
        hints: ['أعد إسناد points = 20 بعد points = 10.', 'اطبع points']
      },
      '1-4': {
        ideaTitle: 'أنواع البيانات (Data Types)',
        explanation: 'عرّف 3 متغيرات: num_int = 5 (رقم صحيح)، num_float = 3.14 (رقم عشري)، و name_str = "Python" (نص). ثم اطبع name_str فقط.',
        requiredVariables: ['num_int', 'num_float', 'name_str'],
        expectedOutput: 'Python',
        testInput: '',
        hints: ['تأكد من كتابة الأرقام بدون علامات تنصيص، والنص بعلامات تنصيص.', 'اطبع name_str']
      },
      '1-5': {
        ideaTitle: 'استقبال المدخلات بـ input()',
        explanation: 'اقرأ اسم المستخدم عبر input() في متغير باسم user_name، ثم اطبع "Welcome " + user_name.',
        requiredVariables: ['user_name'],
        expectedOutput: 'Welcome Ahmad',
        testInput: 'Ahmad\n',
        hints: ['استخدم user_name = input().', 'اطبع "Welcome " + user_name']
      },
      '1-6': {
        ideaTitle: 'حلقة while',
        explanation: 'استخدم حلقة while لطباعة الأرقام من 1 إلى 3 (كل رقم في سطر).',
        requiredVariables: [],
        expectedOutput: '1\n2\n3',
        testInput: '',
        hints: ['ابدأ بعدّاد وحدثه داخل while.', 'اطبع العداد داخل الحلقة']
      },
      '1-7': {
        ideaTitle: 'العمليات الحسابية',
        explanation: 'عرّف متغيراً باسم num_a بقيمة 12 ومتغيراً باسم num_b بقيمة 4، ثم خزّن ناتج الضرب في calc_mult واطبعه.',
        requiredVariables: ['num_a', 'num_b', 'calc_mult'],
        expectedOutput: '48',
        testInput: '',
        hints: ['احسب num_a * num_b داخل calc_mult.', 'اطبع calc_mult']
      },
      '1-8': {
        ideaTitle: 'عمليات المقارنة',
        explanation: 'عرّف متغيراً باسم speed_val بقيمة 120، وخزّن نتيجة المقارنة (speed_val > 100) في is_fast واطبعها.',
        requiredVariables: ['speed_val', 'is_fast'],
        expectedOutput: 'True',
        testInput: '',
        hints: ['المقارنة ترجع True أو False.', 'اطبع is_fast']
      },

      // الوحدة 2: الأرقام والعمليات
      '2-9': {
        ideaTitle: 'الأنواع الرقمية int و float',
        explanation: 'عرّف متغيراً باسم raw_num بقيمة "15"، وحوّله إلى int في متغير باسم int_num ثم اطبع int_num.',
        requiredVariables: ['raw_num', 'int_num'],
        expectedOutput: '15',
        testInput: '',
        hints: ['استخدم int(raw_num).', 'اطبع int_num']
      },
      '2-10': {
        ideaTitle: 'القسمة والباقي والأس',
        explanation: 'عرّف متغيراً باسم mod_res بقيمة (10 % 3) واطبعه.',
        requiredVariables: ['mod_res'],
        expectedOutput: '1',
        testInput: '',
        hints: ['الرمز % يرجع باقي القسمة.', 'اطبع mod_res']
      },
      '2-11': {
        ideaTitle: 'الدوال الرياضية round و abs',
        explanation: 'عرّف متغيراً باسم rounded_val بقيمة round(3.7) واطبعه.',
        requiredVariables: ['rounded_val'],
        expectedOutput: '4',
        testInput: '',
        hints: ['استخدم round(3.7).', 'اطبع rounded_val']
      },
      '2-12': {
        ideaTitle: 'ترتيب العمليات بالأقواس',
        explanation: 'عرّف متغيراً باسم order_res بقيمة ((2 + 3) * 4) واطبعه.',
        requiredVariables: ['order_res'],
        expectedOutput: '20',
        testInput: '',
        hints: ['الأقواس تُنفّذ أولاً.', 'اطبع order_res']
      },
      '2-13': {
        ideaTitle: 'تحويل الأنواع str()',
        explanation: 'عرّف متغيراً باسم count_num بقيمة 5، وحوّله لنص لطباعة "5 items" واطبعه.',
        requiredVariables: ['count_num'],
        expectedOutput: '5 items',
        testInput: '',
        hints: ['استخدم str(count_num) + " items".', 'اطبع النتيجة']
      },
      '2-14': {
        ideaTitle: 'الأرقام المركبة Complex',
        explanation: 'عرّف رقماً مركباً باسم z_num بقيمة (3 + 4j)، ثم اطبع z_num.real.',
        requiredVariables: ['z_num'],
        expectedOutput: '3.0',
        testInput: '',
        hints: ['استخدم حرف j للجزء التخيلي.', 'اطبع z_num.real']
      },

      // الوحدة 3: التحكم في التدفق
      '3-14': {
        ideaTitle: 'شرط if الأساسي',
        explanation: 'عرّف متغيراً باسم x_val بقيمة 10، وإذا كان أكبر من 5 اطبع "Big".',
        requiredVariables: ['x_val'],
        expectedOutput: 'Big',
        testInput: '',
        hints: ['اكتب if x_val > 5:', 'اطبع "Big" بإزاحة داخلية']
      },
      '3-15': {
        ideaTitle: 'if و else',
        explanation: 'عرّف متغيراً باسم age_val بقيمة 15، وإذا كان >= 18 اطبع "Adult" وإلا اطبع "Minor".',
        requiredVariables: ['age_val'],
        expectedOutput: 'Minor',
        testInput: '',
        hints: ['استخدم if و else مع نقطتين رأسيتين (:).', '15 أصغر من 18']
      },
      '3-16': {
        ideaTitle: 'elif للشروط المتعددة',
        explanation: 'عرّف متغيراً باسم grade_val بقيمة 85، واطبع "B" إذا كان >= 80 و< 90 باستخدام elif.',
        requiredVariables: ['grade_val'],
        expectedOutput: 'B',
        testInput: '',
        hints: ['استخدم if ثم elif ثم else.', 'اطبع الحرف المناسب']
      },
      '3-17': {
        ideaTitle: 'العوامل المنطقية and, or, not',
        explanation: 'عرّف متغيراً باسم n_val بقيمة 10، وإذا تحقق (n_val > 5 and n_val < 20) اطبع "In Range".',
        requiredVariables: ['n_val'],
        expectedOutput: 'In Range',
        testInput: '',
        hints: ['اربط الشرطين بكلمة and.', 'اطبع "In Range"']
      },

      // الوحدة 4: الحلقات المتقدمة
      '4-18': {
        ideaTitle: 'حلقة for',
        explanation: 'استخدم حلقة for للمرور على القائمة [1, 2, 3] واطبع كل عنصر في سطر.',
        requiredVariables: [],
        expectedOutput: '1\n2\n3',
        testInput: '',
        hints: ['استخدم for item in [1, 2, 3]:', 'اطبع item داخل الحلقة']
      },
      '4-19': {
        ideaTitle: 'توليد الأرقام بـ range()',
        explanation: 'استخدم for مع range(1, 4) لطباعة الأرقام 1 و 2 و 3 في أسطر منفصلة.',
        requiredVariables: [],
        expectedOutput: '1\n2\n3',
        testInput: '',
        hints: ['range(1, 4) يبدأ من 1 وينتهي قبل 4.', 'اطبع العداد داخل الحلقة']
      },
      '4-20': {
        ideaTitle: 'break و continue',
        explanation: 'استخدم حلقة من 0 إلى 4 مع continue لتخطي الرقم 2 واطبع باقي الأرقام.',
        requiredVariables: [],
        expectedOutput: '0\n1\n3\n4',
        testInput: '',
        hints: ['إذا كان الرقم يساوي 2 نفّذ continue.', 'اطبع الرقم في باقي الحالات']
      },
      '4-21': {
        ideaTitle: 'حلقات متداخلة Nested Loops',
        explanation: 'استخدم حلقتين متداخلتين (كل واحدة من 0 إلى 1) لطباعة "0 0" و "0 1" و "1 0" و "1 1".',
        requiredVariables: [],
        expectedOutput: '0 0\n0 1\n1 0\n1 1',
        testInput: '',
        hints: ['ضع حلقة جوه حلقة.', 'اطبع i و j داخل الحلقة الداخلية']
      },
      '4-22': {
        ideaTitle: 'for على القوائم وجمع العناصر',
        explanation: 'عرّف متغيراً باسم total_sum يبدأ بـ 0، واجمع عناصر [2, 4, 6] في حلقة for ثم اطبع total_sum.',
        requiredVariables: ['total_sum'],
        expectedOutput: '12',
        testInput: '',
        hints: ['أضف كل عنصر إلى total_sum.', 'اطبع total_sum بعد الحلقة']
      },

      // الوحدة 5: القوائم (Lists)
      '5-23': {
        ideaTitle: 'إنشاء قائمة List',
        explanation: 'عرّف قائمة باسم colors_list تحتوي ["Red", "Blue"] ثم اطبعها.',
        requiredVariables: ['colors_list'],
        expectedOutput: "['Red', 'Blue']",
        testInput: '',
        hints: ['القائمة تُكتب بين قوسين مربعين [].', 'اطبع colors_list']
      },
      '5-24': {
        ideaTitle: 'الوصول لعناصر القائمة بالفهرس',
        explanation: 'عرّف قائمة باسم cars_list تحتوي ["BMW", "Audi", "Lexus"]، وخزّن العنصر الأول في first_car واطبعه.',
        requiredVariables: ['cars_list', 'first_car'],
        expectedOutput: 'BMW',
        testInput: '',
        hints: ['أول عنصر فهرسه 0.', 'اطبع first_car']
      },
      '5-25': {
        ideaTitle: 'إضافة وحذف عناصر من القائمة',
        explanation: 'عرّف قائمة باسم nums_list = [1, 2]، وأضف 3 باستخدام append ثم اطبع nums_list.',
        requiredVariables: ['nums_list'],
        expectedOutput: '[1, 2, 3]',
        testInput: '',
        hints: ['استخدم nums_list.append(3).', 'اطبع nums_list']
      },
      '5-26': {
        ideaTitle: 'طول القائمة len()',
        explanation: 'عرّف قائمة باسم items = [10, 20, 30, 40]، وخزّن طولها في items_len واطبعه.',
        requiredVariables: ['items', 'items_len'],
        expectedOutput: '4',
        testInput: '',
        hints: ['استخدم len(items).', 'اطبع items_len']
      },
      '5-27': {
        ideaTitle: 'التقطيع Slicing',
        explanation: 'عرّف قائمة باسم seq = [0, 1, 2, 3, 4]، وخزّن seq[1:4] في sliced_seq واطبعه.',
        requiredVariables: ['seq', 'sliced_seq'],
        expectedOutput: '[1, 2, 3]',
        testInput: '',
        hints: ['seq[1:4] يأخذ العناصر من الفهرس 1 حتى 3.', 'اطبع sliced_seq']
      },

      // الوحدة 6: القواميس (Dictionaries)
      '6-28': {
        ideaTitle: 'إنشاء Dictionary',
        explanation: 'عرّف قاموساً باسم user_info يحتوي {"name": "Ali", "age": 20}، واطبع user_info["name"].',
        requiredVariables: ['user_info'],
        expectedOutput: 'Ali',
        testInput: '',
        hints: ['القاموس يُكتب بين {}.', 'اطبع user_info["name"]']
      },
      '6-29': {
        ideaTitle: 'keys و values في Dictionary',
        explanation: 'عرّف قاموساً باسم scores_dict يحتوي {"math": 90, "py": 95}، واطبع list(scores_dict.keys()).',
        requiredVariables: ['scores_dict'],
        expectedOutput: "['math', 'py']",
        testInput: '',
        hints: ['استخدم scores_dict.keys().', 'حوّلها إلى list واطبعها']
      },
      '6-30': {
        ideaTitle: 'تعديل وحذف في Dictionary',
        explanation: 'عرّف قاموساً باسم cfg = {"dark": False}، وعدّل cfg["dark"] = True ثم اطبع cfg["dark"].',
        requiredVariables: ['cfg'],
        expectedOutput: 'True',
        testInput: '',
        hints: ['عدّل المفتاح "dark" إلى True.', 'اطبع cfg["dark"]']
      },
      '6-31': {
        ideaTitle: 'الحلقات على Dictionary',
        explanation: 'عرّف قاموساً باسم prices = {"pen": 2}، واطبع المفتاح والقيمة في حلقة for باستخدام items().',
        requiredVariables: ['prices'],
        expectedOutput: 'pen 2',
        testInput: '',
        hints: ['استخدم for k, v in prices.items():', 'اطبع k, v']
      },

      // الوحدة 7: الدوال (Functions)
      '7-32': {
        ideaTitle: 'تعريف دالة def',
        explanation: 'عرّف دالة باسم say_hi() تطبع "Hi there" ثم استدعِها.',
        requiredVariables: ['say_hi'],
        expectedOutput: 'Hi there',
        testInput: '',
        hints: ['استخدم def say_hi():', 'استدعِ الدالة say_hi()']
      },
      '7-33': {
        ideaTitle: 'المعاملات Parameters',
        explanation: 'عرّف دالة باسم greet_user(name) تطبع "Hello " + name، ثم استدعِها بـ "Noor".',
        requiredVariables: ['greet_user'],
        expectedOutput: 'Hello Noor',
        testInput: '',
        hints: ['عرّف المعامل name داخل الأقواس.', 'استدعِ greet_user("Noor")']
      },
      '7-34': {
        ideaTitle: 'إرجاع قيمة بـ return',
        explanation: 'عرّف دالة باسم add_nums(a, b) ترجع a + b، ثم اطبع ناتج add_nums(3, 7).',
        requiredVariables: ['add_nums'],
        expectedOutput: '10',
        testInput: '',
        hints: ['استخدم return a + b داخل الدالة.', 'اطبع add_nums(3, 7)']
      },
      '7-35': {
        ideaTitle: 'القيم الافتراضية Default Arguments',
        explanation: 'عرّف دالة باسم welcome(role="Guest") تطبع role، ثم استدعِها بدون معاملات.',
        requiredVariables: ['welcome'],
        expectedOutput: 'Guest',
        testInput: '',
        hints: ['أعطِ المعامل role قيمة افتراضية "Guest".', 'استدعِ welcome()']
      },

      // الوحدة 8: OOP (Classes)
      '8-36': {
        ideaTitle: 'تعريف Class',
        explanation: 'عرّف كلاساً باسم Car يحتوي على متغير brand = "BMW"، ثم أنشئ كائناً باسم my_car واطبع my_car.brand.',
        requiredVariables: ['Car', 'my_car'],
        expectedOutput: 'BMW',
        testInput: '',
        hints: ['استخدم class Car:', 'أنشئ my_car = Car() واطبع my_car.brand']
      },
      '8-37': {
        ideaTitle: '__init__ و self',
        explanation: 'عرّف كلاساً باسم Student بدالة __init__(self, name) تخزّن self.name، ثم أنشئ st = Student("Layla") واطبع st.name.',
        requiredVariables: ['Student', 'st'],
        expectedOutput: 'Layla',
        testInput: '',
        hints: ['خزّن الاسم في self.name داخل __init__.', 'اطبع st.name']
      },
      '8-38': {
        ideaTitle: 'Methods داخل الكلاس',
        explanation: 'عرّف كلاساً باسم Bot بدالة speak(self) تطبع "Ready"، ثم أنشئ كائناً واستدعِ speak().',
        requiredVariables: ['Bot'],
        expectedOutput: 'Ready',
        testInput: '',
        hints: ['عرّف def speak(self): داخل الكلاس.', 'أنشئ كائناً ونفّذ speak()']
      },

      // الوحدة 9: الملفات والأخطاء
      '9-39': {
        ideaTitle: 'معالجة الأخطاء بـ try و except',
        explanation: 'اكتب كتلة try تحسب 10 / 0 وفي except اطبع "Division Error".',
        requiredVariables: [],
        expectedOutput: 'Division Error',
        testInput: '',
        hints: ['ضع 10 / 0 داخل try.', 'اطبع "Division Error" داخل except']
      },
      '9-40': {
        ideaTitle: 'أنواع الأخطاء ValueError',
        explanation: 'حاول تحويل "abc" إلى int داخل try، وفي except ValueError اطبع "Invalid Number".',
        requiredVariables: [],
        expectedOutput: 'Invalid Number',
        testInput: '',
        hints: ['int("abc") يسبب ValueError.', 'التقط ValueError واطبع "Invalid Number"']
      },
      '9-41': {
        ideaTitle: 'كتلة finally',
        explanation: 'استخدم try تطبع "Start" و finally تطبع "End".',
        requiredVariables: [],
        expectedOutput: 'Start\nEnd',
        testInput: '',
        hints: ['finally تُنفّذ دائماً في نهاية الكتلة.', 'اطبع "Start" ثم "End"']
      },

      // الوحدة 10: مكتبات مهمة
      '10-42': {
        ideaTitle: 'استيراد مكتبة import',
        explanation: 'استورد مكتبة math واطبع int(math.pi).',
        requiredVariables: [],
        expectedOutput: '3',
        testInput: '',
        hints: ['اكتب import math في البداية.', 'اطبع int(math.pi)']
      },
      '10-43': {
        ideaTitle: 'مكتبة random مع seed',
        explanation: 'استورد random، ثبّت random.seed(1)، واطبع random.randint(1, 10).',
        requiredVariables: [],
        expectedOutput: '2',
        testInput: '',
        hints: ['استخدم random.seed(1) لتثبيت النتيجة.', 'اطبع random.randint(1, 10)']
      },
      '10-44': {
        ideaTitle: 'مكتبة math',
        explanation: 'استورد math واطبع math.sqrt(16).',
        requiredVariables: [],
        expectedOutput: '4.0',
        testInput: '',
        hints: ['math.sqrt(16) تحسب الجذر التربيعي لـ 16.', 'اطبع النتيجة']
      },
      '10-45': {
        ideaTitle: 'مكتبة datetime',
        explanation: 'استورد date من datetime وأنشئ تاريخاً باسم d = date(2024, 1, 15) ثم اطبع d.day.',
        requiredVariables: ['d'],
        expectedOutput: '15',
        testInput: '',
        hints: ['استخدم from datetime import date.', 'اطبع d.day']
      },

      // الوحدة 11: مقدمة Streamlit
      '11-46': {
        ideaTitle: 'استيراد Streamlit وعرض نص',
        explanation: 'عرّف متغيراً باسم st_pkg بقيمة "streamlit" واطبع "Ready for Streamlit".',
        requiredVariables: ['st_pkg'],
        expectedOutput: 'Ready for Streamlit',
        testInput: '',
        hints: ['عرّف st_pkg = "streamlit".', 'اطبع "Ready for Streamlit"']
      },
      '11-47': {
        ideaTitle: 'العناوين st.title و st.header',
        explanation: 'عرّف متغيراً باسم page_title بقيمة "مرحباً بيك" واطبعه.',
        requiredVariables: ['page_title'],
        expectedOutput: 'مرحباً بيك',
        testInput: '',
        hints: ['عرّف page_title = "مرحباً بيك".', 'اطبع page_title']
      },
      '11-48': {
        ideaTitle: 'عرض النصوص والقيم st.write',
        explanation: 'عرّف متغيراً باسم msg_val بقيمة "Streamlit Text" واطبعه.',
        requiredVariables: ['msg_val'],
        expectedOutput: 'Streamlit Text',
        testInput: '',
        hints: ['عرّف msg_val = "Streamlit Text".', 'اطبع msg_val']
      },
      '11-49': {
        ideaTitle: 'تشغيل تطبيق Streamlit',
        explanation: 'عرّف متغيراً باسم run_cmd بقيمة "streamlit run app.py" واطبعه.',
        requiredVariables: ['run_cmd'],
        expectedOutput: 'streamlit run app.py',
        testInput: '',
        hints: ['خزّن أمر التشغيل في run_cmd.', 'اطبع run_cmd']
      },
      '11-50': {
        ideaTitle: 'تنظيم صفحة شخصية',
        explanation: 'عرّف متغيراً باسم dev_name بقيمة "Ahmad" ومتغيراً باسم skill_name بقيمة "Python"، ثم اطبع f"{dev_name} - {skill_name}".',
        requiredVariables: ['dev_name', 'skill_name'],
        expectedOutput: 'Ahmad - Python',
        testInput: '',
        hints: ['استخدم f-string لدمج الاسم والمهارة.', 'اطبع النتيجة']
      },

      // الوحدة 12: النصوص والمدخلات
      '12-51': {
        ideaTitle: 'إدخال نص text_input',
        explanation: 'اقرأ اسماً عبر input() في متغير باسم user_input_name ثم اطبع f"أهلاً {user_input_name}".',
        requiredVariables: ['user_input_name'],
        expectedOutput: 'أهلاً Sami',
        testInput: 'Sami\n',
        hints: ['استخدم input() لقراءة الاسم.', 'اطبع f"أهلاً {user_input_name}"']
      },
      '12-52': {
        ideaTitle: 'نص طويل text_area',
        explanation: 'اقرأ ملاحظة عبر input() في متغير باسم note_text ثم اطبع طولها باستخدام len(note_text).',
        requiredVariables: ['note_text'],
        expectedOutput: '5',
        testInput: 'Hello\n',
        hints: ['اقرأ النص بـ input().', 'اطبع len(note_text)']
      },
      '12-53': {
        ideaTitle: 'إدخال رقم number_input',
        explanation: 'اقرأ رقماً عبر input() وحوّله إلى int في متغير باسم user_age، ثم اطبع user_age + 1.',
        requiredVariables: ['user_age'],
        expectedOutput: '15',
        testInput: '14\n',
        hints: ['حوّل المدخل إلى int(input()).', 'اطبع user_age + 1']
      },
      '12-54': {
        ideaTitle: 'إدخال تاريخ date_input',
        explanation: 'عرّف متغيراً باسم birth_year بقيمة 2012 واطبعه.',
        requiredVariables: ['birth_year'],
        expectedOutput: '2012',
        testInput: '',
        hints: ['عرّف birth_year = 2012.', 'اطبع birth_year']
      },
      '12-55': {
        ideaTitle: 'استخدام المدخلات والتحقق منها',
        explanation: 'اقرأ اسماً عبر input() في متغير باسم client_name؛ إذا لم يكن فارغاً اطبع f"Hi {client_name}" وإلا اطبع "Empty".',
        requiredVariables: ['client_name'],
        expectedOutput: 'Hi Lina',
        testInput: 'Lina\n',
        hints: ['تحقق بـ if client_name:.', 'اطبع الرسالة المناسبة']
      },

      // الوحدة 13: الأزرار والتفاعل
      '13-56': {
        ideaTitle: 'تفاعل الأزرار button',
        explanation: 'عرّف متغيراً باسم clicked بقيمة True، وإذا كان True اطبع "Button Clicked".',
        requiredVariables: ['clicked'],
        expectedOutput: 'Button Clicked',
        testInput: '',
        hints: ['عرّف clicked = True.', 'استخدم if clicked: لطباعة الرسالة']
      },
      '13-57': {
        ideaTitle: 'مربع الاختيار checkbox',
        explanation: 'عرّف متغيراً باسم agreed بقيمة True، وإذا كان True اطبع "Accepted".',
        requiredVariables: ['agreed'],
        expectedOutput: 'Accepted',
        testInput: '',
        hints: ['عرّف agreed = True.', 'اطبع "Accepted" داخل if agreed:']
      },
      '13-58': {
        ideaTitle: 'اختيار واحد radio',
        explanation: 'عرّف قائمة باسم colors = ["Red", "Green", "Blue"] واطبع colors[1].',
        requiredVariables: ['colors'],
        expectedOutput: 'Green',
        testInput: '',
        hints: ['الفهرس 1 يمثل العنصر الثاني.', 'اطبع colors[1]']
      },
      '13-59': {
        ideaTitle: 'القائمة المنسدلة selectbox',
        explanation: 'عرّف قائمة باسم cities = ["Cairo", "Dubai", "Riyadh"] واطبع len(cities).',
        requiredVariables: ['cities'],
        expectedOutput: '3',
        testInput: '',
        hints: ['استخدم len(cities) لمعرفة عدد المدن.', 'اطبع النتيجة']
      },
      '13-60': {
        ideaTitle: 'حاسبة تفاعلية بسيطة',
        explanation: 'عرّف a = 8 و b = 2، واطبع ناتج الجمع في سطر ثم ناتج القسمة الصحيحية في سطر.',
        requiredVariables: ['a', 'b'],
        expectedOutput: '10\n4',
        testInput: '',
        hints: ['اطبع a + b ثم a // b.', 'كل ناتج في سطر مستقل']
      },

      // الوحدة 14: الأرقام المتقدمة
      '14-61': {
        ideaTitle: 'شريط التمرير slider',
        explanation: 'عرّف متغيراً باسم slider_val بقيمة 50 واطبعه.',
        requiredVariables: ['slider_val'],
        expectedOutput: '50',
        testInput: '',
        hints: ['عرّف slider_val = 50.', 'اطبع slider_val']
      },
      '14-62': {
        ideaTitle: 'شريط التقدم progress',
        explanation: 'عرّف متغيراً باسم prog_val بقيمة 75 واطبع f"{prog_val}%".',
        requiredVariables: ['prog_val'],
        expectedOutput: '75%',
        testInput: '',
        hints: ['عرّف prog_val = 75.', 'اطبع f"{prog_val}%"']
      },
      '14-63': {
        ideaTitle: 'الأرقام البارزة metric',
        explanation: 'عرّف متغيراً باسم sales_val بقيمة 1500 ومتغيراً باسم delta_val بقيمة "+10%"، ثم اطبع f"{sales_val} ({delta_val})".',
        requiredVariables: ['sales_val', 'delta_val'],
        expectedOutput: '1500 (+10%)',
        testInput: '',
        hints: ['استخدم f-string لعرض القيمة ونسبة التغيير.', 'اطبع النتيجة']
      },
      '14-64': {
        ideaTitle: 'العمليات الحسابية مع المدخلات',
        explanation: 'اقرأ رقمين عبر input() وحوّلهما إلى int، ثم اطبع حاصل ضربهما.',
        requiredVariables: [],
        expectedOutput: '24',
        testInput: '6\n4\n',
        hints: ['حوّل كل مدخل إلى int().', 'اطبع ناتج الضرب']
      },
      '14-65': {
        ideaTitle: 'تطبيق حسابي متكامل',
        explanation: 'عرّف متغيراً باسم nums = [10, 20, 30]، واطبع مجموع العناصر sum(nums).',
        requiredVariables: ['nums'],
        expectedOutput: '60',
        testInput: '',
        hints: ['استخدم دالة sum(nums).', 'اطبع المجموع']
      },

      // الوحدة 15: الملفات والصور
      '15-66': {
        ideaTitle: 'رفع الملفات file_uploader',
        explanation: 'عرّف قائمة باسم allowed_types = ["png", "jpg"] واطبع allowed_types[0].',
        requiredVariables: ['allowed_types'],
        expectedOutput: 'png',
        testInput: '',
        hints: ['أول عنصر في القائمة فهرسه 0.', 'اطبع allowed_types[0]']
      },
      '15-67': {
        ideaTitle: 'عرض الصور image',
        explanation: 'عرّف متغيراً باسم img_width بقيمة 300 واطبع img_width.',
        requiredVariables: ['img_width'],
        expectedOutput: '300',
        testInput: '',
        hints: ['عرّف img_width = 300.', 'اطبع img_width']
      },
      '15-68': {
        ideaTitle: 'الصوت والفيديو audio و video',
        explanation: 'عرّف متغيراً باسم media_type بقيمة "mp4" واطبع media_type.',
        requiredVariables: ['media_type'],
        expectedOutput: 'mp4',
        testInput: '',
        hints: ['عرّف media_type = "mp4".', 'اطبع media_type']
      },
      '15-69': {
        ideaTitle: 'قراءة محتوى ملف نصي',
        explanation: 'عرّف متغيراً باسم raw_bytes بقيمة b"Hello File"، ثم فك ترميزه إلى نص في متغير decoded_text واطبعه.',
        requiredVariables: ['raw_bytes', 'decoded_text'],
        expectedOutput: 'Hello File',
        testInput: '',
        hints: ['استخدم raw_bytes.decode("utf-8").', 'اطبع decoded_text']
      },

      // الوحدة 16: الرسوم البيانية
      '16-70': {
        ideaTitle: 'الرسم الخطي line_chart',
        explanation: 'عرّف قائمة باسم sales_series = [10, 20, 15] واطبع max(sales_series).',
        requiredVariables: ['sales_series'],
        expectedOutput: '20',
        testInput: '',
        hints: ['استخدم max() لإيجاد أعلى قيمة.', 'اطبع النتيجة']
      },
      '16-71': {
        ideaTitle: 'الرسم بالأعمدة bar_chart',
        explanation: 'عرّف قاموساً باسم fruit_counts = {"apple": 10, "banana": 20} واطبع fruit_counts["banana"].',
        requiredVariables: ['fruit_counts'],
        expectedOutput: '20',
        testInput: '',
        hints: ['اطبع قيمة المفتاح "banana".', 'استخدم fruit_counts["banana"]']
      },
      '16-72': {
        ideaTitle: 'الرسم المساحي area_chart',
        explanation: 'عرّف قائمة باسم growth = [5, 10, 15] واطبع sum(growth).',
        requiredVariables: ['growth'],
        expectedOutput: '30',
        testInput: '',
        hints: ['اجمع عناصر القائمة بـ sum(growth).', 'اطبع النتيجة']
      },
      '16-73': {
        ideaTitle: 'الخرائط map والإحداثيات',
        explanation: 'عرّف متغيراً باسم lat بقيمة 31.5 ومتغيراً باسم lon بقيمة 34.47، ثم اطبع f"{lat}, {lon}".',
        requiredVariables: ['lat', 'lon'],
        expectedOutput: '31.5, 34.47',
        testInput: '',
        hints: ['عرّف lat و lon ثم اطبعهما بتنسيق f-string.', 'اطبع النتيجة']
      },
      '16-74': {
        ideaTitle: 'تحليل بيانات المبيعات',
        explanation: 'عرّف قائمة باسم monthly_sales = [100, 150, 200]، واطبع المجموع ثم المتوسط في سطرين.',
        requiredVariables: ['monthly_sales'],
        expectedOutput: '450\n150.0',
        testInput: '',
        hints: ['المجموع هو sum(monthly_sales).', 'المتوسط هو sum(monthly_sales) / len(monthly_sales)']
      },

      // الوحدة 17: التخطيط والتنظيم
      '17-75': {
        ideaTitle: 'تقسيم الصفحة columns',
        explanation: 'عرّف متغيراً باسم cols_count بقيمة 3 واطبع cols_count.',
        requiredVariables: ['cols_count'],
        expectedOutput: '3',
        testInput: '',
        hints: ['عرّف cols_count = 3.', 'اطبع cols_count']
      },
      '17-76': {
        ideaTitle: 'التبويبات tabs',
        explanation: 'عرّف قائمة باسم tab_names = ["البيانات", "الرسم", "الإعدادات"] واطبع tab_names[0].',
        requiredVariables: ['tab_names'],
        expectedOutput: 'البيانات',
        testInput: '',
        hints: ['اطبع أول تبويب tab_names[0].', 'تأكد من تطابق النص']
      },
      '17-77': {
        ideaTitle: 'الأقسام القابلة للطي expander',
        explanation: 'عرّف متغيراً باسم is_expanded بقيمة False واطبعه.',
        requiredVariables: ['is_expanded'],
        expectedOutput: 'False',
        testInput: '',
        hints: ['عرّف is_expanded = False.', 'اطبع is_expanded']
      },
      '17-78': {
        ideaTitle: 'الحاويات container',
        explanation: 'عرّف قائمة باسم box_items = ["item1", "item2"] واطبع len(box_items).',
        requiredVariables: ['box_items'],
        expectedOutput: '2',
        testInput: '',
        hints: ['احسب طول القائمة بـ len(box_items).', 'اطبع النتيجة']
      },

      // الوحدة 18: الجداول وعرض البيانات
      '18-79': {
        ideaTitle: 'الجداول التفاعلية dataframe',
        explanation: 'عرّف قاموساً باسم table_data = {"name": ["Ali", "Sara"], "age": [25, 30]} واطبع len(table_data["name"]).',
        requiredVariables: ['table_data'],
        expectedOutput: '2',
        testInput: '',
        hints: ['استخدم len(table_data["name"]).', 'اطبع النتيجة']
      },
      '18-80': {
        ideaTitle: 'الجداول الثابتة table',
        explanation: 'عرّف قائمة باسم rows_list = ["Row1", "Row2", "Row3"] واطبع rows_list[-1].',
        requiredVariables: ['rows_list'],
        expectedOutput: 'Row3',
        testInput: '',
        hints: ['الفهرس -1 يرجع آخر عنصر.', 'اطبع rows_list[-1]']
      },
      '18-81': {
        ideaTitle: 'عرض بيانات JSON',
        explanation: 'عرّف قاموساً باسم profile = {"name": "Ali", "age": 25} واطبع profile["name"].',
        requiredVariables: ['profile'],
        expectedOutput: 'Ali',
        testInput: '',
        hints: ['اطبع قيمة المفتاح "name".', 'استخدم profile["name"]']
      },
      '18-82': {
        ideaTitle: 'المقاييس metric و delta',
        explanation: 'عرّف متغيراً باسم visitors بقيمة 250 ومتغيراً باسم change بقيمة "-5%"، ثم اطبع f"{visitors} {change}".',
        requiredVariables: ['visitors', 'change'],
        expectedOutput: '250 -5%',
        testInput: '',
        hints: ['عرّف visitors و change.', 'اطبع f"{visitors} {change}"']
      },
      '18-83': {
        ideaTitle: 'لوحة تحكم بالإحصائيات',
        explanation: 'عرّف قائمة باسم revenues = [500, 800, 300] واطبع مجموعها.',
        requiredVariables: ['revenues'],
        expectedOutput: '1600',
        testInput: '',
        hints: ['استخدم sum(revenues).', 'اطبع المجموع']
      },

      // الوحدة 19: النماذج (Forms)
      '19-84': {
        ideaTitle: 'تجميع المدخلات في form',
        explanation: 'عرّف متغيراً باسم form_title بقيمة "بياناتي" واطبعه.',
        requiredVariables: ['form_title'],
        expectedOutput: 'بياناتي',
        testInput: '',
        hints: ['عرّف form_title = "بياناتي".', 'اطبع form_title']
      },
      '19-85': {
        ideaTitle: 'زر إرسال النموذج form_submit_button',
        explanation: 'عرّف متغيراً باسم submitted بقيمة True، وإذا كان True اطبع "Form Submitted".',
        requiredVariables: ['submitted'],
        expectedOutput: 'Form Submitted',
        testInput: '',
        hints: ['عرّف submitted = True.', 'اطبع "Form Submitted" داخل if submitted:']
      },
      '19-86': {
        ideaTitle: 'التحقق من المدخلات',
        explanation: 'اقرأ اسماً عبر input() في متغير باسم full_name؛ إذا كان فارغاً اطبع "الاسم مطلوب!" وإلا اطبع f"أهلاً {full_name}".',
        requiredVariables: ['full_name'],
        expectedOutput: 'الاسم مطلوب!',
        testInput: '\n',
        hints: ['تحقق بـ if not full_name:.', 'اطبع "الاسم مطلوب!" عندما يكون الإدخال فارغاً']
      },
      '19-87': {
        ideaTitle: 'رسائل التنبيه success و error و warning',
        explanation: 'عرّف متغيراً باسم score بقيمة 75، وإذا كان >= 60 اطبع "Success" وإلا اطبع "Error".',
        requiredVariables: ['score'],
        expectedOutput: 'Success',
        testInput: '',
        hints: ['قارن score مع 60.', 'اطبع "Success" لأن 75 >= 60']
      },

      // الوحدة 20: لوحة تحكم كاملة
      '20-88': {
        ideaTitle: 'تخطيط أقسام التطبيق',
        explanation: 'عرّف قائمة باسم sections = ["Title", "Metrics", "Charts"] واطبع len(sections).',
        requiredVariables: ['sections'],
        expectedOutput: '3',
        testInput: '',
        hints: ['احسب طول القائمة بـ len(sections).', 'اطبع النتيجة']
      },
      '20-89': {
        ideaTitle: 'فلترة البيانات وربط المدخلات',
        explanation: 'عرّف قائمة باسم values = [50, 150, 300, 80] واطبع كل عنصر >= 100 في سطر.',
        requiredVariables: ['values'],
        expectedOutput: '150\n300',
        testInput: '',
        hints: ['استخدم حلقة for وشرط v >= 100.', 'اطبع العناصر المطابقة']
      },
      '20-90': {
        ideaTitle: 'حفظ الحالة session_state',
        explanation: 'عرّف قاموساً باسم session_state = {"counter": 0}، زد العداد بـ 2 ثم اطبع session_state["counter"].',
        requiredVariables: ['session_state'],
        expectedOutput: '2',
        testInput: '',
        hints: ['زد القيمة: session_state["counter"] += 2.', 'اطبع القيمة الجديدة']
      },
      '20-91': {
        ideaTitle: 'إعدادات الصفحة وتخصيصها',
        explanation: 'عرّف قاموساً باسم page_cfg = {"title": "تطبيقي", "wide": True} واطبع page_cfg["title"].',
        requiredVariables: ['page_cfg'],
        expectedOutput: 'تطبيقي',
        testInput: '',
        hints: ['اطبع قيمة المفتاح "title".', 'استخدم page_cfg["title"]']
      },
      '20-92': {
        ideaTitle: 'نشر ومشاركة تطبيق Streamlit',
        explanation: 'عرّف متغيراً باسم platform بقيمة "Streamlit Cloud" واطبع f"Deployed on {platform}".',
        requiredVariables: ['platform'],
        expectedOutput: 'Deployed on Streamlit Cloud',
        testInput: '',
        hints: ['عرّف platform = "Streamlit Cloud".', 'اطبع f"Deployed on {platform}"']
      },

      // الوحدة 21: تطوير الويب
      '21-1': {
        ideaTitle: 'طلب ومتصفح وسيرفر (Request & Response)',
        explanation: 'عرّف متغيراً باسم client_name بقيمة "Browser" ومتغيراً باسم server_reply بقيمة "200 OK"، ثم اطبع f"{client_name} -> {server_reply}".',
        requiredVariables: ['client_name', 'server_reply'],
        expectedOutput: 'Browser -> 200 OK',
        testInput: '',
        hints: ['عرّف client_name و server_reply.', 'اطبع النتيجة المنسقة']
      },
      '21-2': {
        ideaTitle: 'أول تطبيق ويب بـ Flask',
        explanation: 'عرّف دالة باسم home() ترجع "أهلاً بيك في موقعي!"، ثم اطبع ناتج استدعاء home().',
        requiredVariables: ['home'],
        expectedOutput: 'أهلاً بيك في موقعي!',
        testInput: '',
        hints: ['استخدم def home(): مع return.', 'اطبع home()']
      },
      '21-3': {
        ideaTitle: 'صفحات متعددة (Routes)',
        explanation: 'عرّف قاموساً باسم routes = {"/": "Home", "/about": "About", "/contact": "Contact"} واطبع routes["/about"].',
        requiredVariables: ['routes'],
        expectedOutput: 'About',
        testInput: '',
        hints: ['اطبع قيمة المسار "/about".', 'استخدم routes["/about"]']
      },

      // الوحدة 22: قوالب الويب
      '22-1': {
        ideaTitle: 'إيه هي الـ Templates؟',
        explanation: 'عرّف متغيراً باسم template_file بقيمة "index.html" واطبعه.',
        requiredVariables: ['template_file'],
        expectedOutput: 'index.html',
        testInput: '',
        hints: ['عرّف template_file = "index.html".', 'اطبع template_file']
      },
      '22-2': {
        ideaTitle: 'تمرير المتغيرات (Jinja2)',
        explanation: 'عرّف متغيراً باسم username بقيمة "Ali" ومتغيراً باسم age بقيمة 25، ثم اطبع f"أهلاً {username} - {age}".',
        requiredVariables: ['username', 'age'],
        expectedOutput: 'أهلاً Ali - 25',
        testInput: '',
        hints: ['عرّف username و age.', 'اطبع f"أهلاً {username} - {age}"']
      },
      '22-3': {
        ideaTitle: 'استقبال بيانات من المستخدم (Forms)',
        explanation: 'عرّف قاموساً باسم form_data = {"username": "Ahmad", "role": "Dev"} واطبع form_data.get("username").',
        requiredVariables: ['form_data'],
        expectedOutput: 'Ahmad',
        testInput: '',
        hints: ['استخدم form_data.get("username").', 'اطبع النتيجة']
      },

      // الوحدة 23: قواعد البيانات
      '23-1': {
        ideaTitle: 'مقدمة في قواعد البيانات (SQL)',
        explanation: 'عرّف متغيراً باسم sql_query بقيمة "SELECT * FROM users" واطبعه.',
        requiredVariables: ['sql_query'],
        expectedOutput: 'SELECT * FROM users',
        testInput: '',
        hints: ['عرّف sql_query = "SELECT * FROM users".', 'اطبع sql_query']
      },
      '23-2': {
        ideaTitle: 'التعامل مع البيانات (SQLAlchemy)',
        explanation: 'عرّف كلاساً باسم User بدالة __init__(self, name) تخزّن self.name، ثم أنشئ u = User("Mona") واطبع u.name.',
        requiredVariables: ['User', 'u'],
        expectedOutput: 'Mona',
        testInput: '',
        hints: ['عرّف class User: مع __init__.', 'اطبع u.name']
      },
      '23-3': {
        ideaTitle: 'الأمان ومنع الاختراق (SQL Injection)',
        explanation: 'عرّف متغيراً باسم safe_query بقيمة "SELECT * FROM users WHERE name = ?" واطبعه.',
        requiredVariables: ['safe_query'],
        expectedOutput: 'SELECT * FROM users WHERE name = ?',
        testInput: '',
        hints: ['خزّن الاستعلام الآمن في safe_query.', 'اطبع safe_query']
      },

      // الوحدة 24: APIs
      '24-1': {
        ideaTitle: 'إيه هو الـ API؟',
        explanation: 'عرّف متغيراً باسم endpoint بقيمة "/api/user" واطبعه.',
        requiredVariables: ['endpoint'],
        expectedOutput: '/api/user',
        testInput: '',
        hints: ['عرّف endpoint = "/api/user".', 'اطبع endpoint']
      },
      '24-2': {
        ideaTitle: 'صيغة البيانات JSON',
        explanation: 'استورد json، عرّف قاموساً باسم payload = {"name": "Ahmed", "age": 20}، واطبع json.dumps(payload).',
        requiredVariables: ['payload'],
        expectedOutput: '{"name": "Ahmed", "age": 20}',
        testInput: '',
        hints: ['استخدم import json و json.dumps(payload).', 'اطبع النتيجة']
      },
      '24-3': {
        ideaTitle: 'بناء API بـ Flask',
        explanation: 'عرّف دالة باسم get_user() ترجع {"name": "Sara", "role": "admin"}، ثم اطبع get_user()["role"].',
        requiredVariables: ['get_user'],
        expectedOutput: 'admin',
        testInput: '',
        hints: ['عرّف دالة ترجع القاموس.', 'اطبع قيمة "role"']
      },

      // الوحدة 25: النشر
      '25-1': {
        ideaTitle: 'إيه هو الـ Hosting؟',
        explanation: 'عرّف متغيراً باسم host_url بقيمة "127.0.0.1" واطبعه.',
        requiredVariables: ['host_url'],
        expectedOutput: '127.0.0.1',
        testInput: '',
        hints: ['عرّف host_url = "127.0.0.1".', 'اطبع host_url']
      },
      '25-2': {
        ideaTitle: 'متغيرات البيئة (Environment Variables)',
        explanation: 'استورد os، عرّف متغيراً باسم env_vars = {"SECRET_KEY": "my_secret"}، واطبع env_vars.get("SECRET_KEY").',
        requiredVariables: ['env_vars'],
        expectedOutput: 'my_secret',
        testInput: '',
        hints: ['استورد os وعرّف env_vars.', 'اطبع قيمة SECRET_KEY']
      },
      '25-3': {
        ideaTitle: 'ختام قسم الويب',
        explanation: 'عرّف قائمة باسم web_stack = ["Flask", "HTML", "SQL", "JSON"] واطبع len(web_stack).',
        requiredVariables: ['web_stack'],
        expectedOutput: '4',
        testInput: '',
        hints: ['احسب طول القائمة بـ len(web_stack).', 'اطبع النتيجة']
      },

      // الوحدة 26: Pandas
      '26-1': {
        ideaTitle: 'Series و DataFrame في Pandas',
        explanation: 'عرّف قاموساً باسم table = {"col1": [1, 2], "col2": [3, 4]} واطبع len(table).',
        requiredVariables: ['table'],
        expectedOutput: '2',
        testInput: '',
        hints: ['عرّف قاموس table بعمودين.', 'اطبع len(table)']
      },
      '26-2': {
        ideaTitle: 'قراءة ملفات البيانات CSV',
        explanation: 'عرّف متغيراً باسم csv_file بقيمة "sales.csv" واطبعه.',
        requiredVariables: ['csv_file'],
        expectedOutput: 'sales.csv',
        testInput: '',
        hints: ['عرّف csv_file = "sales.csv".', 'اطبع csv_file']
      },
      '26-3': {
        ideaTitle: 'استكشاف البيانات (Head & Tail)',
        explanation: 'عرّف قائمة باسم rows = [10, 20, 30, 40, 50, 60] واطبع أول 3 عناصر rows[:3].',
        requiredVariables: ['rows'],
        expectedOutput: '[10, 20, 30]',
        testInput: '',
        hints: ['استخدم التقطيع rows[:3].', 'اطبع النتيجة']
      },

      // الوحدة 27: التعديل والتصفية
      '27-1': {
        ideaTitle: 'اختيار الأعمدة (Selecting Columns)',
        explanation: 'عرّف قاموساً باسم df = {"Name": ["Ali", "Sara"], "Age": [20, 25]} واطبع df["Age"].',
        requiredVariables: ['df'],
        expectedOutput: '[20, 25]',
        testInput: '',
        hints: ['اطبع عمود "Age" من القاموس df.', 'استخدم df["Age"]']
      },
      '27-2': {
        ideaTitle: 'تصفية البيانات (Filtering Rows)',
        explanation: 'عرّف قائمة باسم scores = [40, 75, 90, 30] واطبع العناصر الأكبر من 50 في سطرين.',
        requiredVariables: ['scores'],
        expectedOutput: '75\n90',
        testInput: '',
        hints: ['استخدم حلقة for وشرط s > 50.', 'اطبع كل درجة مطابقة في سطر']
      },
      '27-3': {
        ideaTitle: 'الإحصائيات الأساسية (Basic Statistics)',
        explanation: 'عرّف قائمة باسم grades = [80, 90, 100]، واطبع المتوسط الحسابي ثم أكبر قيمة في سطرين.',
        requiredVariables: ['grades'],
        expectedOutput: '90.0\n100',
        testInput: '',
        hints: ['المتوسط هو sum(grades) / len(grades).', 'أكبر قيمة هي max(grades)']
      },

      // الوحدة 28: Matplotlib
      '28-1': {
        ideaTitle: 'مقدمة في Matplotlib',
        explanation: 'عرّف قائمتين x = [1, 2, 3] و y = [10, 20, 15] واطبع len(x) و sum(y) في سطرين.',
        requiredVariables: ['x', 'y'],
        expectedOutput: '3\n45',
        testInput: '',
        hints: ['عرّف x و y.', 'اطبع len(x) ثم sum(y)']
      },
      '28-2': {
        ideaTitle: 'الرسوم البيانية بالأعمدة (Bar Charts)',
        explanation: 'عرّف قائمة باسم products = ["A", "B", "C"] وقائمة باسم sales = [50, 80, 30]، واطبع max(sales).',
        requiredVariables: ['products', 'sales'],
        expectedOutput: '80',
        testInput: '',
        hints: ['استخدم max(sales) لمعرفة أعلى مبيعات.', 'اطبع النتيجة']
      },
      '28-3': {
        ideaTitle: 'تسمية الرسم (Titles & Labels)',
        explanation: 'عرّف متغيراً باسم chart_title بقيمة "المبيعات اليومية" واطبعه.',
        requiredVariables: ['chart_title'],
        expectedOutput: 'المبيعات اليومية',
        testInput: '',
        hints: ['عرّف chart_title = "المبيعات اليومية".', 'اطبع chart_title']
      },

      // الوحدة 29: NumPy
      '29-1': {
        ideaTitle: 'إيه هي مكتبة NumPy؟',
        explanation: 'عرّف قائمة باسم arr = [1, 2, 3, 4] واطبع مجموعها.',
        requiredVariables: ['arr'],
        expectedOutput: '10',
        testInput: '',
        hints: ['عرّف arr = [1, 2, 3, 4].', 'اطبع sum(arr)']
      },
      '29-2': {
        ideaTitle: 'العمليات الرياضية على المصفوفات',
        explanation: 'عرّف قائمة باسم nums = [2, 4, 6] واطبع ناتج ضرب كل عنصر في 2 مفصولاً بمسافة (مثال: 4 8 12).',
        requiredVariables: ['nums'],
        expectedOutput: '4 8 12',
        testInput: '',
        hints: ['اضرب كل عنصر في 2 داخل حلقة.', 'استخدم end=" " عند الطباعة']
      },
      '29-3': {
        ideaTitle: 'دوال جاهزة في NumPy',
        explanation: 'عرّف قائمة باسم seq = list(range(1, 5)) واطبع seq.',
        requiredVariables: ['seq'],
        expectedOutput: '[1, 2, 3, 4]',
        testInput: '',
        hints: ['استخدم list(range(1, 5)).', 'اطبع seq']
      },

      // الوحدة 30: AI
      '30-1': {
        ideaTitle: 'إيه هو الذكاء الاصطناعي؟',
        explanation: 'عرّف متغيراً باسم ai_lang بقيمة "Python" واطبع f"AI Language: {ai_lang}".',
        requiredVariables: ['ai_lang'],
        expectedOutput: 'AI Language: Python',
        testInput: '',
        hints: ['عرّف ai_lang = "Python".', 'اطبع f"AI Language: {ai_lang}"']
      },
      '30-2': {
        ideaTitle: 'تعلم الآلة (Machine Learning)',
        explanation: 'عرّف قائمة باسم labels = ["cat", "dog", "cat"] واطبع labels.count("cat").',
        requiredVariables: ['labels'],
        expectedOutput: '2',
        testInput: '',
        hints: ['استخدم labels.count("cat").', 'اطبع النتيجة']
      },
      '30-3': {
        ideaTitle: 'ختام المنهج: أنت مبرمج بايثون!',
        explanation: 'عرّف متغيراً باسم grad_msg بقيمة "Python Developer" واطبع grad_msg.',
        requiredVariables: ['grad_msg'],
        expectedOutput: 'Python Developer',
        testInput: '',
        hints: ['عرّف grad_msg = "Python Developer".', 'اطبع grad_msg']
      }
    };

    const task = fixedTasks[byNum] || fixedTasks[byRaw] || {
      ideaTitle: `واجب درس ${rawTitle}`,
      explanation: `عرّف متغيراً باسم lesson_done بقيمة "OK" ثم اطبعه.`,
      requiredVariables: ['lesson_done'],
      expectedOutput: 'OK',
      testInput: '',
      hints: ['عرّف lesson_done = "OK".', 'اطبع lesson_done']
    };

    return {
      type: 'write_code',
      question: `واجب درس ${rawTitle}`,
      ideaTitle: `${task.ideaTitle} — (${rawTitle})`,
      explanation: task.explanation,
      requiredVariables: task.requiredVariables,
      starterCode: '',
      expectedOutput: task.expectedOutput,
      testInput: task.testInput,
      hints: task.hints
    };
  },

  buildUnitProjectTask(unit) {
    const unitId = Number(String(unit.id).replace(/\D+/g, ''));
    const fixedProjects = {
      1: {
        ideaTitle: 'مشروع الوحدة 1: قائمة طلبات المطعم',
        explanation: 'عرّف قائمة باسم menu تحتوي ["Burger", "Pizza", "Pasta"]، واطبع كل عنصر في سطر، ثم اقرأ رقم الاختيار عبر input() واطبع "You ordered: Burger" للاختيار 1.',
        requiredVariables: ['menu'],
        requirements: ['عرّف قائمة menu', 'اعرض العناصر في حلقة', 'اقرأ الاختيار واطبع "You ordered: <الأكلة>"'],
        expectedOutput: 'Burger\nPizza\nPasta\nYou ordered: Burger',
        testInput: '1\n'
      },
      2: {
        ideaTitle: 'مشروع الوحدة 2: حاسبة مجموع رقمين',
        explanation: 'اقرأ رقمين عبر input() وحوّلهما إلى int واجمعهما ثم اطبع "Result: " متبوعاً بالمجموع.',
        requiredVariables: [],
        requirements: ['استقبل رقمين بـ input()', 'حوّلهم إلى int()', 'اطبع "Result: <المجموع>"'],
        expectedOutput: 'Result: 8',
        testInput: '5\n3\n'
      },
      3: {
        ideaTitle: 'مشروع الوحدة 3: لعبة تخمين الرقم السري',
        explanation: 'عرّف secret = 7، اقرأ تخمين المستخدم كـ int، واطبع "Too high" أو "Too low" أو "Correct".',
        requiredVariables: ['secret'],
        requirements: ['عرّف secret = 7', 'قارن التخمين بـ if/elif/else', 'اطبع النتيجة المناسبة'],
        expectedOutput: 'Correct',
        testInput: '7\n'
      },
      4: {
        ideaTitle: 'مشروع الوحدة 4: جدول ضرب الرقم 5',
        explanation: 'استخدم حلقة for مع range(1, 6) لطباعة جدول ضرب 5 بالشكل: "5 x 1 = 5" حتى "5 x 5 = 25".',
        requiredVariables: [],
        requirements: ['استخدم for و range(1, 6)', 'اطبع بالشكل "5 x N = R"'],
        expectedOutput: '5 x 1 = 5\n5 x 2 = 10\n5 x 3 = 15\n5 x 4 = 20\n5 x 5 = 25',
        testInput: ''
      },
      5: {
        ideaTitle: 'مشروع الوحدة 5: قائمة المهام To-Do',
        explanation: 'عرّف قائمة باسم tasks = ["Study", "Code", "Sleep"]، أضف مهمة جديدة من input() عبر append، ثم اطبع كل المهام في أسطر.',
        requiredVariables: ['tasks'],
        requirements: ['عرّف قائمة tasks', 'أضف المدخل بـ append()', 'اطبع كل المهام في حلقة'],
        expectedOutput: 'Study\nCode\nSleep\nRead',
        testInput: 'Read\n'
      },
      6: {
        ideaTitle: 'مشروع الوحدة 6: دفتر جهات الاتصال',
        explanation: 'عرّف قاموساً باسم contacts = {"Ali": "123", "Sara": "456"}، اقرأ اسماً من input() واطبع "Ali: 123".',
        requiredVariables: ['contacts'],
        requirements: ['عرّف قاموس contacts', 'اقرأ الاسم بـ input()', 'اطبع "<الاسم>: <الرقم>"'],
        expectedOutput: 'Ali: 123',
        testInput: 'Ali\n'
      },
      7: {
        ideaTitle: 'مشروع الوحدة 7: النظام البنكي بالدوال',
        explanation: 'عرّف دالتين deposit(balance, amount) و withdraw(balance, amount)، ابدأ بـ balance = 1000، أودع 500 واسحب 300، ثم اطبع الرصيد النهائي.',
        requiredVariables: ['deposit', 'withdraw', 'balance'],
        requirements: ['عرّف deposit و withdraw مع return', 'ابدأ برصيد 1000 وطبّق العمليات', 'اطبع 1200'],
        expectedOutput: '1200',
        testInput: ''
      },
      8: {
        ideaTitle: 'مشروع الوحدة 8: كلاس Animal',
        explanation: 'عرّف كلاساً باسم Animal يحتوي على __init__(self, name) ودالة sound(self) تطبع "Woof"، ثم أنشئ كائناً واستدعِ sound().',
        requiredVariables: ['Animal'],
        requirements: ['عرّف class Animal', 'أضف __init__ و sound()', 'اطبع "Woof"'],
        expectedOutput: 'Woof',
        testInput: ''
      },
      9: {
        ideaTitle: 'مشروع الوحدة 9: الحاسبة الآمنة try/except',
        explanation: 'اقرأ رقمين وحوّلهما إلى int داخل try واطبع مجموعهما، وفي except اطبع "Invalid input".',
        requiredVariables: [],
        requirements: ['استخدم try/except', 'اطبع المجموع عند النجاح', 'اطبع "Invalid input" عند الخطأ'],
        expectedOutput: 'Invalid input',
        testInput: 'abc\n3\n'
      },
      10: {
        ideaTitle: 'مشروع الوحدة 10: لعبة التخمين بـ random',
        explanation: 'استورد random، ثبّت random.seed(1)، واطبع random.randint(1, 10).',
        requiredVariables: [],
        requirements: ['استورد random', 'استخدم random.randint(1, 10)', 'اطبع النتيجة'],
        expectedOutput: '2',
        testInput: ''
      },
      11: {
        ideaTitle: 'مشروع الوحدة 11: صفحة تعريفية تفاعلية',
        explanation: 'اقرأ اسماً ومهارة عبر input() في متغيرين باسم app_user و app_skill، ثم اطبع f"{app_user} - {app_skill}".',
        requiredVariables: ['app_user', 'app_skill'],
        requirements: ['اقرأ الاسم والمهارة عبر input()', 'خزّنهما في app_user و app_skill', 'اطبع النتيجة المنسقة'],
        expectedOutput: 'Ahmad - Streamlit',
        testInput: 'Ahmad\nStreamlit\n'
      },
      12: {
        ideaTitle: 'مشروع الوحدة 12: نموذج إدخال بيانات المستخدم',
        explanation: 'اقرأ الاسم عبر input() في متغير باسم username والعمر عبر input() كـ int في متغير باسم age، ثم اطبع f"{username}:{age}".',
        requiredVariables: ['username', 'age'],
        requirements: ['اقرأ username كنص', 'اقرأ age كـ int', 'اطبع f"{username}:{age}"'],
        expectedOutput: 'Omar:14',
        testInput: 'Omar\n14\n'
      },
      13: {
        ideaTitle: 'مشروع الوحدة 13: لوحة اختيارات وتفاعل',
        explanation: 'عرّف قائمة باسم options = ["Option A", "Option B"] واقرأ رقماً (1 أو 2) عبر input()، ثم اطبع الخيار الموافق.',
        requiredVariables: ['options'],
        requirements: ['عرّف قائمة options', 'اقرأ رقم الاختيار عبر input()', 'اطبع العنصر المختار'],
        expectedOutput: 'Option B',
        testInput: '2\n'
      },
      14: {
        ideaTitle: 'مشروع الوحدة 14: حاسبة المؤشرات والإحصائيات',
        explanation: 'عرّف قائمة باسم scores = [80, 90, 100]، واطبع المجموع ثم أعلى قيمة في سطرين.',
        requiredVariables: ['scores'],
        requirements: ['عرّف قائمة scores', 'اطبع مجموعها', 'اطبع أعلى قيمة فيها'],
        expectedOutput: '270\n100',
        testInput: ''
      },
      15: {
        ideaTitle: 'مشروع الوحدة 15: معالج ملفات ووسائط',
        explanation: 'عرّف متغيراً باسم file_name بقيمة "report.txt" ومتغيراً باسم file_size بقيمة 12، ثم اطبع f"{file_name} ({file_size}KB)".',
        requiredVariables: ['file_name', 'file_size'],
        requirements: ['عرّف file_name و file_size', 'اطبع الاسم والحجم بتنسيق واضح'],
        expectedOutput: 'report.txt (12KB)',
        testInput: ''
      },
      16: {
        ideaTitle: 'مشروع الوحدة 16: لوحة رسوم بيانات المبيعات',
        explanation: 'عرّف قاموساً باسم chart_data = {"Jan": 100, "Feb": 200, "Mar": 150} واطبع مجموع القيم.',
        requiredVariables: ['chart_data'],
        requirements: ['عرّف قاموس chart_data', 'اجمع قيمه باستخدام sum(chart_data.values())', 'اطبع النتيجة'],
        expectedOutput: '450',
        testInput: ''
      },
      17: {
        ideaTitle: 'مشروع الوحدة 17: منظم أقسام وتبويبات',
        explanation: 'عرّف قائمة باسم layout_parts = ["col1", "col2", "tab1"] واطبع كل عنصر في سطر.',
        requiredVariables: ['layout_parts'],
        requirements: ['عرّف قائمة layout_parts', 'اطبع العناصر في حلقة for'],
        expectedOutput: 'col1\ncol2\ntab1',
        testInput: ''
      },
      18: {
        ideaTitle: 'مشروع الوحدة 18: لوحة جدول ومقاييس',
        explanation: 'عرّف قاموساً باسم kpi = {"orders": 340, "revenue": 1500} واطبع f"Orders: {kpi[\'orders\']}, Revenue: {kpi[\'revenue\']}".',
        requiredVariables: ['kpi'],
        requirements: ['عرّف قاموس kpi', 'اطبع قيمتي orders و revenue'],
        expectedOutput: 'Orders: 340, Revenue: 1500',
        testInput: ''
      },
      19: {
        ideaTitle: 'مشروع الوحدة 19: نموذج تسجيل مع تحقق',
        explanation: 'اقرأ اسماً عبر input() في متغير باسم member_name؛ إذا كان فارغاً اطبع "Invalid" وإلا اطبع f"Registered: {member_name}".',
        requiredVariables: ['member_name'],
        requirements: ['اقرأ member_name عبر input()', 'تحقق من وجود نص', 'اطبع النتيجة المناسبة'],
        expectedOutput: 'Registered: Tariq',
        testInput: 'Tariq\n'
      },
      20: {
        ideaTitle: 'مشروع الوحدة 20: لوحة تحكم Streamlit متكاملة',
        explanation: 'عرّف قائمة باسم dash_nums = [10, 20, 30, 40] واطبع المجموع في السطر الأول والمتوسط في السطر الثاني.',
        requiredVariables: ['dash_nums'],
        requirements: ['عرّف قائمة dash_nums', 'اطبع المجموع ثم المتوسط'],
        expectedOutput: '100\n25.0',
        testInput: ''
      },
      21: {
        ideaTitle: 'مشروع الوحدة 21: موقع Flask متعدد المسارات',
        explanation: 'عرّف قاموساً باسم pages = {"/": "Home", "/about": "About"} واقرأ مساراً عبر input()، ثم اطبع الصفحة الموافقة.',
        requiredVariables: ['pages'],
        requirements: ['عرّف قاموس pages', 'اقرأ المسار عبر input()', 'اطبع اسم الصفحة'],
        expectedOutput: 'About',
        testInput: '/about\n'
      },
      22: {
        ideaTitle: 'مشروع الوحدة 22: نموذج استقبال بيانات HTML',
        explanation: 'اقرأ اسماً عبر input() في متغير باسم visitor واطبع f"Template rendered for {visitor}".',
        requiredVariables: ['visitor'],
        requirements: ['اقرأ visitor عبر input()', 'اطبع رسالة القالب المنسقة'],
        expectedOutput: 'Template rendered for Rami',
        testInput: 'Rami\n'
      },
      23: {
        ideaTitle: 'مشروع الوحدة 23: إدارة مستخدمين بقاعدة بيانات',
        explanation: 'عرّف قائمة باسم users_db = ["Ali", "Sara"]، أضف "Zaid" عبر append، واطبع len(users_db).',
        requiredVariables: ['users_db'],
        requirements: ['عرّف قائمة users_db', 'أضف "Zaid" بـ append()', 'اطبع العدد الجديد'],
        expectedOutput: '3',
        testInput: ''
      },
      24: {
        ideaTitle: 'مشروع الوحدة 24: خدمة API بصيغة JSON',
        explanation: 'استورد json، عرّف قاموساً باسم api_res = {"status": "ok", "count": 2}، واطبع json.dumps(api_res).',
        requiredVariables: ['api_res'],
        requirements: ['استورد json', 'عرّف قاموس api_res', 'اطبع النتيجة بصيغة JSON'],
        expectedOutput: '{"status": "ok", "count": 2}',
        testInput: ''
      },
      25: {
        ideaTitle: 'مشروع الوحدة 25: إعداد نشر التطبيق (Deployment)',
        explanation: 'عرّف متغيراً باسم app_env بقيمة "production" ومتغيراً باسم port بقيمة 8000، ثم اطبع f"{app_env}:{port}".',
        requiredVariables: ['app_env', 'port'],
        requirements: ['عرّف app_env و port', 'اطبع f"{app_env}:{port}"'],
        expectedOutput: 'production:8000',
        testInput: ''
      },
      26: {
        ideaTitle: 'مشروع الوحدة 26: مستكشف بيانات المبيعات (Pandas)',
        explanation: 'عرّف قاموساً باسم sales_df = {"item": ["A", "B", "C"], "price": [10, 20, 30]} واطبع sum(sales_df["price"]).',
        requiredVariables: ['sales_df'],
        requirements: ['عرّف قاموس sales_df', 'اجمع عمود price', 'اطبع المجموع'],
        expectedOutput: '60',
        testInput: ''
      },
      27: {
        ideaTitle: 'مشروع الوحدة 27: تصفية وتحليل الدرجات',
        explanation: 'عرّف قائمة باسم marks = [45, 60, 85, 95] واطبع عدد الناجحين (>= 50).',
        requiredVariables: ['marks'],
        requirements: ['عرّف قائمة marks', 'احسب عدد العناصر >= 50', 'اطبع العدد'],
        expectedOutput: '3',
        testInput: ''
      },
      28: {
        ideaTitle: 'مشروع الوحدة 28: لوحة رسم بياني للأرباح',
        explanation: 'عرّف قائمة باسم profits = [120, 240, 180] واطبع المجموع في السطر الأول وأعلى ربح في السطر الثاني.',
        requiredVariables: ['profits'],
        requirements: ['عرّف قائمة profits', 'اطبع المجموع ثم أعلى قيمة'],
        expectedOutput: '540\n240',
        testInput: ''
      },
      29: {
        ideaTitle: 'مشروع الوحدة 29: معالج مصفوفات رقمية (NumPy)',
        explanation: 'عرّف قائمة باسم vec = [1, 2, 3, 4] واطبع مجموع كل عنصر مضافاً إليه 10 مفصولاً بمسافة (11 12 13 14).',
        requiredVariables: ['vec'],
        requirements: ['عرّف قائمة vec', 'أضف 10 لكل عنصر واطبعها في سطر واحد'],
        expectedOutput: '11 12 13 14',
        testInput: ''
      },
      30: {
        ideaTitle: 'مشروع الوحدة 30: نموذج تصنيف ذكي مبسط',
        explanation: 'اقرأ رقماً كـ float عبر input() في متغير باسم temp_val؛ إذا كان >= 30 اطبع "Hot" وإلا اطبع "Normal".',
        requiredVariables: ['temp_val'],
        requirements: ['اقرأ temp_val كـ float', 'طبّق شرط التصنيف', 'اطبع "Hot" أو "Normal"'],
        expectedOutput: 'Hot',
        testInput: '35\n'
      }
    };

    const proj = fixedProjects[unitId] || {
      ideaTitle: `مشروع الوحدة ${unitId}: ${unit.title}`,
      explanation: `اكتب كود بايثون يحقق فكرة الوحدة (${unit.title}) واطبع النتيجة النهائية.`,
      requiredVariables: [],
      requirements: ['اكتب الكود بنفسك في المحرر الفارغ', 'اطبع النتيجة بـ print()'],
      expectedOutput: 'Done',
      testInput: ''
    };

    return {
      key: `unit-${unit.id}-project`,
      title: `مشروع الوحدة: ${unit.title}`,
      heading: proj.ideaTitle,
      ideaTitle: proj.ideaTitle,
      explanation: proj.explanation,
      description: unit.description || proj.explanation,
      requiredVariables: proj.requiredVariables,
      requirements: proj.requirements,
      hints: ['ابدأ بالكتابة في المحرر الفارغ مباشرة.', 'تأكد من تطابق المخرجات والأسماء المطلوبة.'],
      starterCode: '',
      testCases: [
        {
          input: proj.testInput,
          expected_output: proj.expectedOutput,
          description: `اختبار مشروع الوحدة ${unitId}`
        }
      ],
      requiredKeywords: ['print'],
      xpReward: (unit.project && unit.project.xpReward) || 150,
      unitId: unit.id
    };
  },

  startUnitProject(unitId) {
    const unit = this.state.units.find(u => u.id === unitId);
    if (!unit) return;

    this.state.codeTaskMode = 'project';
    this.state.codeTask = this.buildUnitProjectTask(unit);
    this.showCodeTask();
  },

  showCodeTask() {
    const task = this.state.codeTask;
    if (!task) return;

    const titleEl = document.getElementById('code-task-title');
    if (titleEl) {
      titleEl.textContent = this.state.codeTaskMode === 'project' ? 'مشروع نهاية الوحدة' : 'شاشة كتابة كود بايثون';
    }

    const iconEl = document.getElementById('code-task-icon');
    if (iconEl) iconEl.textContent = task.icon || (this.state.codeTaskMode === 'project' ? '🚀' : '🐍');

    const headingEl = document.getElementById('code-task-heading');
    if (headingEl) headingEl.textContent = task.ideaTitle || task.heading || task.title || 'اكتب الكود';

    const descEl = document.getElementById('code-task-description');
    if (descEl) {
      const varsHtml = (task.requiredVariables && task.requiredVariables.length)
        ? `<div class="required-vars-box" style="margin-top:10px; padding:10px; border-radius:8px; background:rgba(28,176,246,0.12);">
             <strong>📌 أسماء المتغيرات المطلوبة:</strong>
             <code>${task.requiredVariables.join(', ')}</code>
           </div>`
        : '';
      descEl.innerHTML = `<p>${task.explanation || task.description || task.question || ''}</p>${varsHtml}`;
    }

    const requirements = document.getElementById('code-task-requirements');
    if (requirements) {
      requirements.innerHTML = task.requirements && task.requirements.length
        ? `<h4>خطوات ومتطلبات التنفيذ</h4><ul class="code-task-requirements">${task.requirements.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';
    }

    const hints = document.getElementById('code-task-hints');
    if (hints) {
      hints.innerHTML = task.hints && task.hints.length
        ? `<h4>شرح الفكرة وتلميحات</h4><ul>${task.hints.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';
    }

    const editor = document.getElementById('python-code-editor');
    if (editor) {
      const savedDraft = storage.getCodeDraft(task.key);
      editor.value = typeof savedDraft === 'string' ? savedDraft : '';
      editor.placeholder = '# اكتب الكود الخاص بك هنا...';
      editor.oninput = () => storage.saveCodeDraft(task.key, editor.value);
    }

    const outputEl = document.getElementById('code-output-content');
    if (outputEl) {
      outputEl.textContent = 'اكتب الكود ثم اضغط «تشغيل الكود» لرؤية النتيجة والتحقق.';
      outputEl.className = '';
    }

    this.showScreen('code-screen');
  },

  validateRequiredVariables(code, requiredVars = []) {
    if (!requiredVars || requiredVars.length === 0) return { ok: true, missing: [] };
    const missing = requiredVars.filter(varName => {
      const assignRegex = new RegExp(`(^|\n)[ \t]*${varName}[ \t]*=(?!=)`, 'm');
      const defRegex = new RegExp(`(^|\n)[ \t]*def[ \t]+${varName}[ \t]*\(`, 'm');
      const classRegex = new RegExp(`(^|\n)[ \t]*class[ \t]+${varName}[ \t]*[:(]`, 'm');
      return !assignRegex.test(code) && !defRegex.test(code) && !classRegex.test(code);
    });
    return { ok: missing.length === 0, missing };
  },

  closeCodeTask() {
    if (this.state.codeTaskMode === 'project') {
      this.showScreen('home-screen');
      this.renderHome();
    } else {
      this.showScreen('lesson-screen');
    }
  },

  resetCodeDraft() {
    if (!this.state.codeTask) return;
    const editor = document.getElementById('python-code-editor');
    if (editor) {
      editor.value = '';
      storage.saveCodeDraft(this.state.codeTask.key, '');
    }
  },

  async runCodeTask() {
    const task = this.state.codeTask;
    const editor = document.getElementById('python-code-editor');
    const output = document.getElementById('code-output-content');
    const button = document.getElementById('run-code-btn');
    if (!task || !editor || !output) return;

    const code = editor.value;
    storage.saveCodeDraft(task.key, code);

    if (!code.trim()) {
      output.textContent = '⚠️ اكتب الكود أولاً قبل الضغط على تشغيل الكود.';
      output.className = 'error';
      return;
    }

    if (button) { button.disabled = true; button.textContent = 'جاري التشغيل...'; }
    output.textContent = 'جاري تشغيل كود بايثون...';
    output.className = '';

    const varCheck = this.validateRequiredVariables(code, task.requiredVariables);
    if (!varCheck.ok) {
      output.textContent = `⚠️ تأكد من تعريف المتغيرات بالاسم المطلوب تماماً: ${varCheck.missing.join(', ')}`;
      output.className = 'error';
      if (button) { button.disabled = false; button.textContent = 'تشغيل الكود ▶'; }
      return;
    }

    try {
      if (this.state.codeTaskMode === 'project') {
        const evaluation = await evaluateProject(code, task.testCases, task.requiredKeywords);
        const passed = evaluation.passed;
        output.textContent = evaluation.feedback.map(item => item.text).join('\n');
        output.className = passed ? 'success' : 'error';

        if (passed) {
          storage.markProjectComplete(task.unitId + '-project');
          storage.markProjectComplete(task.unitId + '-quiz');
          storage.markUnitComplete(task.unitId);
          storage.addXP(task.xpReward);
          storage.addGems(20);
          this.updateHeaderStats();
          if (typeof achievementsModule !== 'undefined') achievementsModule.checkAndNotify();
          this.showToast('🎉 أكملت مشروع الوحدة!', 'success');
          setTimeout(() => { this.showScreen('home-screen'); this.renderHome(); }, 1200);
        }
      } else {
        const result = await runPython(code, task.testInput || '');
        const actual = (result.output || '').trim();
        const expected = (task.expectedOutput || '').trim();
        if (result.success && actual === expected) {
          output.textContent = '✅ النتيجة صحيحة:\n' + actual;
          output.className = 'success';
          this.state.correctCount++;
          storage.removeMistake(task.question || task.heading);

          setTimeout(() => {
            this.showScreen('lesson-screen');
            this.nextExercise();
          }, 600);
        } else {
          output.textContent =
            '❌ الناتج غير مطابق:\n' + (actual || result.error || 'لا يوجد ناتج') +
            '\nالنتيجة المتوقعة:\n' + expected;
          output.className = 'error';
          this.state.lessonHearts--;
          storage.loseHeart();
          storage.addMistake({
            question: task.question || task.heading,
            code: code,
            explanation: 'تحدّي كتابة كود'
          });
          storage.resetStreak();
          this.updateHeaderStats();
        }
      }
    } catch (error) {
      output.textContent = '❌ تعذر تشغيل الكود.';
      output.className = 'error';
    } finally {
      if (button) { button.disabled = false; button.textContent = 'تشغيل الكود ▶'; }
    }
  },

  startUnitQuiz(unitId) {
    const user = storage.getUser();
    if (user.hearts <= 0) { alert('مفيش قلوب!'); return; }
    const unit = this.state.units.find(u => u.id === unitId);
    let allExercises = [];
    unit.lessons.forEach(l => allExercises = allExercises.concat(l.exercises));

    for (let i = allExercises.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allExercises[i], allExercises[j]] = [allExercises[j], allExercises[i]];
    }
    const quizExercises = allExercises.slice(0, Math.min(10, allExercises.length));

    this.state.currentLesson = null;
    this.state.currentUnitId = unitId;
    this.state.quizUnitId = unitId;
    this.state.currentExercises = quizExercises;
    this.state.isQuiz = true;
    this.state.isMistakesReview = false;
    this.state.isReplay = user.completedProjects.includes(unitId + '-quiz');
    this.state.lessonMistakes = 0;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;
    this.state.totalCount = quizExercises.length;
    this.state.selectedAnswer = null;
    this.state.lessonHearts = user.hearts;

    const heartsEl = document.getElementById('lesson-hearts');
    if (heartsEl) heartsEl.textContent = this.state.lessonHearts;

    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  showExplanation(lesson, unit) {
    this.showScreen('explanation-screen');
    if (window.sounds) sounds.playClick();
    const iconEl = document.getElementById('explanation-icon');
    const titleEl = document.getElementById('explanation-title');
    const contentEl = document.getElementById('explanation-content');
    const tipEl = document.getElementById('explanation-tip');

    if (iconEl) iconEl.textContent = unit.icon || '📖';
    if (titleEl) titleEl.textContent = lesson.title;
    if (contentEl) contentEl.innerHTML = lesson.lessonExplanation || '<h2>استعد!</h2>';

    if (lesson.lessonTip && tipEl) {
      const tipTextEl = document.getElementById('explanation-tip-text');
      if (tipTextEl) tipTextEl.textContent = lesson.lessonTip;
      tipEl.style.display = 'flex';
    } else if (tipEl) {
      tipEl.style.display = 'none';
    }
  },

  startExercises() {
    if (window.sounds) sounds.playClick();
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  closeExplanation() {
    if (confirm('متأكد إنك عايز تخرج؟')) { this.showScreen('home-screen'); this.renderHome(); }
  },

  renderExercise() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    if (!exercise) return;

    if (exercise.type === 'write_code') {
      this.state.codeTaskMode = 'lesson';
      this.state.codeTask = {
        key: `lesson-${this.state.currentUnitId || 'u'}-${this.state.currentLesson ? this.state.currentLesson.id : 'review'}-code`,
        title: this.state.currentLesson ? this.state.currentLesson.title : 'تحدّي الكود',
        heading: exercise.question,
        ideaTitle: exercise.ideaTitle || exercise.question,
        explanation: exercise.explanation || 'اكتب الكود في المحرر ثم شغّله للتحقق.',
        description: exercise.explanation || 'اكتب الكود في المستطيل الكبير، ثم شغّله لمعرفة النتيجة.',
        requiredVariables: exercise.requiredVariables || [],
        icon: '⌨️',
        requirements: [],
        hints: exercise.hints || [],
        starterCode: '',
        expectedOutput: exercise.expectedOutput,
        testInput: exercise.testInput || '',
        question: exercise.question
      };
      this.showCodeTask();
      return;
    }

    this.state.selectedAnswer = null;
    const progress = ((this.state.currentExerciseIndex) / this.state.totalCount) * 100;
    const progEl = document.getElementById('lesson-progress');
    if (progEl) progEl.style.width = progress + '%';

    const qText = document.getElementById('question-text');
    if (qText) qText.textContent = exercise.question;

    const extra = document.getElementById('question-extra');
    const answersContainer = document.getElementById('answers-container');
    if (answersContainer) answersContainer.innerHTML = '';
    if (extra) extra.innerHTML = '';

    if (exercise.code && extra) {
      extra.textContent = exercise.code;
      extra.style.display = 'block';
    } else if (extra) {
      extra.style.display = 'none';
    }

    const checkBtn = document.getElementById('check-btn');
    const feedback = document.getElementById('feedback-area');
    if (feedback) { feedback.className = 'feedback-area'; feedback.textContent = ''; }
    if (checkBtn) {
      checkBtn.textContent = 'تحقق';
      checkBtn.disabled = true;
      checkBtn.onclick = () => this.checkAnswer();
    }

    if (exercise.type === 'multiple_choice') {
      exercise.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.onclick = () => this.selectAnswer(idx, btn);
        if (answersContainer) answersContainer.appendChild(btn);
      });
    } else {
      const bank = exercise.bank || this.generateBank(exercise.correctAnswer);
      bank.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.onclick = () => this.selectAnswer(opt, btn);
        if (answersContainer) answersContainer.appendChild(btn);
      });
    }
  },

  generateBank(correctAnswer) {
    const options = [correctAnswer];
    const distractors = ['print', 'input', '=', '+', '"Hello"', '5', 'if', 'while'];
    while (options.length < 4) {
      const d = distractors[Math.floor(Math.random() * distractors.length)];
      if (!options.includes(d)) options.push(d);
    }
    return options.sort(() => Math.random() - 0.5);
  },

  selectAnswer(value, btn) {
    document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.state.selectedAnswer = value;
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn) checkBtn.disabled = false;
    if (window.sounds) sounds.playSelect();
  },

  checkAnswer() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    let isCorrect = this.state.selectedAnswer === exercise.correctAnswer;
    const feedback = document.getElementById('feedback-area');
    const checkBtn = document.getElementById('check-btn');

    if (isCorrect) {
      if (window.sounds) sounds.playCorrect();
      this.state.correctCount++;
      storage.removeMistake(exercise.question);
      if (feedback) { feedback.textContent = '✅ صح! ' + (exercise.explanation || ''); feedback.className = 'feedback-area show correct'; }
      if (!this.state.isReplay && !this.state.isQuiz) storage.addXP(10);
      this.updateHeaderStats();
    } else {
      if (window.sounds) sounds.playWrong();
      this.state.lessonHearts--;
      storage.loseHeart();
      storage.addMistake(exercise);
      const heartsEl = document.getElementById('lesson-hearts');
      if (heartsEl) heartsEl.textContent = this.state.lessonHearts;

      if (!this.state.isQuiz && !this.state.isReplay) {
        this.state.lessonMistakes++;
        const user = storage.getUser();
        if ((user.lessonStreak || 0) > 0) {
          if ((user.streakFreezes || 0) > 0) {
            user.streakFreezes--;
            storage.setUser(user);
            this.showToast('❄️ تم استخدام تجميد السلسلة!', 'success');
          } else {
            storage.resetStreak();
            this.showToast('💔 الستريك رجع صفر!', 'error');
          }
        }
      }
      this.updateHeaderStats();
      if (feedback) {
        feedback.textContent = '❌ غلط. الإجابة الصح: ' + (exercise.type === 'multiple_choice' ? exercise.options[exercise.correctAnswer] : exercise.correctAnswer);
        feedback.className = 'feedback-area show wrong';
      }
    }

    if (checkBtn) {
      checkBtn.textContent = 'متابعة';
      checkBtn.disabled = false;
      checkBtn.onclick = () => this.nextExercise();
    }
  },

  nextExercise() {
    if (this.state.lessonHearts <= 0) {
      if (window.sounds) sounds.playHeartLost();
      alert('خلصت القلوب!');
      this.closeLesson();
      return;
    }
    this.state.currentExerciseIndex++;
    if (this.state.currentExerciseIndex >= this.state.totalCount) {
      if (this.state.isMistakesReview) this.completeMistakesReview();
      else if (this.state.isQuiz) this.completeQuiz();
      else this.completeLesson();
    } else {
      this.renderExercise();
    }
  },

  completeLesson() {
    const lesson = this.state.currentLesson;
    if (window.sounds) sounds.playComplete();
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    let xpToAdd = (lesson && lesson.xpReward) || 20;

    if (!this.state.isReplay && lesson) {
      storage.markLessonComplete(lesson.id);
      const user = storage.getUser();
      if (user.doubleXPActive) {
        xpToAdd *= 2;
        user.doubleXPActive = false;
        storage.setUser(user);
        this.showToast('⚡ XP مضاعف!', 'success');
      }
      storage.addXP(xpToAdd);
      storage.addGems(5);
      this.updateQuestProgress('xp', xpToAdd);
      this.updateQuestProgress('lessons', 1);
      this.updateQuestProgress('gems', 5);
      if (this.state.lessonMistakes === 0) {
        storage.incrementStreak();
        this.updateQuestProgress('perfect', 1);
      }
      const xpEl = document.getElementById('complete-xp');
      const msgEl = document.getElementById('complete-message');
      if (xpEl) xpEl.textContent = '+' + xpToAdd;
      if (msgEl) msgEl.textContent = this.state.lessonMistakes === 0 ? 'درس كامل بدون أخطاء! 🔥' : 'عندك أخطاء، الستريك صفر!';
    } else {
      const xpEl = document.getElementById('complete-xp');
      const msgEl = document.getElementById('complete-message');
      if (xpEl) xpEl.textContent = '+0';
      if (msgEl) msgEl.textContent = 'مراجعة ممتازة! 🌟';
    }

    this.updateHeaderStats();
    if (typeof achievementsModule !== 'undefined') achievementsModule.checkAndNotify();
    const accEl = document.getElementById('complete-accuracy');
    if (accEl) accEl.textContent = accuracy + '%';
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeQuiz() {
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    const passed = accuracy >= 70;
    if (window.sounds) sounds.playComplete();

    let xpReward = 0, gemReward = 0;
    if (passed) {
      storage.markProjectComplete(this.state.quizUnitId + '-quiz');
      storage.markUnitComplete(this.state.quizUnitId);
      if (!this.state.isReplay) { xpReward = 30; gemReward = 10; }
    } else {
      if (!this.state.isReplay) { xpReward = 10; gemReward = 5; }
    }

    if (xpReward > 0) storage.addXP(xpReward);
    if (gemReward > 0) storage.addGems(gemReward);

    this.updateHeaderStats();
    const xpEl = document.getElementById('complete-xp');
    const accEl = document.getElementById('complete-accuracy');
    const msgEl = document.getElementById('complete-message');
    if (xpEl) xpEl.textContent = '+' + xpReward;
    if (accEl) accEl.textContent = accuracy + '%';
    if (msgEl) msgEl.textContent = passed ? '🎉 نجحت!' : 'حاول تاني!';

    if (typeof achievementsModule !== 'undefined') achievementsModule.checkAndNotify();
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeMistakesReview() {
    this.updateHeaderStats();
    const xpEl = document.getElementById('complete-xp');
    const accEl = document.getElementById('complete-accuracy');
    const msgEl = document.getElementById('complete-message');

    if (xpEl) xpEl.textContent = '+0';
    if (accEl) accEl.textContent = '100%';
    if (msgEl) msgEl.textContent = 'خلصت مراجعة أخطائك! 🌟';

    this.showScreen('complete-screen');
    this.showConfetti();
  },

  continueFromComplete() {
    this.showScreen('home-screen');
    this.renderHome();
  },

  closeLesson() {
    if (confirm('متأكد إنك عايز تخرج؟')) { this.showScreen('home-screen'); this.renderHome(); }
  },

  openShop() { this.renderShop(); this.showScreen('shop-screen'); },
  closeShop() { this.showScreen('home-screen'); this.renderHome(); },
  renderShop() {
    const user = storage.getUser();
    const heartsInfo = storage.getHeartsInfo();
    const gemsEl = document.getElementById('shop-gems');
    const heartsEl = document.getElementById('shop-hearts');
    if (gemsEl) gemsEl.textContent = user.gems;
    if (heartsEl) heartsEl.textContent = user.hearts;

    const timerEl = document.getElementById('heart-timer');
    if (timerEl) {
      if (user.hearts >= storage.MAX_HEARTS) timerEl.textContent = 'كاملة ❤️';
      else timerEl.textContent = this.formatTime(heartsInfo.nextHeartIn);
    }
  },
  buyHearts() {
    const res = storage.buyHearts(1, 50);
    if (res.success) { this.updateHeaderStats(); this.renderShop(); this.showToast('✅ تم الشراء', 'success'); if (window.sounds) sounds.playLevelUp(); }
    else this.showToast('❌ ' + res.error, 'error');
  },
  buyStreakFreeze() {
    const user = storage.getUser();
    if (user.gems < 200) return this.showToast('❌ جواهر مش كفاية', 'error');
    user.gems -= 200; user.streakFreezes = (user.streakFreezes || 0) + 1;
    storage.setUser(user); this.updateHeaderStats(); this.renderShop(); this.showToast('✅ تم الشراء', 'success');
  },
  buyDoubleXP() {
    const user = storage.getUser();
    if (user.gems < 100) return this.showToast('❌ جواهر مش كفاية', 'error');
    user.gems -= 100; user.doubleXPActive = true;
    storage.setUser(user); this.updateHeaderStats(); this.renderShop(); this.showToast('✅ تم الشراء', 'success');
  },

  openAchievements() { this.renderAchievements(); this.showScreen('achievements-screen'); },
  closeAchievements() { this.showScreen('home-screen'); this.renderHome(); },
  renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    const unlocked = achievementsModule.getUnlocked();
    container.innerHTML = '';
    achievementsModule.list.forEach(ach => {
      const isUnlocked = unlocked.includes(ach.id);
      container.innerHTML += `<div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${isUnlocked ? ach.icon : '🔒'}</div>
        <div class="achievement-info"><h3>${ach.title}</h3><p>${ach.description}</p></div>
      </div>`;
    });
    const countEl = document.getElementById('achievements-count');
    if (countEl) countEl.textContent = unlocked.length + ' / ' + achievementsModule.list.length;
  },

  openLeaderboard() { this.showScreen('leaderboard-screen'); this.loadLeaderboard(); },
  closeLeaderboard() { this.showScreen('home-screen'); this.renderHome(); },
  async loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    if (typeof firestoreModule === 'undefined' || !firestoreModule.db) {
      container.innerHTML = '<p style="text-align:center; color:var(--gray-500);">⚠️ Firestore مش جاهز</p>';
      return;
    }
    try {
      const users = await firestoreModule.getLeaderboard(20);
      const myRank = await firestoreModule.getMyRank();

      const rankEl = document.getElementById('my-rank');
      if (rankEl && myRank) rankEl.textContent = '#' + myRank;

      container.innerHTML = '';
      users.forEach((u, i) => {
        const avatar = u.photoURL || 'https://via.placeholder.com/40';
        container.innerHTML += `<div class="leaderboard-item">
          <div class="leaderboard-rank">#${i + 1}</div>
          <img class="leaderboard-avatar" src="${avatar}" alt="avatar" />
          <div class="leaderboard-name">${u.displayName || 'مستخدم'}</div>
          <div class="leaderboard-xp">${u.xp || 0} ⚡</div>
        </div>`;
      });
    } catch (e) { container.innerHTML = 'خطأ في التحميل'; }
  },

  startHeartsTimer() {
    if (this.heartsTimer) clearInterval(this.heartsTimer);
    this.heartsTimer = setInterval(() => {
      const user = storage.getUser();
      const info = storage.getHeartsInfo();
      const hEl = document.getElementById('hearts-value');
      if (hEl) hEl.textContent = user.hearts;
      const gEl = document.getElementById('gems-value');
      if (gEl) gEl.textContent = user.gems;

      const shopTimer = document.getElementById('heart-timer');
      if (shopTimer) {
        if (user.hearts >= storage.MAX_HEARTS) shopTimer.textContent = 'كاملة ❤️';
        else shopTimer.textContent = this.formatTime(info.nextHeartIn);
      }
      const lessonHearts = document.getElementById('lesson-hearts');
      if (lessonHearts) lessonHearts.textContent = user.hearts;
    }, 1000);
  },

  updateHeaderStats() {
    const user = storage.getUser();
    const streakEl = document.getElementById('streak-value');
    if (streakEl) streakEl.textContent = user.lessonStreak || 0;
    const gemsEl = document.getElementById('gems-value');
    if (gemsEl) gemsEl.textContent = user.gems;
    const heartsEl = document.getElementById('hearts-value');
    if (heartsEl) heartsEl.textContent = user.hearts;
    const xpEl = document.getElementById('xp-value');
    if (xpEl) xpEl.textContent = user.xp;
    const levelEl = document.getElementById('level-value');
    if (levelEl) levelEl.textContent = storage.getLevel ? storage.getLevel() : Math.floor(user.xp / 100) + 1;

    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = setTimeout(() => firestoreModule.saveToFirestore(), 3000);
    }
  },

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + seconds.toString().padStart(2, '0');
  },

  showConfetti() {
    const colors = ['#58CC02', '#1CB0F6', '#FFC800', '#CE82FF', '#FF4B4B', '#FF6B9D'];
    const container = document.getElementById('complete-screen');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
      piece.style.width = (Math.random() * 8 + 6) + 'px';
      piece.style.height = (Math.random() * 8 + 6) + 'px';
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    }
  },

  showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show ' + (type || 'success');
    setTimeout(() => toast.className = 'toast', 2500);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});