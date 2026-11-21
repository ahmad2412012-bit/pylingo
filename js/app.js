// ============ PyLingo App - Final Version ============

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
    currentExercises: [],
    isQuiz: false,
    isMistakesReview: false,
    lessonMistakes: 0,
    quizUnitId: null,
    isReplay: false,
    currentSectionIndex: 0,
    dailyQuests: []
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
  _prevStats: null,

  async loadUnits() {
    try {
      console.log('📚 Loading units...');
      const promises = [];
      for (let i = 1; i <= 30; i++) {
        promises.push(
          fetch('data/unit' + i + '.json')
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
      }
      const results = await Promise.all(promises);
      this.state.units = results.filter(u => u !== null);
      console.log('✅ Loaded ' + this.state.units.length + ' units');
      return this.state.units;
    } catch (error) {
      console.error('❌ Error loading units:', error);
      return [];
    }
  },

  async init() {
    await this.loadUnits();
    if (this.state.units.length === 0) return;

    const savedSection = localStorage.getItem('pylingo_current_section');
    if (savedSection) this.state.currentSectionIndex = parseInt(savedSection);

    this.setupSidebar();
    this.generateDailyQuests();
    this.renderHome();
    this.updateHeaderStats();

    if (typeof authModule !== 'undefined') authModule.init();

    setTimeout(() => {
      if (typeof firestoreModule !== 'undefined' && !firestoreModule.db) firestoreModule.init();
    }, 1500);

    this.startHeartsTimer();
  },

  // ===== 1. نظام المستويات =====
  getLevel() {
    return Math.floor((storage.getUser().xp || 0) / 100) + 1;
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

    // تحديث الليفل في العنوان
    const levelEl = document.getElementById('level-value');
    if (levelEl) levelEl.textContent = this.getLevel();

    const userNameEl = document.getElementById('user-name');
    if (userNameEl && user.displayName) userNameEl.textContent = user.displayName + ' (Level ' + this.getLevel() + ')';

    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = setTimeout(() => firestoreModule.saveToFirestore(), 3000);
    }
  },

  // ===== 2. القائمة الجانبية والأقسام =====
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
    if (typeof sounds !== 'undefined') sounds.playClick();
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
    if (typeof sounds !== 'undefined') sounds.playClick();
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

  // ===== 3. المهام اليومية =====
  generateDailyQuests() {
    const user = storage.getUser();
    const today = new Date().toDateString();
    if (user.dailyQuests && user.dailyQuests.date === today) {
      this.state.dailyQuests = user.dailyQuests.quests;
      return;
    }

    // بنك المهام
    const pool = [
      { id: 'xp50', icon: '⚡', text: 'اكسب 50 XP', stat: 'xp', target: 50, reward: 20 },
      { id: 'les2', icon: '📚', text: 'خلّص درسين', stat: 'lessons', target: 2, reward: 30 },
      { id: 'gems20', icon: '💎', text: 'اكسب 20 جوهرة', stat: 'gems', target: 20, reward: 15 },
      { id: 'perf1', icon: '🔥', text: 'خلّص درس بدون أخطاء', stat: 'perfect', target: 1, reward: 40 },
      { id: 'xp100', icon: '🚀', text: 'اكسب 100 XP', stat: 'xp', target: 100, reward: 50 },
      { id: 'les3', icon: '📖', text: 'خلّص 3 دروس', stat: 'lessons', target: 3, reward: 40 }
    ];

    // اختيار 5 عشوائياً
    const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0, 5);
    const quests = shuffled.map(q => ({ ...q, current: 0, claimed: false }));

    user.dailyQuests = { date: today, quests: quests };
    storage.setUser(user);
    this.state.dailyQuests = quests;
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

  openQuests() {
    this.renderQuests();
    this.showScreen('quests-screen');
    if (typeof sounds !== 'undefined') sounds.playClick();
  },

  closeQuests() {
    this.showScreen('home-screen');
  },

  renderQuests() {
    const container = document.getElementById('quests-list');
    if (!container) return;
    container.innerHTML = '';

    const user = storage.getUser();
    if (!user.dailyQuests) this.generateDailyQuests();
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
          ? `<button class="btn-primary" onclick="app.claimQuest('${q.id}', ${q.reward})" style="padding: 5px 15px; font-size: 14px;">استلام 💎${q.reward}</button>`
          : (q.claimed ? '<div class="achievement-check">✓</div>' : '')}
      `;
      container.appendChild(card);
    });
    document.getElementById('quests-count').textContent = completed + ' / ' + quests.length;
  },

  claimQuest(questId, reward) {
    const user = storage.getUser();
    const q = user.dailyQuests.quests.find(x => x.id === questId);
    if (q && q.current >= q.target && !q.claimed) {
      q.claimed = true;
      user.gems += reward;
      storage.setUser(user);
      if (typeof sounds !== 'undefined') sounds.playLevelUp();
      this.updateHeaderStats();
      this.renderQuests();
      this.showToast('🎉 تم استلام المكافأة!', 'success');
    }
  },

  // ===== 4. بنك الأخطاء =====
  openMistakes() {
    this.renderMistakes();
    this.showScreen('mistakes-screen');
    if (typeof sounds !== 'undefined') sounds.playClick();
  },

  closeMistakes() {
    this.showScreen('home-screen');
  },

  renderMistakes() {
    const container = document.getElementById('mistakes-list');
    if (!container) return;
    const user = storage.getUser();
    const mistakes = user.mistakes || [];
    document.getElementById('mistakes-count').textContent = mistakes.length;

    if (mistakes.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#58CC02; font-weight:bold; margin-top:20px;">🎉 عاش! مفيش أخطاء مسجلة.</p>';
      return;
    }

    container.innerHTML = `
      <button class="btn-primary" onclick="app.startMistakesReview()" style="width:100%; margin-bottom:20px;">🚀 ابدأ مراجعة الأخطاء</button>
    `;

    mistakes.forEach((ex, i) => {
      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `
        <div class="achievement-icon">🩹</div>
        <div class="achievement-info">
          <h3>سؤال ${i + 1}</h3>
          <p style="font-size:12px; color:#9aa8b0;">${ex.question.substring(0, 50)}...</p>
        </div>
      `;
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
    this.state.isReplay = true; // عشان مفيش مكافآت
    this.state.lessonMistakes = 0;
    this.state.lessonHearts = storage.getUser().hearts;

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  // ===== 5. عرض الصفحة الرئيسية =====
  renderHome() {
    const container = document.getElementById('units-container');
    const user = storage.getUser();
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
      container.innerHTML += '<p style="text-align:center; color:#9aa8b0; margin-top:20px;">قريباً...</p>';
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
        lessonsContainer.appendChild(node);
      });

      const quizUnlocked = isUnitUnlocked && allLessonsDone;
      const quizNode = document.createElement('div');
      quizNode.className = 'lesson-node project' + (quizDone ? ' completed' : '') + (!quizUnlocked ? ' locked' : '');
      quizNode.textContent = quizDone ? '✓' : '📝';
      quizNode.title = 'اختبار الوحدة - ' + unit.title;
      if (quizUnlocked) quizNode.onclick = () => this.startUnitQuiz(unit.id);
      lessonsContainer.appendChild(quizNode);
    });
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  },

  // ===== 6. بدء الدروس والاختبارات =====
  startLesson(unitId, lessonId) {
    const user = storage.getUser();
    if (user.hearts <= 0) { alert('مفيش قلوب!'); return; }
    const unit = this.state.units.find(u => u.id === unitId);
    const lesson = unit.lessons.find(l => l.id === lessonId);

    this.state.currentLesson = lesson;
    this.state.currentUnitId = unitId;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;
    this.state.totalCount = lesson.exercises.length;
    this.state.selectedAnswer = null;
    this.state.lessonHearts = user.hearts;
    this.state.isQuiz = false;
    this.state.isReplay = user.completedLessons.includes(lessonId);
    this.state.isMistakesReview = false;
    this.state.lessonMistakes = 0;
    this.state.currentExercises = lesson.exercises;

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
    this.showExplanation(lesson, unit);
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
    this.state.isReplay = user.completedProjects.includes(unitId + '-quiz');
    this.state.isMistakesReview = false;
    this.state.lessonMistakes = 0;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;
    this.state.totalCount = quizExercises.length;
    this.state.selectedAnswer = null;
    this.state.lessonHearts = user.hearts;

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  showExplanation(lesson, unit) {
    this.showScreen('explanation-screen');
    document.getElementById('explanation-icon').textContent = unit.icon || '📖';
    document.getElementById('explanation-title').textContent = lesson.title;
    const contentEl = document.getElementById('explanation-content');
    contentEl.innerHTML = lesson.lessonExplanation || '<h2>استعد!</h2>';

    const tipEl = document.getElementById('explanation-tip');
    if (lesson.lessonTip) {
      document.getElementById('explanation-tip-text').textContent = lesson.lessonTip;
      tipEl.style.display = 'flex';
    } else tipEl.style.display = 'none';
  },

  startExercises() {
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  closeExplanation() {
    if (confirm('متأكد إنك عايز تخرج؟')) { this.showScreen('home-screen'); this.renderHome(); }
  },

  // ===== 7. عرض التمرين والتحقق (مع دعم كتابة الكود) =====
  renderExercise() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    this.state.selectedAnswer = null;
    const progress = ((this.state.currentExerciseIndex) / this.state.totalCount) * 100;
    document.getElementById('lesson-progress').style.width = progress + '%';
    document.getElementById('question-text').textContent = exercise.question;

    const extra = document.getElementById('question-extra');
    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = '';
    extra.innerHTML = '';

    if (exercise.code) {
      extra.textContent = exercise.code;
      extra.style.display = 'block';
    } else {
      extra.style.display = 'none';
    }

    const checkBtn = document.getElementById('check-btn');
    const feedback = document.getElementById('feedback-area');
    feedback.className = 'feedback-area';
    feedback.textContent = '';
    checkBtn.textContent = 'تحقق';
    checkBtn.disabled = true;

    // ✅ السؤال التفاعلي (كتابة كود)
    if (exercise.type === 'write_code') {
      const textarea = document.createElement('textarea');
      textarea.id = 'code-input';
      textarea.className = 'code-textarea';
      textarea.placeholder = 'اكتب الكود هنا...';
      textarea.value = exercise.starterCode || '';
      textarea.style.width = '100%';
      textarea.style.height = '150px';
      textarea.style.background = '#1e2b32';
      textarea.style.color = '#fff';
      textarea.style.padding = '15px';
      textarea.style.borderRadius = '12px';
      textarea.style.fontFamily = 'monospace';
      textarea.style.fontSize = '16px';
      textarea.style.border = '2px solid #2e4049';
      answersContainer.appendChild(textarea);

      checkBtn.disabled = false;
      checkBtn.onclick = () => this.checkCodeAnswer(exercise);
    } else {
      // ✅ الأسئلة العادية (اختيار من متعدد / إكمال)
      if (exercise.type === 'multiple_choice') {
        exercise.options.forEach((opt, idx) => {
          const btn = document.createElement('button');
          btn.className = 'answer-btn';
          btn.textContent = opt;
          btn.onclick = () => this.selectAnswer(idx, btn);
          answersContainer.appendChild(btn);
        });
      } else {
        const bank = exercise.bank || this.generateBank(exercise.correctAnswer);
        bank.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'answer-btn';
          btn.textContent = opt;
          btn.onclick = () => this.selectAnswer(opt, btn);
          answersContainer.appendChild(btn);
        });
      }
      checkBtn.onclick = () => this.checkAnswer();
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
    document.getElementById('check-btn').disabled = false;
  },

  async checkCodeAnswer(exercise) {
    const code = document.getElementById('code-input').value;
    const checkBtn = document.getElementById('check-btn');
    const feedback = document.getElementById('feedback-area');

    checkBtn.disabled = true;
    checkBtn.textContent = 'جاري التشغيل...';

    try {
      // استخدام Pyodide اللي موجود في المشروع
      const result = await runPython(code, exercise.testInput || '');
      let output = (result.output || '').trim();

      if (result.success && output === exercise.expectedOutput) {
        if (typeof sounds !== 'undefined') sounds.playCorrect();
        this.state.correctCount++;
        feedback.textContent = '✅ عاش! الكود شغال صح.';
        feedback.className = 'feedback-area show correct';
        storage.removeMistake(exercise.question);
      } else {
        if (typeof sounds !== 'undefined') sounds.playWrong();
        this.state.lessonHearts--;
        storage.loseHeart();
        storage.addMistake(exercise);
        feedback.textContent = '❌ الكود مش مظبوط. الناتج كان: ' + (output || 'فاضي') + ' | المتوقع: ' + exercise.expectedOutput;
        feedback.className = 'feedback-area show wrong';
        document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;

        if (!this.state.isReplay && !this.state.isQuiz) {
          this.state.lessonMistakes++;
          storage.resetStreak();
        }
      }
      this.updateHeaderStats();
      checkBtn.textContent = 'متابعة';
      checkBtn.disabled = false;
      checkBtn.onclick = () => this.nextExercise();

    } catch (error) {
      feedback.textContent = '❌ خطأ في التشغيل: ' + error.message;
      feedback.className = 'feedback-area show wrong';
      checkBtn.textContent = 'تحقق';
      checkBtn.disabled = false;
    }
  },

  checkAnswer() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    let isCorrect = this.state.selectedAnswer === exercise.correctAnswer;
    const feedback = document.getElementById('feedback-area');
    const checkBtn = document.getElementById('check-btn');

    if (isCorrect) {
      if (typeof sounds !== 'undefined') sounds.playCorrect();
      this.state.correctCount++;
      storage.removeMistake(exercise.question);
      feedback.textContent = '✅ صح! ' + (exercise.explanation || '');
      feedback.className = 'feedback-area show correct';
      if (!this.state.isReplay && !this.state.isQuiz) storage.addXP(10);
      this.updateHeaderStats();
    } else {
      if (typeof sounds !== 'undefined') sounds.playWrong();
      this.state.lessonHearts--;
      storage.loseHeart();
      storage.addMistake(exercise);
      document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;

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
      feedback.textContent = '❌ غلط. الإجابة الصح: ' + (exercise.type === 'multiple_choice' ? exercise.options[exercise.correctAnswer] : exercise.correctAnswer);
      feedback.className = 'feedback-area show wrong';
    }

    checkBtn.textContent = 'متابعة';
    checkBtn.disabled = false;
    checkBtn.onclick = () => this.nextExercise();
  },

  nextExercise() {
    if (this.state.lessonHearts <= 0) {
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

  // ===== 8. إكمال الدروس والاختبارات =====
  completeLesson() {
    const lesson = this.state.currentLesson;
    if (typeof sounds !== 'undefined') sounds.playComplete();
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    let xpToAdd = lesson.xpReward || 20;

    if (!this.state.isReplay) {
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

      document.getElementById('complete-xp').textContent = '+' + xpToAdd;
      document.getElementById('complete-message').textContent = this.state.lessonMistakes === 0
        ? 'درس كامل بدون أخطاء! 🔥'
        : 'عندك أخطاء، الستريك صفر!';
    } else {
      document.getElementById('complete-xp').textContent = '+0';
      document.getElementById('complete-message').textContent = 'مراجعة ممتازة! 🌟';
    }

    this.updateHeaderStats();
    if (typeof achievementsModule !== 'undefined') achievementsModule.checkAndNotify();
    document.getElementById('complete-accuracy').textContent = accuracy + '%';
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeQuiz() {
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    const passed = accuracy >= 70;
    if (typeof sounds !== 'undefined') sounds.playComplete();

    let xpReward = 0, gemReward = 0;
    if (passed) {
      storage.markProjectComplete(this.state.quizUnitId + '-quiz');
      if (!this.state.isReplay) { xpReward = 30; gemReward = 10; }
    } else {
      if (!this.state.isReplay) { xpReward = 10; gemReward = 5; }
    }

    if (xpReward > 0) storage.addXP(xpReward);
    if (gemReward > 0) storage.addGems(gemReward);

    this.updateHeaderStats();
    document.getElementById('complete-xp').textContent = '+' + xpReward;
    document.getElementById('complete-accuracy').textContent = accuracy + '%';
    document.getElementById('complete-message').textContent = passed ? '🎉 نجحت!' : 'حاول تاني!';
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeMistakesReview() {
    this.updateHeaderStats();
    document.getElementById('complete-xp').textContent = '+0';
    document.getElementById('complete-accuracy').textContent = '100%';
    document.getElementById('complete-message').textContent = 'خلصت مراجعة أخطائك! 🌟';
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

  // ===== 9. المتجر والإنجازات والترتيب =====
  openShop() { this.renderShop(); this.showScreen('shop-screen'); },
  closeShop() { this.showScreen('home-screen'); this.renderHome(); },
  renderShop() {
    const user = storage.getUser();
    document.getElementById('shop-gems').textContent = user.gems;
    document.getElementById('shop-hearts').textContent = user.hearts;
  },
  buyHearts() {
    const res = storage.buyHearts(1, 50);
    if (res.success) { this.updateHeaderStats(); this.renderShop(); this.showToast('✅ تم الشراء', 'success'); }
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
    document.getElementById('achievements-count').textContent = unlocked.length + ' / ' + achievementsModule.list.length;
  },

  openLeaderboard() { this.showScreen('leaderboard-screen'); this.loadLeaderboard(); },
  closeLeaderboard() { this.showScreen('home-screen'); this.renderHome(); },
  async loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    if (typeof firestoreModule === 'undefined' || !firestoreModule.db) {
      container.innerHTML = '<p style="text-align:center; color:#fff;">⚠️ Firestore مش جاهز</p>';
      return;
    }
    try {
      const users = await firestoreModule.getLeaderboard(20);
      container.innerHTML = '';
      users.forEach((u, i) => {
        container.innerHTML += `<div class="leaderboard-item">
          <div class="leaderboard-rank">#${i + 1}</div>
          <div class="leaderboard-name">${u.displayName || 'مستخدم'}</div>
          <div class="leaderboard-xp">${u.xp || 0} ⚡</div>
        </div>`;
      });
    } catch (e) { container.innerHTML = 'خطأ في التحميل'; }
  },

  showToast(msg, type) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show ' + (type || 'success');
    setTimeout(() => toast.className = 'toast', 2500);
  }
};

window.addEventListener('DOMContentLoaded', () => { app.init(); });