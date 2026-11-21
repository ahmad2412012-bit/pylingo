// ============ LocalStorage Wrapper ============

const storage = {
  KEYS: {
    USER: 'pylingo_user',
    PROGRESS: 'pylingo_progress',
    SETTINGS: 'pylingo_settings'
  },

  // ============ Hearts Config ============
  HEART_REGENERATION_TIME: 30 * 60 * 1000, // 30 دقيقة
  MAX_HEARTS: 5,

  // ============ User Data ============
  getUser() {
    const data = localStorage.getItem(this.KEYS.USER);
    if (!data) {
      const defaultUser = {
        xp: 0,
        gems: 150,
        hearts: 5,
        streak: 0,
        lessonStreak: 0,
        lastActive: null,
        lastHeartUpdate: Date.now(),
        completedLessons: [],
        completedProjects: [],
        mistakes: [],
        streakFreezes: 0,
        doubleXPActive: false,
        dailyQuests: null
      };
      this.setUser(defaultUser);
      return defaultUser;
    }
    
    const user = JSON.parse(data);
    
    // ✅ ضمان وجود كل الحقول الجديدة (عشان لو المستخدم عنده بيانات قديمة)
    if (!user.completedLessons) user.completedLessons = [];
    if (!user.completedProjects) user.completedProjects = [];
    if (!user.mistakes) user.mistakes = [];
    if (user.lessonStreak === undefined) user.lessonStreak = 0;
    if (user.streakFreezes === undefined) user.streakFreezes = 0;
    if (user.doubleXPActive === undefined) user.doubleXPActive = false;
    if (user.dailyQuests === undefined) user.dailyQuests = null;
    if (user.hearts === undefined) user.hearts = 5;
    if (user.gems === undefined) user.gems = 0;
    if (user.xp === undefined) user.xp = 0;

    // ✅ Auto recharge hearts
    if (user.hearts < this.MAX_HEARTS) {
      const now = Date.now();
      const lastUpdate = user.lastHeartUpdate || now;
      const timePassed = now - lastUpdate;
      const heartsToAdd = Math.floor(timePassed / this.HEART_REGENERATION_TIME);
      
      if (heartsToAdd > 0) {
        const newHearts = Math.min(this.MAX_HEARTS, user.hearts + heartsToAdd);
        user.hearts = newHearts;
        
        if (newHearts >= this.MAX_HEARTS) {
          user.lastHeartUpdate = now;
        } else {
          user.lastHeartUpdate = lastUpdate + (heartsToAdd * this.HEART_REGENERATION_TIME);
        }
        
        this.setUser(user);
      }
    }
    
    return user;
  },

  setUser(user) {
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  },

  updateUser(updates) {
    const user = this.getUser();
    const updated = { ...user, ...updates };
    this.setUser(updated);
    return updated;
  },

  // ============ Hearts Info ============
  getHeartsInfo() {
    const user = this.getUser();
    
    if (user.hearts >= this.MAX_HEARTS) {
      return { hearts: user.hearts, nextHeartIn: 0, maxHearts: this.MAX_HEARTS };
    }
    
    let lastUpdate = user.lastHeartUpdate;
    if (!lastUpdate) {
      lastUpdate = Date.now();
      user.lastHeartUpdate = lastUpdate;
      this.setUser(user);
    }
    
    const now = Date.now();
    const timePassed = now - lastUpdate;
    const timeToNext = this.HEART_REGENERATION_TIME - (timePassed % this.HEART_REGENERATION_TIME);
    
    return {
      hearts: user.hearts,
      nextHeartIn: Math.max(0, timeToNext),
      maxHearts: this.MAX_HEARTS
    };
  },

  // ============ Hearts (ناقص/زيادة) ============
  loseHeart() {
    const user = this.getUser();
    const oldHearts = user.hearts;
    user.hearts = Math.max(0, user.hearts - 1);
    
    if (oldHearts === this.MAX_HEARTS) {
      user.lastHeartUpdate = Date.now();
    } else if (user.hearts === 0 && !user.lastHeartUpdate) {
      user.lastHeartUpdate = Date.now();
    }
    
    this.setUser(user);
    return user.hearts;
  },

  // ============ Buy Hearts ============
  buyHearts(count = 1, cost = 50) {
    const user = this.getUser();
    
    if (user.gems < cost) {
      return { success: false, error: 'جواهر مش كفاية!' };
    }
    
    if (user.hearts >= this.MAX_HEARTS) {
      return { success: false, error: 'القلوب كاملة بالفعل!' };
    }
    
    const oldHearts = user.hearts;
    user.gems -= cost;
    user.hearts = Math.min(this.MAX_HEARTS, user.hearts + count);
    
    if (oldHearts === 0 && user.hearts > 0) {
      user.lastHeartUpdate = Date.now();
    } else if (user.hearts >= this.MAX_HEARTS) {
      user.lastHeartUpdate = Date.now();
    }
    
    this.setUser(user);
    return { success: true, user };
  },

  // ============ Streak Management ============
  incrementStreak() {
    const user = this.getUser();
    user.lessonStreak = (user.lessonStreak || 0) + 1;
    user.lastActive = new Date().toDateString();
    this.setUser(user);
    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      firestoreModule.saveToFirestore();
    }
    return user.lessonStreak;
  },

  resetStreak() {
    const user = this.getUser();
    user.lessonStreak = 0;
    this.setUser(user);
    if (typeof firestoreModule !== 'undefined' && firestoreModule.currentUser) {
      firestoreModule.saveToFirestore();
    }
    return 0;
  },

  // ============ Progress ============
  markLessonComplete(lessonId) {
    const user = this.getUser();
    if (!user.completedLessons.includes(lessonId)) {
      user.completedLessons.push(lessonId);
      this.setUser(user);
    }
  },

  markProjectComplete(projectId) {
    const user = this.getUser();
    if (!user.completedProjects.includes(projectId)) {
      user.completedProjects.push(projectId);
      this.setUser(user);
    }
  },

  // ============ XP & Rewards ============
  addXP(amount) {
    const user = this.getUser();
    user.xp += amount;
    this.setUser(user);
    return user.xp;
  },

  addGems(amount) {
    const user = this.getUser();
    user.gems += amount;
    this.setUser(user);
    return user.gems;
  },

  // ✅ نظام المستويات
  getLevel() {
    return Math.floor((this.getUser().xp || 0) / 100) + 1;
  },

  // ✅ بنك الأخطاء
  addMistake(exercise) {
    const user = this.getUser();
    if (!user.mistakes) user.mistakes = [];
    if (!user.mistakes.find(e => e.question === exercise.question)) {
      user.mistakes.push(exercise);
      this.setUser(user);
    }
  },

  removeMistake(exerciseQuestion) {
    const user = this.getUser();
    if (!user.mistakes) return;
    user.mistakes = user.mistakes.filter(e => e.question !== exerciseQuestion);
    this.setUser(user);
  },

  // ============ Reset ============
  reset() {
    localStorage.removeItem(this.KEYS.USER);
    localStorage.removeItem(this.KEYS.PROGRESS);
  }
};