// ============ Achievements Module ============
// نظام الإنجازات

const achievementsModule = {
  // ============ قائمة الإنجازات ============
  list: [
    {
      id: 'first_lesson',
      icon: '🌱',
      title: 'البداية',
      description: 'أكمل أول درس',
      condition: (user) => user.completedLessons.length >= 1
    },
    {
      id: 'ten_lessons',
      icon: '📚',
      title: 'متعلّم',
      description: 'أكمل 10 دروس',
      condition: (user) => user.completedLessons.length >= 10
    },
    {
      id: 'thirty_lessons',
      icon: '🎓',
      title: 'محترف',
      description: 'أكمل 30 درس',
      condition: (user) => user.completedLessons.length >= 30
    },
    {
      id: 'first_project',
      icon: '🏆',
      title: 'أول مشروع',
      description: 'أكمل أول مشروع',
      condition: (user) => user.completedProjects.length >= 1
    },
    {
      id: 'five_projects',
      icon: '💪',
      title: 'منتج',
      description: 'أكمل 5 مشاريع',
      condition: (user) => user.completedProjects.length >= 5
    },
    {
      id: 'hundred_xp',
      icon: '⚡',
      title: 'سريع',
      description: 'اجمع 100 XP',
      condition: (user) => user.xp >= 100
    },
    {
      id: 'five_hundred_xp',
      icon: '🚀',
      title: 'صاروخ',
      description: 'اجمع 500 XP',
      condition: (user) => user.xp >= 500
    },
    {
      id: 'hundred_gems',
      icon: '💎',
      title: 'ثري',
      description: 'اجمع 100 جوهرة',
      condition: (user) => user.gems >= 100
    },
    {
      id: 'seven_streak',
      icon: '🔥',
      title: 'ملتزم',
      description: 'سلسلة 7 أيام',
      condition: (user) => user.streak >= 7
    },
    {
      id: 'python_master',
      icon: '🐍',
      title: 'مبرمج Python',
      description: 'أكمل كل الـ Units',
      condition: (user) => user.completedProjects.length >= 10
    }
  ],

  // ============ الحصول على إنجازات المستخدم ============
  getUnlocked() {
    try {
      return JSON.parse(localStorage.getItem('pylingo_achievements') || '[]');
    } catch {
      return [];
    }
  },

  setUnlocked(ids) {
    localStorage.setItem('pylingo_achievements', JSON.stringify(ids));
  },

  isUnlocked(id) {
    return this.getUnlocked().includes(id);
  },

  unlock(id) {
    const unlocked = this.getUnlocked();
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      this.setUnlocked(unlocked);
      return true;
    }
    return false;
  },

  // ============ فحص كل الإنجازات ============
  checkAll() {
    const user = storage.getUser();
    const unlocked = this.getUnlocked();
    const newlyUnlocked = [];

    this.list.forEach(ach => {
      if (!unlocked.includes(ach.id) && ach.condition(user)) {
        if (this.unlock(ach.id)) {
          newlyUnlocked.push(ach);
        }
      }
    });

    return newlyUnlocked;
  },

  // ============ إظهار إشعار الإنجاز ============
  showUnlockNotification(achievement) {
    // الصوت
    if (window.sounds && sounds.playLevelUp) {
      sounds.playLevelUp();
    }

    // Toast
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerHTML = `
        <div style="font-size: 28px; margin-bottom: 4px;">${achievement.icon}</div>
        <div style="font-weight: 900; font-size: 16px;">🏆 إنجاز جديد!</div>
        <div style="font-size: 14px; margin-top: 4px;">${achievement.title}</div>
      `;
      toast.className = 'toast show success';
      
      setTimeout(() => {
        toast.className = 'toast';
      }, 3500);
    }
  },

  // ============ التعامل مع إنجازات متعددة ============
  checkAndNotify() {
    const newlyUnlocked = this.checkAll();
    
    if (newlyUnlocked.length > 0) {
      // لو أكتر من إنجاز، اعرضهم بالتبادل
      newlyUnlocked.forEach((ach, index) => {
        setTimeout(() => {
          this.showUnlockNotification(ach);
        }, index * 3800);
      });
    }
    
    return newlyUnlocked;
  }
};