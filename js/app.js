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
    currentSectionIndex: 0
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
        promises.push(fetch('data/unit' + i + '.json').then(res => res.ok ? res.json() : null).catch(() => null));
      }
      const results = await Promise.all(promises);
      this.state.units = results.filter(u => u !== null);
      return this.state.units;
    } catch (error) { return []; }
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
          ? `<button class="btn-primary" onclick="app.claimQuest('${q.id}', ${q.reward})" style="padding: 5px 15px; font-size: 14px; width:auto;">استلام 💎${q.reward}</button>` 
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

    container.innerHTML = `<button class="btn-primary" onclick="app.startMistakesReview()" style="margin-bottom:20px;">🚀 ابدأ مراجعة الأخطاء</button>`;
    mistakes.forEach((ex, i) => {
      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `<div class="achievement-icon">🩹</div><div class="achievement-info"><h3>سؤال ${i + 1}</h3><p style="font-size:12px; color:var(--gray-500);">${ex.question.substring(0, 50)}...</p></div>`;
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
        if(lessonsContainer) lessonsContainer.appendChild(node);
      });

      const quizUnlocked = isUnitUnlocked && allLessonsDone;
      const quizNode = document.createElement('div');
      quizNode.className = 'lesson-node project' + (quizDone ? ' completed' : '') + (!quizUnlocked ? ' locked' : '');
      quizNode.textContent = quizDone ? '✓' : '📝';
      quizNode.title = 'اختبار الوحدة - ' + unit.title;
      if (quizUnlocked) quizNode.onclick = () => this.startUnitQuiz(unit.id);
      if(lessonsContainer) lessonsContainer.appendChild(quizNode);
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
    if (!user.completedLessons.includes(lessonId)) {
      exercises.push({
        type: 'write_code',
        question: 'التحدي الأخير: اكتب كود بايثون يطبع جملة (Hello)',
        starterCode: '# اكتب الكود هنا\n',
        expectedOutput: 'Hello',
        testInput: ''
      });
    }

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
    
    if(iconEl) iconEl.textContent = unit.icon || '📖';
    if(titleEl) titleEl.textContent = lesson.title;
    if(contentEl) contentEl.innerHTML = lesson.lessonExplanation || '<h2>استعد!</h2>';
    
    if (lesson.lessonTip && tipEl) {
      const tipTextEl = document.getElementById('explanation-tip-text');
      if(tipTextEl) tipTextEl.textContent = lesson.lessonTip;
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
    
    this.state.selectedAnswer = null;
    const progress = ((this.state.currentExerciseIndex) / this.state.totalCount) * 100;
    const progEl = document.getElementById('lesson-progress');
    if (progEl) progEl.style.width = progress + '%';
    
    const qText = document.getElementById('question-text');
    if(qText) qText.textContent = exercise.question;

    const extra = document.getElementById('question-extra');
    const answersContainer = document.getElementById('answers-container');
    if(answersContainer) answersContainer.innerHTML = '';
    if(extra) extra.innerHTML = '';

    if (exercise.code && extra) {
      extra.textContent = exercise.code;
      extra.style.display = 'block';
    } else if (extra) {
      extra.style.display = 'none';
    }

    const checkBtn = document.getElementById('check-btn');
    const feedback = document.getElementById('feedback-area');
    if(feedback) { feedback.className = 'feedback-area'; feedback.textContent = ''; }
    if(checkBtn) { checkBtn.textContent = 'تحقق'; checkBtn.disabled = true; }

    if (exercise.type === 'write_code') {
      const textarea = document.createElement('textarea');
      textarea.id = 'code-input';
      textarea.className = 'code-textarea';
      textarea.placeholder = 'اكتب الكود هنا...';
      textarea.value = exercise.starterCode || '';
      if(answersContainer) answersContainer.appendChild(textarea);

      if(checkBtn) {
        checkBtn.disabled = false;
        checkBtn.onclick = () => this.checkCodeAnswer(exercise);
      }
    } else {
      if (exercise.type === 'multiple_choice') {
        exercise.options.forEach((opt, idx) => {
          const btn = document.createElement('button');
          btn.className = 'answer-btn';
          btn.textContent = opt;
          btn.onclick = () => this.selectAnswer(idx, btn);
          if(answersContainer) answersContainer.appendChild(btn);
        });
      } else {
        const bank = exercise.bank || this.generateBank(exercise.correctAnswer);
        bank.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'answer-btn';
          btn.textContent = opt;
          btn.onclick = () => this.selectAnswer(opt, btn);
          if(answersContainer) answersContainer.appendChild(btn);
        });
      }
      if(checkBtn) checkBtn.onclick = () => this.checkAnswer();
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

  async checkCodeAnswer(exercise) {
    const codeEl = document.getElementById('code-input');
    if(!codeEl) return;
    const code = codeEl.value;
    
    const checkBtn = document.getElementById('check-btn');
    const feedback = document.getElementById('feedback-area');
    
    if(checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'جاري التشغيل...'; }

    try {
      const result = await runPython(code, exercise.testInput || '');
      let output = (result.output || '').trim();
      
      if (result.success && output === exercise.expectedOutput) {
        if (window.sounds) sounds.playCorrect();
        this.state.correctCount++;
        if(feedback) { feedback.textContent = '✅ عاش! الكود شغال صح.'; feedback.className = 'feedback-area show correct'; }
        storage.removeMistake(exercise.question);
      } else {
        if (window.sounds) sounds.playWrong();
        this.state.lessonHearts--;
        storage.loseHeart();
        storage.addMistake(exercise);
        if(feedback) { feedback.textContent = '❌ الكود مش مظبوط. الناتج كان: ' + (output || 'فاضي'); feedback.className = 'feedback-area show wrong'; }
        const heartsEl = document.getElementById('lesson-hearts');
        if (heartsEl) heartsEl.textContent = this.state.lessonHearts;
        
        if (!this.state.isReplay && !this.state.isQuiz) {
          this.state.lessonMistakes++;
          storage.resetStreak();
        }
      }
      this.updateHeaderStats();
      if(checkBtn) {
        checkBtn.textContent = 'متابعة';
        checkBtn.disabled = false;
        checkBtn.onclick = () => this.nextExercise();
      }
    } catch (error) {
      if(feedback) { feedback.textContent = '❌ خطأ في التشغيل'; feedback.className = 'feedback-area show wrong'; }
      if(checkBtn) { checkBtn.textContent = 'تحقق'; checkBtn.disabled = false; }
    }
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
      if(feedback) { feedback.textContent = '✅ صح! ' + (exercise.explanation || ''); feedback.className = 'feedback-area show correct'; }
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
      if(feedback) { feedback.textContent = '❌ غلط. الإجابة الصح: ' + (exercise.type === 'multiple_choice' ? exercise.options[exercise.correctAnswer] : exercise.correctAnswer); feedback.className = 'feedback-area show wrong'; }
    }

    if(checkBtn) {
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
      const xpEl = document.getElementById('complete-xp');
      const msgEl = document.getElementById('complete-message');
      if(xpEl) xpEl.textContent = '+' + xpToAdd;
      if(msgEl) msgEl.textContent = this.state.lessonMistakes === 0 ? 'درس كامل بدون أخطاء! 🔥' : 'عندك أخطاء، الستريك صفر!';
    } else {
      const xpEl = document.getElementById('complete-xp');
      const msgEl = document.getElementById('complete-message');
      if(xpEl) xpEl.textContent = '+0';
      if(msgEl) msgEl.textContent = 'مراجعة ممتازة! 🌟';
    }

    this.updateHeaderStats();
    if (typeof achievementsModule !== 'undefined') achievementsModule.checkAndNotify();
    const accEl = document.getElementById('complete-accuracy');
    if(accEl) accEl.textContent = accuracy + '%';
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
    if(xpEl) xpEl.textContent = '+' + xpReward;
    if(accEl) accEl.textContent = accuracy + '%';
    if(msgEl) msgEl.textContent = passed ? '🎉 نجحت!' : 'حاول تاني!';
    
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeMistakesReview() {
    this.updateHeaderStats();
    const xpEl = document.getElementById('complete-xp');
    const accEl = document.getElementById('complete-accuracy');
    const msgEl = document.getElementById('complete-message');
    
    if(xpEl) xpEl.textContent = '+0';
    if(accEl) accEl.textContent = '100%';
    if(msgEl) msgEl.textContent = 'خلصت مراجعة أخطائك! 🌟';
    
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
    if(gemsEl) gemsEl.textContent = user.gems;
    if(heartsEl) heartsEl.textContent = user.hearts;
    
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
          <div class="leaderboard-rank">#${i+1}</div>
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
    if (levelEl) levelEl.textContent = storage.getLevel ? storage.getLevel() : Math.floor(user.xp/100)+1;

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