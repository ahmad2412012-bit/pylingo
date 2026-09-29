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
    const user = this.getUser();
    
    // لو القلوب كاملة
    if (user.hearts >= this.MAX_HEARTS) {
      return {
        hearts: user.hearts,
        nextHeartIn: 0,
        maxHearts: this.MAX_HEARTS
      };
    }
    
    // ✅ لو لسه بينقص، احسب من lastHeartUpdate
    let lastUpdate = user.lastHeartUpdate;
    
    // ✅ لو مفيش lastHeartUpdate (مثلاً القلوب 0 والمستخدم جديد)
    if (!lastUpdate) {
      lastUpdate = Date.now();
      // احفظها
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
    // ============ Streak Management ============
  updateStreak() {
    const user = this.getUser();
    const today = new Date().toDateString();
    const lastActive = user.lastActive;
    
    if (!lastActive) {
      // أول مرة
      user.streak = 1;
      user.lastActive = today;
      this.setUser(user);
      console.log('🔥 Streak started: 1');
      return user.streak;
    }
    
    if (lastActive === today) {
      // نفس اليوم - مفيش تغيير
      return user.streak;
    }
    
    // احسب الفرق بين اليوم وآخر يوم
    const lastDate = new Date(lastActive);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // يوم واحد بس - كمّل السلسلة
      user.streak += 1;
      user.lastActive = today;
      console.log('🔥 Streak increased:', user.streak);
    } else {
      // فات يومين أو أكتر - ابدأ من جديد
      user.streak = 1;
      user.lastActive = today;
      console.log('🔥 Streak reset: 1');
    }
    
    this.setUser(user);
    return user.streak;
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
    const user = this.getUser();
    const oldHearts = user.hearts;
    user.hearts = Math.max(0, user.hearts - 1);
    
    // ✅ لو كانت كاملة قبل كده → ابدأ العداد
    if (oldHearts === this.MAX_HEARTS) {
      user.lastHeartUpdate = Date.now();
    }
    // ✅ لو لسه بينقص وعندنا lastHeartUpdate → خليه
    // ✅ لو وصل 0 ومافيش lastHeartUpdate → ابدأ من الآن
    else if (user.hearts === 0 && !user.lastHeartUpdate) {
      user.lastHeartUpdate = Date.now();
    }
    // ✅ لو وصل 0 ومعند lastHeartUpdate → احتفظ بالوقت القديم عشان العداد يكمل
    else if (user.hearts === 0 && user.lastHeartUpdate) {
      // خليه زي ما هو - العداد شغال
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