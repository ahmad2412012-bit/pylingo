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

  // تفعيل كل الأزرار الأساسية والاحتياطية
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

    // تفويض لأي زر يحمل data-action
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

  // فكرة تطبيقية مفصلة + أسماء متغيرات إلزامية لكل درس
  createLessonCodeChallenge(unit, lesson) {
    const title = lesson.title || '';
    const base = {
      question: `تطبيق عملي لدرس "${title}"`,
      ideaTitle: `فكرة الكود: ${title}`,
      explanation: `في هذا التحدي ستطبق مفهوم "${title}" داخل الوحدة (${unit.title}) وتطبع النتيجة النهائية بدقة.`,
      requiredVariables: [],
      starterCode: '# اكتب الكود هنا\n',
      expectedOutput: 'Hello',
      testInput: '',
      hints: [
        'التزم باسم المتغير المطلوب كما هو مكتوب تماماً.',
        'اختبر الكود بالضغط على زر تشغيل الكود قبل التحقق.'
      ]
    };

    if (/print|أمر/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'طباعة رسالة ترحيبية باسم متغير',
        explanation: 'أنشئ متغيراً باسم greeting_msg يحتوي على "Welcome to Python" ثم اطبعه باستخدام print().',
        requiredVariables: ['greeting_msg'],
        starterCode: '# عرّف المتغير greeting_msg بقيمة "Welcome to Python"\n# ثم اطبعه\n',
        expectedOutput: 'Welcome to Python',
        hints: ['اسم المتغير يجب أن يكون greeting_msg.', 'استخدم print(greeting_msg).']
      };
    }

    if (/تعليق|comments/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'توثيق الكود بتعليق وطباعة حالة',
        explanation: 'اكتب تعليقاً يشرح البرنامج يبدأ بالرمز #، ثم عرّف متغيراً باسم note_status بقيمة "Ready" واطبعه.',
        requiredVariables: ['note_status'],
        starterCode: '# اكتب تعليقاً هنا\n',
        expectedOutput: 'Ready',
        hints: ['أي سطر يبدأ بـ # يعتبر تعليقاً.', 'المتغير المطلوب اسمه note_status.']
      };
    }

    if (/متغير|variable/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'تخزين اسم الطالب وعمره وطباعتهما',
        explanation: 'عرّف متغيرين: student_name بقيمة "Ahmad" و student_age بقيمة 14، ثم اطبع "Ahmad - 14".',
        requiredVariables: ['student_name', 'student_age'],
        starterCode: 'student_name = "Ahmad"\nstudent_age = 14\n# اطبع النتيجة المطلوبة\n',
        expectedOutput: 'Ahmad - 14',
        hints: ['استخدم f-string أو + مع str() لطباعة الرقم مع النص.', 'الأسماء المطلوبة: student_name و student_age.']
      };
    }

    if (/نص|string/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'دمج نصين في متغير واحد',
        explanation: 'عرّف first_part = "Py" و second_part = "Lingo"، ثم ادمجهما في متغير باسم full_name واطبعه.',
        requiredVariables: ['first_part', 'second_part', 'full_name'],
        starterCode: 'first_part = "Py"\nsecond_part = "Lingo"\n# كوّن المتغير full_name واطبعه\n',
        expectedOutput: 'PyLingo',
        hints: ['اجمع النصين بالرمز + داخل full_name.', 'تأكد من وجود المتغيرات الثلاثة.']
      };
    }

    if (/مدخل|input/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'استقبال اسم المستخدم والترحيب به',
        explanation: 'اقرأ الاسم في متغير باسم user_input باستخدام input()، ثم اطبع "Hi " متبوعاً بقيمة user_input.',
        requiredVariables: ['user_input'],
        starterCode: 'user_input = input()\nprint("Hi " + user_input)\n',
        expectedOutput: 'Hi Ahmad',
        testInput: 'Ahmad\n',
        hints: ['اسم المتغير الإلزامي هو user_input.', 'استخدم input() بدون نص إضافي أو حسب المطلوب.']
      };
    }

    if (/حلقة|while|for|loop/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'تكرار طباعة كلمة عبر حلقة',
        explanation: 'عرّف متغيراً باسم repeat_count بقيمة 3، واستخدم حلقة لطباعة "Code" ثلاث مرات في أسطر منفصلة.',
        requiredVariables: ['repeat_count'],
        starterCode: 'repeat_count = 3\n# استخدم حلقة لطباعة Code ثلاث مرات\n',
        expectedOutput: 'Code\nCode\nCode',
        hints: ['يمكن استخدام for _ in range(repeat_count):', 'اطبع "Code" داخل الحلقة.']
      };
    }

    if (/قائمة|list|مصفوف/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'الوصول إلى عنصر محدد من قائمة',
        explanation: 'عرّف قائمة باسم top_cars تحتوي ["M5", "M4", "LFA"] ثم خزّن العنصر الثاني في selected_car واطبعه.',
        requiredVariables: ['top_cars', 'selected_car'],
        starterCode: 'top_cars = ["M5", "M4", "LFA"]\n# خزّن العنصر الثاني في selected_car واطبعه\n',
        expectedOutput: 'M4',
        hints: ['الفهرسة تبدأ من 0، فالعنصر الثاني رقمه 1.', 'عرّف المتغير selected_car.']
      };
    }

    if (/قاموس|dict|dictionary/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'استخراج قيمة من قاموس عبر المفتاح',
        explanation: 'عرّف قاموساً باسم car_info يحتوي {"brand": "BMW", "year": 2026} ثم خزّن قيمة "brand" في car_brand واطبعها.',
        requiredVariables: ['car_info', 'car_brand'],
        starterCode: 'car_info = {"brand": "BMW", "year": 2026}\n# خزّن القيمة في car_brand واطبعها\n',
        expectedOutput: 'BMW',
        hints: ['استخدم car_info["brand"].', 'المتغير المطلوب اسمه car_brand.']
      };
    }

    if (/دالة|function|functions/.test(title)) {
      return {
        ...base,
        type: 'write_code',
        ideaTitle: 'إنشاء دالة تجمع رقمين وتطبع النتيجة',
        explanation: 'عرّف دالة باسم add_nums(a, b) ترجع a + b، وخزّن ناتج استدعائها (4, 6) في متغير باسم total_sum واطبعه.',
        requiredVariables: ['total_sum'],
        starterCode: 'def add_nums(a, b):\n    return a + b\n\ntotal_sum = add_nums(4, 6)\nprint(total_sum)\n',
        expectedOutput: '10',
        hints: ['الدالة ترجع المجموع بـ return.', 'المتغير المطلوب اسمه total_sum.']
      };
    }

    return {
      ...base,
      type: 'write_code',
      ideaTitle: `تطبيق مباشر لمفهوم ${title}`,
      explanation: `عرّف متغيراً باسم lesson_result بقيمة "Done" واطبعه لتأكيد فهمك لفكرة "${title}".`,
      requiredVariables: ['lesson_result'],
      starterCode: 'lesson_result = "Done"\nprint(lesson_result)\n',
      expectedOutput: 'Done',
      hints: ['عرّف المتغير lesson_result أولاً.', 'اطبع قيمته باستخدام print(lesson_result).']
    };
  },

  // مشروع متكامل لكل وحدة (مخصص إن وجد أو مولّد تلقائياً لكل وحدة)
  buildUnitProjectTask(unit) {
    if (unit.project) {
      const p = unit.project;
      return {
        key: `unit-${unit.id}-project`,
        title: p.title,
        heading: p.title,
        ideaTitle: `فكرة مشروع الوحدة: ${p.title}`,
        description: p.description,
        requiredVariables: p.requiredVariables || [],
        requirements: p.requirements || [],
        hints: p.hints || p.requirements || [],
        starterCode: p.starterCode || '# اكتب مشروع الوحدة هنا\n',
        testCases: p.testCases || [],
        requiredKeywords: p.requiredKeywords || [],
        xpReward: p.xpReward || 150,
        unitId: unit.id
      };
    }

    return {
      key: `unit-${unit.id}-project`,
      title: `مشروع وحدة: ${unit.title}`,
      heading: `🚀 مشروع نهاية الوحدة: ${unit.title}`,
      ideaTitle: `فكرة المشروع: تطبيق شامل لمفاهيم "${unit.title}"`,
      description: `اجمع أفكار دروس الوحدة (${unit.description || unit.title}) في برنامج واحد مرتب يطبع نتيجة واضحة.`,
      requiredVariables: ['project_title', 'project_score'],
      requirements: [
        'عرّف المتغير project_title بنص عنوان المشروع',
        'عرّف المتغير project_score برقم النتيجة (مثلاً 100)',
        'اطبع النتيجة النهائية بصيغة: Project Ready: 100'
      ],
      hints: [
        'تأكد من كتابة المتغيرين project_title و project_score بنفس الاسم.',
        'الاختبار يتحقق من طباعة "Project Ready: 100".'
      ],
      starterCode: 'project_title = "' + unit.title + '"\nproject_score = 100\nprint("Project Ready:", project_score)\n',
      testCases: [
        {
          input: '',
          expected_output: 'Project Ready: 100',
          description: 'اختبار النتيجة النهائية لمشروع الوحدة'
        }
      ],
      requiredKeywords: ['print'],
      xpReward: 150,
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
      editor.value = storage.getCodeDraft(task.key) || task.starterCode || '# اكتب الكود هنا\n';
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
      const assignRegex = new RegExp(`(^|\\n)[ \\t]*${varName}[ \\t]*=(?!=)`, 'm');
      const defRegex = new RegExp(`(^|\\n)[ \\t]*def[ \\t]+${varName}[ \\t]*\\(`, 'm');
      return !assignRegex.test(code) && !defRegex.test(code);
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
      editor.value = this.state.codeTask.starterCode || '# اكتب الكود هنا\n';
      storage.saveCodeDraft(this.state.codeTask.key, editor.value);
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
        if (result.success && actual === (task.expectedOutput || '').trim()) {
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
            '\nالنتيجة المتوقعة:\n' + (task.expectedOutput || '');
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
        key: `lesson-${this.state.currentLesson ? this.state.currentLesson.id : 'review'}-code`,
        title: this.state.currentLesson ? this.state.currentLesson.title : 'تحدّي الكود',
        heading: exercise.question,
        ideaTitle: exercise.ideaTitle || exercise.question,
        explanation: exercise.explanation || 'اكتب الكود في المحرر ثم شغّله للتحقق.',
        description: exercise.explanation || 'اكتب الكود في المستطيل الكبير، ثم شغّله لمعرفة النتيجة.',
        requiredVariables: exercise.requiredVariables || [],
        icon: '⌨️',
        requirements: [],
        hints: exercise.hints || [],
        starterCode: exercise.starterCode || '# اكتب الكود هنا\n',
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