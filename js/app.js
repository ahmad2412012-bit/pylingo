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
    pendingAction: null
  },

  heartsTimer: null,
  _syncTimeout: null,

  async loadUnits() {
    try {
      console.log('📚 Loading units from JSON...');
      const units = [];
      for (let i = 1; i <= 20; i++) {
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

    storage.updateStreak();
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
    document.getElementById('streak-value').textContent = user.streak;
    document.getElementById('gems-value').textContent = user.gems;
    document.getElementById('hearts-value').textContent = user.hearts;
    document.getElementById('xp-value').textContent = user.xp;

    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = setTimeout(() => {
        firestoreModule.saveToFirestore();
      }, 3000);
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

    this.state.units.forEach((unit, unitIndex) => {
      // ✅ الوحدة تفتح فقط لما الوحدة السابقة تخلص بالكامل
      let isUnitUnlocked = true;
      
      if (unitIndex > 0) {
        const prevUnit = this.state.units[unitIndex - 1];
        
        // كل دروس الوحدة السابقة خلصت؟
        const allPrevLessonsDone = prevUnit.lessons.every(l => 
          user.completedLessons.includes(l.id)
        );
        
        // المشروع بتاع الوحدة السابقة خلص (لو موجود)؟
        const prevProjectDone = !prevUnit.project || 
          user.completedProjects.includes(prevUnit.project.id);
        
        isUnitUnlocked = allPrevLessonsDone && prevProjectDone;
      }

      const unitEl = document.createElement('div');
      unitEl.className = 'unit';

      const allLessonsDone = unit.lessons.every(l => user.completedLessons.includes(l.id));
      const projectDone = unit.project ? user.completedProjects.includes(unit.project.id) : true;

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

        if (isUnlocked && !isCompleted) {
          node.onclick = () => this.startLesson(unit.id, lesson.id);
        }

        lessonsContainer.appendChild(node);
      });

      // ✅ افحص لو فيه مشروع
      if (unit.project) {
        const projectUnlocked = isUnitUnlocked && allLessonsDone;
        const projectNode = document.createElement('div');
        projectNode.className = 'lesson-node project';
        if (projectDone) projectNode.classList.add('completed');
        if (!projectUnlocked) projectNode.classList.add('locked');

        projectNode.textContent = projectDone ? '✓' : '🏆';
        projectNode.title = unit.project.title;

        if (projectUnlocked && !projectDone) {
          projectNode.onclick = () => this.startProject(unit.id);
        }

        lessonsContainer.appendChild(projectNode);
      }
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

    // ✅ تأكد إن الوحدة مفتوحة
    const unitIndex = this.state.units.findIndex(u => u.id === unitId);
    if (unitIndex > 0) {
      const prevUnit = this.state.units[unitIndex - 1];
      const allPrevLessonsDone = prevUnit.lessons.every(l => 
        user.completedLessons.includes(l.id)
      );
      const prevProjectDone = !prevUnit.project || 
        user.completedProjects.includes(prevUnit.project.id);
      
      if (!allPrevLessonsDone || !prevProjectDone) {
        sounds.playWrong();
        alert('لازم تخلص الوحدة السابقة الأول!');
        return;
      }
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

    document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;

    this.showScreen('lesson-screen');
    this.renderExercise();
  },

  renderExercise() {
    const exercise = this.state.currentLesson.exercises[this.state.currentExerciseIndex];
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
    const exercise = this.state.currentLesson.exercises[this.state.currentExerciseIndex];
    let isCorrect = false;

    if (exercise.type === 'multiple_choice') {
      isCorrect = this.state.selectedAnswer === exercise.correctAnswer;
    } else {
      isCorrect = this.state.selectedAnswer === exercise.correctAnswer;
    }

    const feedback = document.getElementById('feedback-area');
    const checkBtn = document.getElementById('check-btn');

    if (isCorrect) {
      sounds.playCorrect();
      this.state.correctCount++;
      feedback.textContent = '✅ صح! ' + (exercise.explanation || '');
      feedback.className = 'feedback-area show correct';
      checkBtn.textContent = 'متابعة';
      checkBtn.onclick = () => this.nextExercise();

      storage.addXP(10);
      this.updateHeaderStats();
    } else {
      sounds.playWrong();
      this.state.lessonHearts--;
      storage.loseHeart();
      document.getElementById('lesson-hearts').textContent = this.state.lessonHearts;
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
      this.completeLesson();
    } else {
      this.renderExercise();
    }
  },

  completeLesson() {
    const lesson = this.state.currentLesson;

    sounds.playComplete();

    storage.markLessonComplete(lesson.id);
    storage.addXP(lesson.xpReward || 20);
    storage.addGems(5);
    this.updateHeaderStats();

    achievementsModule.checkAndNotify();

    const accuracy = Math.round((this.state.correctCount / this.state.totalCount) * 100);
    document.getElementById('complete-xp').textContent = '+' + (lesson.xpReward || 20);
    document.getElementById('complete-accuracy').textContent = accuracy + '%';
    document.getElementById('complete-message').textContent = 'أكملت الدرس بنجاح! (+5 💎)';

    this.state.pendingAction = { type: 'lesson' };
    this.showScreen('complete-screen');
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

  async startProject(unitId) {
    const unit = this.state.units.find(u => u.id === unitId);
    if (!unit.project) {
      alert('الوحدة دي مفيش فيها مشروع');
      return;
    }
    const project = unit.project;
    this.state.currentProject = project;
    this.state.currentUnitId = unitId;

    document.getElementById('project-title').textContent = project.title;
    document.getElementById('project-description').textContent = project.description;

    const reqList = document.getElementById('project-requirements');
    reqList.innerHTML = '';
    project.requirements.forEach(req => {
      const li = document.createElement('li');
      li.textContent = req;
      reqList.appendChild(li);
    });

    document.getElementById('output-content').textContent = '';

    this.showScreen('project-screen');
    await this.initMonaco(project.starterCode);
  },

  initMonaco(initialCode) {
    return new Promise((resolve) => {
      require.config({
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
      });

      require(['vs/editor/editor.main'], () => {
        const editorEl = document.getElementById('monaco-editor');
        editorEl.innerHTML = '';

        this.state.monacoEditor = monaco.editor.create(editorEl, {
          value: initialCode,
          language: 'python',
          theme: 'vs-dark',
          fontSize: 15,
          fontFamily: 'JetBrains Mono, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          lineNumbers: 'on'
        });

        resolve();
      });
    });
  },

  async runProjectCode() {
    const code = this.state.monacoEditor.getValue();
    const outputEl = document.getElementById('output-content');
    outputEl.textContent = '⏳ جاري التشغيل...';

    const testCase = this.state.currentProject.testCases[0];
    const result = await runPython(code, testCase.input);

    if (result.success) {
      outputEl.textContent = result.output || '(مفيش output)';
    } else {
      outputEl.textContent = '❌ خطأ:\n' + (result.error || 'خطأ غير معروف');
    }
  },

  async submitProject() {
    const code = this.state.monacoEditor.getValue();
    const project = this.state.currentProject;

    const modal = document.getElementById('project-result-modal');
    const title = document.getElementById('project-result-title');
    const feedbackEl = document.getElementById('project-result-feedback');
    const scoreEl = document.getElementById('project-score-value');

    title.textContent = '⏳ جاري التقييم...';
    feedbackEl.innerHTML = '';
    scoreEl.textContent = '...';
    modal.classList.add('active');

    const result = await evaluateProject(code, project.testCases, project.requiredKeywords);

    if (result.passed) {
      title.textContent = '🎉 مبروك!';
      sounds.playLevelUp();

      storage.markProjectComplete(project.id);
      storage.addXP(project.xpReward);
      storage.addGems(10);
      this.updateHeaderStats();

      setTimeout(() => {
        achievementsModule.checkAndNotify();
      }, 500);

      document.getElementById('project-continue-btn').style.display = 'block';
    } else {
      title.textContent = '❌ لسه محتاج تحاول';
      sounds.playWrong();
      document.getElementById('project-continue-btn').style.display = 'none';
    }

    feedbackEl.innerHTML = '';
    result.feedback.forEach(fb => {
      const div = document.createElement('div');
      div.className = 'feedback-item ' + fb.type;
      div.textContent = fb.text;
      feedbackEl.appendChild(div);
    });

    scoreEl.textContent = result.score;
  },

  closeProjectModal() {
    document.getElementById('project-result-modal').classList.remove('active');
  },

  continueAfterProject() {
    document.getElementById('project-result-modal').classList.remove('active');
    this.showScreen('home-screen');
    this.renderHome();
  },

  closeProject() {
    if (confirm('متأكد إنك عايز تخرج؟ هتخسر تقدم المشروع.')) {
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