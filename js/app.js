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
    currentProject: null,
    monacoEditor: null,
    pendingAction: null,
    currentExercises: [],
    isQuiz: false,
    lessonMistakes: 0,
    quizUnitId: null,
    isReplay: false
  },

  // ✅ الأقسام الجديدة (تقدر تغير الأسماء والإيموجي زي ما تحب)
  sections: [
    { id: 'basics', title: 'القسم 1: أساسيات بايثون', icon: '🐍', units: ['unit1', 'unit2', 'unit3', 'unit4', 'unit5'] },
    { id: 'data_structures', title: 'القسم 2: هياكل البيانات', icon: '📊', units: ['unit6', 'unit7', 'unit8', 'unit9', 'unit10'] },
    { id: 'oop', title: 'القسم 3: البرمجة الكائنية', icon: '🏗️', units: ['unit11', 'unit12', 'unit13', 'unit14', 'unit15'] },
    { id: 'web', title: 'القسم 4: تطوير الويب', icon: '🌐', units: ['unit16', 'unit17', 'unit18', 'unit19', 'unit20'] },
    { id: 'data_science', title: 'القسم 5: تحليل البيانات', icon: '📈', units: ['unit21', 'unit22', 'unit23', 'unit24', 'unit25'] },
    { id: 'ai', title: 'القسم 6: الذكاء الاصطناعي', icon: '🤖', units: ['unit26', 'unit27', 'unit28', 'unit29', 'unit30'] }
  ],

  heartsTimer: null,
  _syncTimeout: null,
  _prevStats: null,

  async loadUnits() {
    try {
      console.log('📚 Loading units from JSON...');
      const units = [];
      // رفعنا الرقم لـ 30 عشان نقرأ الوحدات الجديدة
      for (let i = 1; i <= 30; i++) {
        const response = await fetch('data/unit' + i + '.json');
        if (!response.ok) continue;
        const unit = await response.json();
        units.push(unit);
      }
      this.state.units = units;
      console.log('✅ Loaded ' + units.length + ' units');
      return units;
    } catch (error) {
      console.error('❌ Error loading units:', error);
      return [];
    }
  },

  async init() {
    console.log('🚀 PyLingo starting...');
    await this.loadUnits();

    if (this.state.units.length === 0) {
      document.getElementById('units-container').innerHTML =
        '<p style="text-align:center; color:red;">❌ مفيش دروس</p>';
      return;
    }

    this.renderHome();
    this.updateHeaderStats();
    authModule.init();

    setTimeout(() => {
      if (typeof firestoreModule !== 'undefined' && !firestoreModule.db) {
        console.log('⚡ Fallback: initializing Firestore...');
        firestoreModule.init();
      }
    }, 1500);

    this.startHeartsTimer();
  },

  updateHeaderStats() {
    const user = storage.getUser();
    const prevUser = this._prevStats || {};

    const lessonStreak = user.lessonStreak || 0;
    const streakEl = document.getElementById('streak-value');
    if (streakEl && streakEl.textContent !== String(lessonStreak)) {
      streakEl.textContent = lessonStreak;
      if (lessonStreak > (prevUser.lessonStreak || 0)) {
        this.pulseElement(streakEl);
      }
    }

    const gemsEl = document.getElementById('gems-value');
    if (gemsEl && gemsEl.textContent !== String(user.gems)) {
      gemsEl.textContent = user.gems;
      if (user.gems > (prevUser.gems || 0)) {
        this.pulseElement(gemsEl);
      }
    }

    const heartsEl = document.getElementById('hearts-value');
    if (heartsEl && heartsEl.textContent !== String(user.hearts)) {
      heartsEl.textContent = user.hearts;
      if (user.hearts < (prevUser.hearts || 5)) {
        this.shakeElement(heartsEl);
      }
    }

    const xpEl = document.getElementById('xp-value');
    if (xpEl && xpEl.textContent !== String(user.xp)) {
      xpEl.textContent = user.xp;
      if (user.xp > (prevUser.xp || 0)) {
        this.pulseElement(xpEl);
      }
    }

    this._prevStats = {
      lessonStreak: user.lessonStreak || 0,
      gems: user.gems,
      hearts: user.hearts,
      xp: user.xp
    };

    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = setTimeout(() => {
        firestoreModule.saveToFirestore();
      }, 3000);
    }
  },

  pulseElement(el) {
    if (!el) return;
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 600);
  },

  shakeElement(el) {
    if (!el) return;
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 600);
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

  startHeartsTimer() {
    if (this.heartsTimer) clearInterval(this.heartsTimer);

    this.heartsTimer = setInterval(() => {
      const user = storage.getUser();
      const info = storage.getHeartsInfo();

      document.getElementById('hearts-value').textContent = user.hearts;
      document.getElementById('gems-value').textContent = user.gems;

      const shopTimer = document.getElementById('heart-timer');
      if (shopTimer) {
        if (user.hearts >= storage.MAX_HEARTS) {
          shopTimer.textContent = 'كاملة ❤️';
        } else {
          shopTimer.textContent = this.formatTime(info.nextHeartIn);
        }
      }

      const lessonHearts = document.getElementById('lesson-hearts');
      if (lessonHearts) lessonHearts.textContent = user.hearts;

      const shopHearts = document.getElementById('shop-hearts');
      const shopGems = document.getElementById('shop-gems');
      if (shopHearts) shopHearts.textContent = user.hearts;
      if (shopGems) shopGems.textContent = user.gems;
    }, 1000);
  },

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + seconds.toString().padStart(2, '0');
  },

  renderHome() {
    const container = document.getElementById('units-container');
    const user = storage.getUser();
    container.innerHTML = '';

    // تجهيز قائمة مسطحة بكل الوحدات اللي موجودة عشان نظام القفل يشتغل صح
    let allUnitsFlattened = [];
    this.sections.forEach(sec => {
      sec.units.forEach(uid => {
        const u = this.state.units.find(x => x.id === uid);
        if (u) allUnitsFlattened.push(u);
      });
    });

    // لوب على الأقسام
    this.sections.forEach((section) => {
      const sectionUnits = section.units.map(uid => this.state.units.find(u => u.id === uid)).filter(Boolean);
            // لو مفيش ملفات للقسم ده، نعرضه بس نقول قريباً
      if (sectionUnits.length === 0) {
        const emptyDivider = document.createElement('div');
        emptyDivider.className = 'section-divider';
        emptyDivider.innerHTML = `<span class="section-icon">${section.icon}</span><h2>${section.title}</h2>`;
        container.appendChild(emptyDivider);
        
        const emptyMsg = document.createElement('div');
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '20px';
        emptyMsg.style.color = '#9aa8b0';
        emptyMsg.textContent = 'قريباً... (الوحدات دي لسه هتنزل)';
        container.appendChild(emptyMsg);
        return;
      }

      // 1. عرض فاصل القسم (Section Divider)
      const divider = document.createElement('div');
      divider.className = 'section-divider';
      divider.innerHTML = `<span class="section-icon">${section.icon}</span><h2>${section.title}</h2>`;
      container.appendChild(divider);

      // 2. عرض وحدات القسم
      sectionUnits.forEach((unit) => {
        const unitIndex = allUnitsFlattened.findIndex(u => u.id === unit.id);
        
        let isUnitUnlocked = true;
        if (unitIndex > 0) {
          const prevUnit = allUnitsFlattened[unitIndex - 1];
          const allPrevLessonsDone = prevUnit.lessons.every(l => user.completedLessons.includes(l.id));
          const prevQuizDone = user.completedProjects.includes(prevUnit.id + '-quiz');
          isUnitUnlocked = allPrevLessonsDone && prevQuizDone;
        }

        const unitEl = document.createElement('div');
        unitEl.className = 'unit';

        const allLessonsDone = unit.lessons.every(l => user.completedLessons.includes(l.id));
        const quizDone = user.completedProjects.includes(unit.id + '-quiz');

        unitEl.innerHTML =
          '<div class="unit-header">' +
          '<div class="unit-icon">' + unit.icon + '</div>' +
          '<div class="unit-info">' +
          '<h3>' + unit.title + '</h3>' +
          '<p>' + unit.description + '</p>' +
          '</div>' +
          '</div>' +
          '<div class="unit-lessons" id="unit-' + unit.id + '-lessons"></div>';

        container.appendChild(unitEl);

        const lessonsContainer = document.getElementById('unit-' + unit.id + '-lessons');

        unit.lessons.forEach((lesson, idx) => {
          const isCompleted = user.completedLessons.includes(lesson.id);
          const prevLesson = idx > 0 ? unit.lessons[idx - 1] : null;
          const isUnlocked = isUnitUnlocked && (!prevLesson || user.completedLessons.includes(prevLesson.id));

          const node = document.createElement('div');
          node.className = 'lesson-node';
          if (isCompleted) node.classList.add('completed');
          if (!isUnlocked) node.classList.add('locked');

          node.textContent = isCompleted ? '✓' : (idx + 1);
          node.title = lesson.title;

          if (isUnlocked) {
            node.onclick = () => this.startLesson(unit.id, lesson.id);
          }

          lessonsContainer.appendChild(node);
        });

        // اختبار الوحدة
        const quizUnlocked = isUnitUnlocked && allLessonsDone;
        const quizNode = document.createElement('div');
        quizNode.className = 'lesson-node project';
        if (quizDone) quizNode.classList.add('completed');
        if (!quizUnlocked) quizNode.classList.add('locked');

        quizNode.textContent = quizDone ? '✓' : '📝';
        quizNode.title = 'اختبار الوحدة - ' + unit.title;

        if (quizUnlocked) {
          quizNode.onclick = () => this.startUnitQuiz(unit.id);
        }

        lessonsContainer.appendChild(quizNode);
      });
    });
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  },

  startLesson(unitId, lessonId) {
    const user = storage.getUser();

    if (user.hearts <= 0) {
      sounds.playWrong();
      alert('مفيش قلوب! استنى شوية أو اشتري من المتجر.');
      return;
    }

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
    this.state.lessonMistakes = 0;
    this.state.currentExercises = lesson.exercises;
    this.state.isReplay = user.completedLessons.includes(lessonId);

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
    this.showExplanation(lesson, unit);
  },

  startUnitQuiz(unitId) {
    const user = storage.getUser();

    if (user.hearts <= 0) {
      sounds.playWrong();
      alert('مفيش قلوب! استنى شوية أو اشتري من المتجر.');
      return;
    }

    const unit = this.state.units.find(u => u.id === unitId);
    if (!unit) return;

    let allExercises = [];
    unit.lessons.forEach(lesson => {
      if (lesson.exercises && lesson.exercises.length) {
        allExercises = allExercises.concat(lesson.exercises);
      }
    });

    if (allExercises.length === 0) {
      alert('لا توجد أسئلة في هذه الوحدة');
      return;
    }

    for (let i = allExercises.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allExercises[i], allExercises[j]] = [allExercises[j], allExercises[i]];
    }

    const quizCount = Math.min(10, allExercises.length);
    const quizExercises = allExercises.slice(0, quizCount);

    this.state.currentLesson = null;
    this.state.currentUnitId = unitId;
    this.state.quizUnitId = unitId;
    this.state.currentExercises = quizExercises;
    this.state.isQuiz = true;
    this.state.lessonMistakes = 0;
    this.state.currentExerciseIndex = 0;
    this.state.correctCount = 0;
    this.state.totalCount = quizExercises.length;
    this.state.selectedAnswer = null;
    this.state.lessonHearts = user.hearts;
    this.state.isReplay = user.completedProjects.includes(unitId + '-quiz');

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  showExplanation(lesson, unit) {
    this.showScreen('explanation-screen');
    sounds.playClick();

    document.getElementById('explanation-icon').textContent = unit.icon || '📖';
    document.getElementById('explanation-title').textContent = lesson.title;

    const contentEl = document.getElementById('explanation-content');

    if (lesson.lessonExplanation) {
      contentEl.innerHTML = lesson.lessonExplanation;
    } else {
      contentEl.innerHTML =
        '<div class="explanation-placeholder">' +
        '<div style="font-size: 60px; margin-bottom: 20px;">📚</div>' +
        '<h2>استعد للأسئلة!</h2>' +
        '<p>هذا الدرس عبارة عن ' + lesson.exercises.length + ' سؤال تفاعلي.</p>' +
        '<p>اقرأ السؤال بتركيز واختار الإجابة الصح.</p>' +
        '<p style="color: var(--primary); font-weight: 800; margin-top: 20px;">بالتوفيق! 💪</p>' +
        '</div>';
    }

    const tipEl = document.getElementById('explanation-tip');
    const tipTextEl = document.getElementById('explanation-tip-text');

    if (lesson.lessonTip) {
      tipTextEl.textContent = lesson.lessonTip;
      tipEl.style.display = 'flex';
    } else {
      tipEl.style.display = 'none';
    }
  },

  startExercises() {
    sounds.playClick();
    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  closeExplanation() {
    if (confirm('متأكد إنك عايز تخرج؟')) {
      this.showScreen('home-screen');
      this.renderHome();
    }
  },

  renderExercise() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    this.state.selectedAnswer = null;

    const progress = ((this.state.currentExerciseIndex) / this.state.totalCount) * 100;
    document.getElementById('lesson-progress').style.width = progress + '%';

    document.getElementById('question-text').textContent = exercise.question;

    const extra = document.getElementById('question-extra');
    if (exercise.code) {
      extra.textContent = exercise.code;
      extra.style.display = 'block';
    } else {
      extra.textContent = '';
      extra.style.display = 'none';
    }

    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = '';

    if (exercise.type === 'multiple_choice') {
      exercise.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.onclick = () => this.selectAnswer(idx, btn);
        answersContainer.appendChild(btn);
      });
    } else if (exercise.type === 'fill_blank' || exercise.type === 'predict_output') {
      const bank = exercise.bank || this.generateBank(exercise.correctAnswer);
      bank.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.onclick = () => this.selectAnswer(opt, btn);
        answersContainer.appendChild(btn);
      });
    }

    document.getElementById('feedback-area').className = 'feedback-area';
    document.getElementById('feedback-area').textContent = '';
    const checkBtn = document.getElementById('check-btn');
    checkBtn.textContent = 'تحقق';
    checkBtn.disabled = true;
    checkBtn.onclick = () => this.checkAnswer();
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
    sounds.playSelect();
  },

  checkAnswer() {
    const exercise = this.state.currentExercises[this.state.currentExerciseIndex];
    let isCorrect = this.state.selectedAnswer === exercise.correctAnswer;

    const feedback = document.getElementById('feedback-area');
    const checkBtn = document.getElementById('check-btn');

    if (isCorrect) {
      sounds.playCorrect();
      this.state.correctCount++;
      feedback.textContent = '✅ صح! ' + (exercise.explanation || '');
      feedback.className = 'feedback-area show correct';
      checkBtn.textContent = 'متابعة';
      checkBtn.onclick = () => this.nextExercise();

      if (!this.state.isReplay && !this.state.isQuiz) {
        storage.addXP(10);
      }
      this.updateHeaderStats();
    } else {
      sounds.playWrong();
      this.state.lessonHearts--;
      storage.loseHeart();
      document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;

      if (!this.state.isQuiz && !this.state.isReplay) {
        this.state.lessonMistakes++;
        const user = storage.getUser();
        
        if ((user.lessonStreak || 0) > 0) {
          if ((user.streakFreezes || 0) > 0) {
            user.streakFreezes--;
            storage.setUser(user);
            this.showToast('❄️ تم استخدام تجميد السلسلة! ستريكك بأمان.', 'success');
          } else {
            storage.resetStreak();
            this.showToast('💔 غلطت، رجع الستريك صفر!', 'error');
          }
        }
      }

      this.updateHeaderStats();
      feedback.textContent = '❌ غلط. الإجابة الصح: ' +
        (exercise.type === 'multiple_choice' ? exercise.options[exercise.correctAnswer] : exercise.correctAnswer);
      feedback.className = 'feedback-area show wrong';
      checkBtn.textContent = 'فهمت';
      checkBtn.onclick = () => this.nextExercise();
    }

    checkBtn.disabled = false;
  },

  nextExercise() {
    if (this.state.lessonHearts <= 0) {
      sounds.playHeartLost();
      alert('خلصت القلوب! هترجع تلقائياً أو اشتري من المتجر.');
      this.closeLesson();
      return;
    }

    this.state.currentExerciseIndex++;

    if (this.state.currentExerciseIndex >= this.state.totalCount) {
      if (this.state.isQuiz) {
        this.completeQuiz();
      } else {
        this.completeLesson();
      }
    } else {
      this.renderExercise();
    }
  },

  completeLesson() {
    const lesson = this.state.currentLesson;
    sounds.playComplete();
    
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    let xpToAdd = lesson.xpReward || 20;

    if (!this.state.isReplay) {
      storage.markLessonComplete(lesson.id);
      const user = storage.getUser();
      if (user.doubleXPActive) {
        xpToAdd *= 2;
        user.doubleXPActive = false;
        storage.setUser(user);
        this.showToast('⚡ تم استخدام XP المضاعف!', 'success');
      }
      storage.addXP(xpToAdd);
      storage.addGems(5);

      if (this.state.lessonMistakes === 0) {
        storage.incrementStreak();
      }

      document.getElementById('complete-xp').textContent = '+' + xpToAdd;
      document.getElementById('complete-message').textContent = this.state.lessonMistakes === 0
        ? 'درس كامل بدون أخطاء! 🔥 الستريك +1 (+5 💎)'
        : 'أكملت الدرس، بس عندك ' + this.state.lessonMistakes + ' غلط. الستريك صفر (+5 💎)';
    } else {
      document.getElementById('complete-xp').textContent = '+0';
      document.getElementById('complete-message').textContent = 'مراجعة ممتازة! 🌟 (مفيش مكافآت إضافية)';
    }

    this.updateHeaderStats();
    achievementsModule.checkAndNotify();
    document.getElementById('complete-accuracy').textContent = accuracy + '%';

    this.state.pendingAction = { type: 'lesson' };
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  completeQuiz() {
    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    const passed = accuracy >= 70;

    sounds.playComplete();

    let xpReward = 0;
    let gemReward = 0;

    if (passed) {
      storage.markProjectComplete(this.state.quizUnitId + '-quiz');
      if (!this.state.isReplay) {
        xpReward = 30;
        gemReward = 10;
      }
    } else {
      if (!this.state.isReplay) {
        xpReward = 10;
        gemReward = 5;
      }
    }

    if (xpReward > 0) storage.addXP(xpReward);
    if (gemReward > 0) storage.addGems(gemReward);

    this.updateHeaderStats();
    achievementsModule.checkAndNotify();

    document.getElementById('complete-xp').textContent = '+' + xpReward;
    document.getElementById('complete-accuracy').textContent = accuracy + '%';
    
    if (this.state.isReplay) {
      document.getElementById('complete-message').textContent = passed
        ? 'مراجعة ممتازة للاختبار! 🌟 (مفيش مكافآت إضافية)'
        : 'محتاج 70% على الأقل للنجاح. حاول تاني!';
    } else {
      document.getElementById('complete-message').textContent = passed
        ? '🎉 نجحت في اختبار الوحدة! (+10 💎)'
        : 'محتاج 70% على الأقل للنجاح. حاول تاني! (+5 💎)';
    }

    this.state.pendingAction = { type: 'quiz' };
    this.showScreen('complete-screen');
    this.showConfetti();
  },

  continueFromComplete() {
    this.state.pendingAction = null;
    this.showScreen('home-screen');
    this.renderHome();
  },

  closeLesson() {
    if (confirm('متأكد إنك عايز تخرج؟ هتخسر تقدم الدرس.')) {
      this.showScreen('home-screen');
      this.renderHome();
    }
  },

  openShop() {
    this.renderShop();
    this.showScreen('shop-screen');
    sounds.playClick();
  },

  closeShop() {
    this.showScreen('home-screen');
    this.renderHome();
  },

  renderShop() {
    const user = storage.getUser();
    const heartsInfo = storage.getHeartsInfo();

    document.getElementById('shop-gems').textContent = user.gems;
    document.getElementById('shop-hearts').textContent = user.hearts;

    const timerEl = document.getElementById('heart-timer');
    if (timerEl) {
      if (user.hearts >= storage.MAX_HEARTS) {
        timerEl.textContent = 'كاملة ❤️';
      } else {
        timerEl.textContent = this.formatTime(heartsInfo.nextHeartIn);
      }
    }
  },

  buyHearts() {
    const result = storage.buyHearts(1, 50);
    if (result.success) {
      sounds.playLevelUp();
      this.updateHeaderStats();
      this.renderShop();
      this.showToast('✅ تم شراء قلب!', 'success');
    } else {
      sounds.playWrong();
      this.showToast('❌ ' + result.error, 'error');
    }
  },

  buyStreakFreeze() {
    const user = storage.getUser();
    if (user.gems < 200) {
      sounds.playWrong();
      this.showToast('❌ مش معاك جواهر كفاية!', 'error');
      return;
    }
    user.gems -= 200;
    user.streakFreezes = (user.streakFreezes || 0) + 1;
    storage.setUser(user);
    
    sounds.playLevelUp();
    this.updateHeaderStats();
    this.renderShop();
    this.showToast('✅ تم شراء تجميد السلسلة!', 'success');
  },

  buyDoubleXP() {
    const user = storage.getUser();
    if (user.gems < 100) {
      sounds.playWrong();
      this.showToast('❌ مش معاك جواهر كفاية!', 'error');
      return;
    }
    user.gems -= 100;
    user.doubleXPActive = true;
    storage.setUser(user);
    
    sounds.playLevelUp();
    this.updateHeaderStats();
    this.renderShop();
    this.showToast('✅ تم شراء XP مضاعف للدرس القادم!', 'success');
  },

  openAchievements() {
    this.renderAchievements();
    this.showScreen('achievements-screen');
    sounds.playClick();
  },

  closeAchievements() {
    this.showScreen('home-screen');
    this.renderHome();
  },

  renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;

    const unlocked = achievementsModule.getUnlocked();
    container.innerHTML = '';

    achievementsModule.list.forEach(ach => {
      const isUnlocked = unlocked.includes(ach.id);
      const card = document.createElement('div');
      card.className = 'achievement-card' + (isUnlocked ? ' unlocked' : ' locked');
      card.innerHTML =
        '<div class="achievement-icon">' + (isUnlocked ? ach.icon : '🔒') + '</div>' +
        '<div class="achievement-info">' +
        '<h3>' + ach.title + '</h3>' +
        '<p>' + ach.description + '</p>' +
        '</div>' +
        (isUnlocked ? '<div class="achievement-check">✓</div>' : '');
      container.appendChild(card);
    });

    const countEl = document.getElementById('achievements-count');
    if (countEl) {
      countEl.textContent = unlocked.length + ' / ' + achievementsModule.list.length;
    }
  },

  async openLeaderboard() {
    this.showScreen('leaderboard-screen');
    sounds.playClick();
    this.renderLeaderboard();
    await this.loadLeaderboard();
  },

  closeLeaderboard() {
    this.showScreen('home-screen');
    this.renderHome();
  },

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    container.innerHTML = '<div class="leaderboard-loading">⏳ جاري التحميل...</div>';
  },

  async loadLeaderboard() {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    if (typeof firestoreModule === 'undefined' || !firestoreModule.db) {
      container.innerHTML = '<div class="leaderboard-empty">⚠️ Firestore مش جاهز</div>';
      return;
    }

    try {
      const users = await firestoreModule.getLeaderboard(20);
      const myRank = await firestoreModule.getMyRank();

      if (users.length === 0) {
        container.innerHTML = '<div class="leaderboard-empty">مفيش مستخدمين بعد</div>';
        return;
      }

      container.innerHTML = '';
      const myRankEl = document.getElementById('my-rank');
      if (myRankEl && myRank) {
        myRankEl.textContent = '#' + myRank;
      }

      users.forEach((user, index) => {
        const rank = index + 1;
        let rankIcon = '#' + rank;
        if (rank === 1) rankIcon = '🥇';
        else if (rank === 2) rankIcon = '🥈';
        else if (rank === 3) rankIcon = '🥉';

        const isMe = firestoreModule.currentUser && user.uid === firestoreModule.currentUser.uid;
        const item = document.createElement('div');
        item.className = 'leaderboard-item' + (isMe ? ' is-me' : '');
        item.innerHTML =
          '<div class="leaderboard-rank">' + rankIcon + '</div>' +
          '<img class="leaderboard-avatar" src="' + (user.photoURL || 'https://via.placeholder.com/40') + '" alt="" />' +
          '<div class="leaderboard-name">' + (user.displayName || 'مستخدم') + (isMe ? ' (أنت)' : '') + '</div>' +
          '<div class="leaderboard-xp">' + (user.xp || 0) + ' ⚡</div>';
        container.appendChild(item);
      });
    } catch (error) {
      console.error('❌ Load leaderboard error:', error);
      container.innerHTML = '<div class="leaderboard-empty">❌ خطأ في التحميل</div>';
    }
  },

  showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => {
      toast.className = 'toast';
    }, 2500);
  },

  resetProgress() {
    if (confirm('مسح كل التقدم؟')) {
      storage.reset();
      localStorage.removeItem('pylingo_achievements');
      this.updateHeaderStats();
      this.renderHome();
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});