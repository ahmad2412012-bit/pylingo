// ============ Pyodide Runner ============
// مسؤول عن تشغيل كود Python في المتصفح باستخدام Pyodide

let pyodideInstance = null;
let pyodideLoading = null;

// تحميل Pyodide (مرة واحدة بس)
async function getPyodide() {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    console.log('🐍 جاري تحميل Pyodide...');
    pyodideInstance = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
    });
    console.log('✅ Pyodide اتحمل بنجاح');
    return pyodideInstance;
  })();

  return pyodideLoading;
}

// ============ تشغيل كود Python ============
async function runPython(code, stdin = '') {
  const py = await getPyodide();
  
  try {
    // إعداد stdout و stderr و stdin
    py.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
sys.stdin = StringIO(${JSON.stringify(stdin)})
    `);

    // شغل الكود مع timeout 5 ثواني
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: الكود أخد أكتر من 5 ثواني')), 5000)
    );

    await Promise.race([py.runPythonAsync(code), timeoutPromise]);

    // اجلب الـ output
    const stdout = py.runPython('sys.stdout.getvalue()');
    const stderr = py.runPython('sys.stderr.getvalue()');

    return {
      success: !stderr,
      output: stdout || '',
      error: stderr || null
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error.message || 'خطأ غير معروف'
    };
  }
}

// ============ تقييم مشروع كامل ============
async function evaluateProject(code, testCases, requiredKeywords = []) {
  const feedback = [];
  const details = {
    syntaxOk: false,
    testsPassed: 0,
    testsTotal: testCases.length,
    keywordsFound: [],
    keywordsMissing: []
  };

  // 1. تحقق من syntax
  const syntaxCheck = await runPython(`
import ast
try:
    ast.parse(${JSON.stringify(code)})
    print("OK")
except SyntaxError as e:
    print(f"ERROR: {e}")
  `);

  if (!syntaxCheck.output.includes('OK')) {
    return {
      passed: false,
      score: 0,
      feedback: [
        { type: 'error', text: '❌ فيه خطأ في كتابة الكود' },
        { type: 'error', text: syntaxCheck.output }
      ],
      details
    };
  }

  details.syntaxOk = true;
  feedback.push({ type: 'success', text: '✅ الكود صحيح من ناحية الـ syntax' });

  // 2. تحقق من الكلمات المفتاحية المطلوبة
  for (const keyword of requiredKeywords) {
    if (code.includes(keyword)) {
      details.keywordsFound.push(keyword);
    } else {
      details.keywordsMissing.push(keyword);
    }
  }

  if (details.keywordsMissing.length > 0) {
    feedback.push({
      type: 'warning',
      text: `⚠️ ناقص تستخدم: ${details.keywordsMissing.join(', ')}`
    });
  } else if (requiredKeywords.length > 0) {
    feedback.push({ type: 'success', text: '✅ استخدمت كل الكلمات المفتاحية المطلوبة' });
  }

  // 3. شغل test cases
  for (const testCase of testCases) {
    const result = await runPython(code, testCase.input);

    const expected = testCase.expected_output.trim();
    const actual = result.output.trim();

    if (actual === expected) {
      details.testsPassed++;
    } else {
      feedback.push({
        type: 'error',
        text: `❌ اختبار "${testCase.description || testCase.input}":\n  متوقع: ${expected}\n  طلع: ${actual}`
      });
    }
  }

  if (details.testsPassed === details.testsTotal) {
    feedback.push({
      type: 'success',
      text: `✅ عدّى ${details.testsPassed}/${details.testsTotal} اختبار`
    });
  } else {
    feedback.push({
      type: 'warning',
      text: `⚠️ عدّى ${details.testsPassed}/${details.testsTotal} اختبار`
    });
  }

  // 4. احسب الـ score
  const syntaxScore = details.syntaxOk ? 20 : 0;
  const testsScore = details.testsTotal > 0
    ? (details.testsPassed / details.testsTotal) * 60
    : 60;
  const keywordsScore = requiredKeywords.length > 0
    ? (details.keywordsFound.length / requiredKeywords.length) * 20
    : 20;

  const score = Math.round(syntaxScore + testsScore + keywordsScore);
  const passed = score >= 70 && details.syntaxOk;

  if (passed) {
    feedback.unshift({ type: 'success', text: '🎉 مبروك! نجحت في المشروع' });
  } else {
    feedback.unshift({ type: 'error', text: '❌ لسه محتاج تشتغل شوية على المشروع' });
  }

  return { passed, score, feedback, details };
}