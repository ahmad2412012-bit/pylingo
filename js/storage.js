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
        gems: 0,
        hearts: 5,
        streak: 0,
        lastActive: null,
        lastHeartUpdate: Date.now(),
        completedLessons: [],
        completedProjects: []
      };
      this.setUser(defaultUser);
      return defaultUser;
    }
    
    const user = JSON.parse(data);
    
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
    const user = JSON.parse(localStorage.getItem(this.KEYS.USER) || '{}');
    
    if (!user.hearts || user.hearts >= this.MAX_HEARTS) {
      return {
        hearts: user.hearts || this.MAX_HEARTS,
        nextHeartIn: 0,
        maxHearts: this.MAX_HEARTS
      };
    }
    
    const now = Date.now();
    const lastUpdate = user.lastHeartUpdate || now;
    const timePassed = now - lastUpdate;
    const timeToNext = this.HEART_REGENERATION_TIME - (timePassed % this.HEART_REGENERATION_TIME);
    
    return {
      hearts: user.hearts,
      nextHeartIn: Math.max(0, timeToNext),
      maxHearts: this.MAX_HEARTS
    };
  },

  // ============ Progress ============
  getProgress() {
    const data = localStorage.getItem(this.KEYS.PROGRESS);
    return data ? JSON.parse(data) : {};
  },

  setProgress(progress) {
    localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
  },

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

  isLessonComplete(lessonId) {
    return this.getUser().completedLessons.includes(lessonId);
  },

  isProjectComplete(projectId) {
    return this.getUser().completedProjects.includes(projectId);
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

  // ============ Hearts (ناقص/زيادة) ============
  loseHeart() {
    const user = JSON.parse(localStorage.getItem(this.KEYS.USER) || '{}');
    
    if (!user.hearts) user.hearts = this.MAX_HEARTS;
    
    const oldHearts = user.hearts;
    user.hearts = Math.max(0, user.hearts - 1);
    
    // ✅ لو كان كامل قبل كده، ابدأ العداد الآن
    if (oldHearts === this.MAX_HEARTS) {
      user.lastHeartUpdate = Date.now();
    }
    // ✅ لو القلوب خلصت (0)، ثبت الوقت من دلوقتي
    else if (user.hearts === 0) {
      user.lastHeartUpdate = Date.now();
    }
    // ⚠️ باقي الحالات: سيب lastHeartUpdate زي ما هو (مستني)
    
    localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
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
    
    // ✅ لو كان 0 ورجع قلوب، ابدأ عداد جديد
    if (oldHearts === 0 && user.hearts > 0) {
      user.lastHeartUpdate = Date.now();
    }
    // ✅ لو وصل 5، صفّر
    else if (user.hearts >= this.MAX_HEARTS) {
      user.lastHeartUpdate = Date.now();
    }
    
    this.setUser(user);
    return { success: true, user };
  },

  // ============ Reset ============
  reset() {
    localStorage.removeItem(this.KEYS.USER);
    localStorage.removeItem(this.KEYS.PROGRESS);
  }
};