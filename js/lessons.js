// ============ Lessons Data ============
// بيانات كل الـ Units والدروس والمشاريع

const LESSONS_DATA = {
  units: [
    // ============================================================
    // ============ Unit 1: الأساسيات (موسّع) ============
    // ============================================================
    {
      id: 1,
      title: "الأساسيات",
      description: "print, comments, variables, strings, input, while loop",
      icon: "🌱",
      color: "#58CC02",
      lessons: [
        {
          id: 1,
          title: "print - أول أمر",
          xpReward: 20,
          exercises: [
            {
              id: 101,
              type: "multiple_choice",
              question: "إيه وظيفة print() في Python؟",
              options: ["تطبع نص على الشاشة", "تحذف ملف", "تقرأ من المستخدم", "تسجل خروج"],
              correctAnswer: 0,
              explanation: "print() بتطبع أي حاجة على الشاشة"
            },
            {
              id: 102,
              type: "fill_blank",
              question: "اكمل الكود عشان يطبع Hello",
              code: '___("Hello")',
              bank: ["print", "input", "len", "type"],
              correctAnswer: "print",
              explanation: 'print("Hello") هي الطريقة الصحيحة'
            },
            {
              id: 103,
              type: "predict_output",
              question: "إيه اللي هيطلع من الكود ده؟",
              code: 'print("Hi")\nprint("There")',
              correctAnswer: "Hi\nThere",
              explanation: "كل print بتطبع سطر جديد"
            },
            {
              id: 104,
              type: "multiple_choice",
              question: "إيه اللي هيطلع من print(5 + 3)?",
              options: ["8", "5+3", "53", "خطأ"],
              correctAnswer: 0,
              explanation: "print بتحسب العملية الأول وبعدين تطبع"
            },
            {
              id: 105,
              type: "fill_blank",
              question: "اطبع كلمة World",
              code: 'print(___)',
              bank: ['"World"', 'World', 'world', 'print'],
              correctAnswer: '"World"',
              explanation: "النصوص محتاجة علامات تنصيص"
            }
          ]
        },
        {
          id: 2,
          title: "التعليقات (Comments)",
          xpReward: 20,
          exercises: [
            {
              id: 201,
              type: "multiple_choice",
              question: "إيه الرمز اللي بيبدأ بيه التعليق في Python؟",
              options: ["//", "#", "/*", "--"],
              correctAnswer: 1,
              explanation: "# بيبدأ التعليق في Python"
            },
            {
              id: 202,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: '# print("Hi")\nprint("Bye")',
              correctAnswer: "Bye",
              explanation: "السطر اللي فيه # مش بيتنفذ"
            },
            {
              id: 203,
              type: "fill_blank",
              question: "اكتب تعليق",
              code: '___ ده تعليق',
              bank: ["#", "//", "/*", "--"],
              correctAnswer: "#",
              explanation: "# للتعليق"
            },
            {
              id: 204,
              type: "multiple_choice",
              question: "ليه نستخدم التعليقات؟",
              options: ["لشرح الكود", "لتسريع البرنامج", "لحذف متغيرات", "لتغيير الألوان"],
              correctAnswer: 0,
              explanation: "التعليقات بتشرح الكود للقراء"
            }
          ]
        },
        {
          id: 3,
          title: "المتغيرات",
          xpReward: 20,
          exercises: [
            {
              id: 301,
              type: "multiple_choice",
              question: "إيه المتغير (Variable)؟",
              options: ["مكان لتخزين قيمة", "دالة بتطبع", "نوع بيانات", "خطأ في الكود"],
              correctAnswer: 0,
              explanation: "المتغير مكان بنحط فيه قيمة"
            },
            {
              id: 302,
              type: "fill_blank",
              question: "اعمل متغير age = 25",
              code: 'age ___ 25',
              bank: ["=", "==", ":", "->"],
              correctAnswer: "=",
              explanation: "= لتعيين قيمة"
            },
            {
              id: 303,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'x = 5\nx = 10\nprint(x)',
              correctAnswer: "10",
              explanation: "المتغير بياخد آخر قيمة"
            },
            {
              id: 304,
              type: "fill_blank",
              question: "اعمل متغير name بقيمة Ali",
              code: 'name = ___',
              bank: ['"Ali"', 'Ali', 'name', 'string'],
              correctAnswer: '"Ali"',
              explanation: "النصوص بين علامات تنصيص"
            },
            {
              id: 305,
              type: "multiple_choice",
              question: "إيه نتيجة x + 5 لو x = 10؟",
              options: ["15", "105", "x5", "خطأ"],
              correctAnswer: 0,
              explanation: "المتغير بياخد قيمته"
            }
          ]
        },
        {
          id: 4,
          title: "النصوص (Strings)",
          xpReward: 20,
          exercises: [
            {
              id: 401,
              type: "multiple_choice",
              question: "إزاي نكتب نص في Python؟",
              options: ['بين " "', "بدون علامات", "بين ()", "بين []"],
              correctAnswer: 0,
              explanation: "النصوص بين علامات تنصيص"
            },
            {
              id: 402,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'name = "Ali"\nprint("Hello " + name)',
              correctAnswer: "Hello Ali",
              explanation: "+ بتدمج النصوص"
            },
            {
              id: 403,
              type: "fill_blank",
              question: "ادمج الاسمين",
              code: 'first = "Hello "\nlast = "World"\nprint(first ___ last)',
              bank: ["+", "-", "*", "&"],
              correctAnswer: "+",
              explanation: "+ لدمج النصوص"
            },
            {
              id: 404,
              type: "multiple_choice",
              question: "إيه طول النص 'Hello'؟",
              options: ["5", "4", "6", "1"],
              correctAnswer: 0,
              explanation: "Hello = 5 حروف"
            },
            {
              id: 405,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print("a" * 3)',
              correctAnswer: "aaa",
              explanation: "* بتكرر النص"
            }
          ]
        },
        {
          id: 5,
          title: "المدخلات (input)",
          xpReward: 20,
          exercises: [
            {
              id: 501,
              type: "multiple_choice",
              question: "إيه وظيفة input()؟",
              options: ["تقرأ من المستخدم", "تطبع", "تحذف", "تسجل"],
              correctAnswer: 0,
              explanation: "input() بتستقبل مدخلات"
            },
            {
              id: 502,
              type: "predict_output",
              question: "لو المستخدم كتب Ali:",
              code: 'name = input("اسمك؟ ")\nprint("أهلاً " + name)',
              correctAnswer: "أهلاً Ali",
              explanation: "input() بترجع النص"
            },
            {
              id: 503,
              type: "fill_blank",
              question: "اقرأ اسم المستخدم",
              code: 'name = ___("اسمك؟ ")',
              bank: ["input", "print", "get", "read"],
              correctAnswer: "input",
              explanation: "input لاستقبال المدخلات"
            },
            {
              id: 504,
              type: "multiple_choice",
              question: "input() بترجع إيه؟",
              options: ["نص (string)", "رقم", "قائمة", "صح/خطأ"],
              correctAnswer: 0,
              explanation: "input دايماً بترجع string"
            }
          ]
        },
        {
          id: 6,
          title: "حلقة while",
          xpReward: 25,
          exercises: [
            {
              id: 601,
              type: "multiple_choice",
              question: "إيه وظيفة while loop؟",
              options: ["تكرر كود لحد شرط", "تطبع", "تعمل متغير", "تقرأ ملف"],
              correctAnswer: 0,
              explanation: "while بتكرر لحد ما الشرط يفشل"
            },
            {
              id: 602,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'i = 1\nwhile i <= 3:\n    print(i)\n    i = i + 1',
              correctAnswer: "1\n2\n3",
              explanation: "بتلف 3 مرات"
            },
            {
              id: 603,
              type: "fill_blank",
              question: "اكمل الحلقة",
              code: 'i = 1\n___ i <= 5:\n    print(i)\n    i = i + 1',
              bank: ["while", "for", "if", "loop"],
              correctAnswer: "while",
              explanation: "while للحلقات الشرطية"
            },
            {
              id: 604,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'i = 0\nwhile i < 2:\n    print("Hi")\n    i = i + 1',
              correctAnswer: "Hi\nHi",
              explanation: "بتلف مرتين"
            }
          ]
        },
        {
          id: 7,
          title: "العمليات الحسابية",
          xpReward: 25,
          exercises: [
            {
              id: 701,
              type: "multiple_choice",
              question: "إيه نتيجة 7 + 3؟",
              options: ["10", "73", "21", "4"],
              correctAnswer: 0,
              explanation: "7 + 3 = 10"
            },
            {
              id: 702,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(10 - 4)',
              correctAnswer: "6",
              explanation: "10 - 4 = 6"
            },
            {
              id: 703,
              type: "fill_blank",
              question: "اضرب 5 × 3",
              code: 'print(5 ___ 3)',
              bank: ["*", "+", "-", "/"],
              correctAnswer: "*",
              explanation: "* للضرب"
            },
            {
              id: 704,
              type: "predict_output",
              question: "إيه نتيجة 10 / 2؟",
              code: 'print(10 / 2)',
              correctAnswer: "5.0",
              explanation: "/ بترجع float"
            }
          ]
        },
        {
          id: 8,
          title: "المقارنات",
          xpReward: 25,
          exercises: [
            {
              id: 801,
              type: "multiple_choice",
              question: "إيه معنى ==؟",
              options: ["يساوي (مقارنة)", "يعين قيمة", "أكبر من", "أصغر من"],
              correctAnswer: 0,
              explanation: "== للمقارنة، = للتعيين"
            },
            {
              id: 802,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(5 > 3)',
              correctAnswer: "True",
              explanation: "5 > 3 صح"
            },
            {
              id: 803,
              type: "fill_blank",
              question: "اختبر لو x يساوي 5",
              code: 'if x ___ 5:\n    print("yes")',
              bank: ["==", "=", ">", "<"],
              correctAnswer: "==",
              explanation: "== للمقارنة"
            },
            {
              id: 804,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(10 != 5)',
              correctAnswer: "True",
              explanation: "!= معناه مش يساوي"
            }
          ]
        }
      ],
      project: {
        id: 1,
        title: "🍔 برنامج مطعم",
        description: "اعمل برنامج مطعم بيعرض قائمة الأكلات، بيطلب من المستخدم يختار، وبيطبع الفاتورة.",
        requirements: [
          "استخدم list لتخزين القائمة",
          "استخدم loop لعرض الأكلات",
          "استخدم input لاختيار المستخدم",
          "استخدم print لطباعة الطلب"
        ],
        starterCode: `# Restaurant Program
menu = ["Burger", "Pizza", "Pasta"]

# 1. اعرض القائمة (استخدم for loop)
# مثال: طباعة كل عنصر في القائمة

# 2. اطلب من المستخدم يختار (استخدم input)

# 3. اطبع الطلب
# لازم النتيجة تكون: "You ordered: <اسم الأكلة>"
`,
        testCases: [
          {
            input: "1\n",
            expected_output: "You ordered: Burger",
            description: "اختيار رقم 1"
          },
          {
            input: "2\n",
            expected_output: "You ordered: Pizza",
            description: "اختيار رقم 2"
          },
          {
            input: "3\n",
            expected_output: "You ordered: Pasta",
            description: "اختيار رقم 3"
          }
        ],
        requiredKeywords: ["for", "input", "print"],
        xpReward: 150,
        difficulty: "easy"
      }
    },

    // ============================================================
    // ============ Unit 2: الأرقام والعمليات (موسّع) ============
    // ============================================================
    {
      id: 2,
      title: "الأرقام والعمليات",
      description: "int, float, +-*/, //, %, **, round, abs",
      icon: "🔢",
      color: "#1CB0F6",
      lessons: [
        {
          id: 9,
          title: "الأنواع الرقمية",
          xpReward: 20,
          exercises: [
            {
              id: 901,
              type: "multiple_choice",
              question: "إيه الفرق بين int و float؟",
              options: ["int رقم صحيح، float رقم عشري", "الاتنين نفس الحاجة", "int للنصوص", "float للأرقام الكبيرة"],
              correctAnswer: 0,
              explanation: "int = 5، float = 5.5"
            },
            {
              id: 902,
              type: "fill_blank",
              question: "حول النص لرقم",
              code: 'num = ___("5")',
              bank: ["int", "str", "float", "print"],
              correctAnswer: "int",
              explanation: "int() بتحول لرقم صحيح"
            },
            {
              id: 903,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'x = 10\ny = 3\nprint(x / y)',
              correctAnswer: "3.3333333333333335",
              explanation: "/ بترجع float"
            },
            {
              id: 904,
              type: "multiple_choice",
              question: "إيه نوع 3.14؟",
              options: ["float", "int", "string", "bool"],
              correctAnswer: 0,
              explanation: "3.14 رقم عشري = float"
            }
          ]
        },
        {
          id: 10,
          title: "القسمة والباقي",
          xpReward: 20,
          exercises: [
            {
              id: 1001,
              type: "multiple_choice",
              question: "إيه نتيجة 10 // 3؟",
              options: ["3", "3.33", "3.0", "1"],
              correctAnswer: 0,
              explanation: "// قسمة صحيحة"
            },
            {
              id: 1002,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(10 % 3)',
              correctAnswer: "1",
              explanation: "% باقي القسمة"
            },
            {
              id: 1003,
              type: "fill_blank",
              question: "احسب 2 أس 3",
              code: 'print(2 ___ 3)',
              bank: ["**", "*", "^", "//"],
              correctAnswer: "**",
              explanation: "** للأس"
            },
            {
              id: 1004,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(15 % 4)',
              correctAnswer: "3",
              explanation: "15 ÷ 4 = 3 والباقي 3"
            }
          ]
        },
        {
          id: 11,
          title: "دوال رياضية",
          xpReward: 20,
          exercises: [
            {
              id: 1101,
              type: "multiple_choice",
              question: "إيه وظيفة round()؟",
              options: ["تقرب الرقم", "تحسب الجذر", "تحسب المطلق", "تضرب"],
              correctAnswer: 0,
              explanation: "round() بتقرب الرقم"
            },
            {
              id: 1102,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(round(3.7))',
              correctAnswer: "4",
              explanation: "3.7 ≈ 4"
            },
            {
              id: 1103,
              type: "fill_blank",
              question: "احسب القيمة المطلقة لـ -5",
              code: 'print(___( -5))',
              bank: ["abs", "round", "int", "float"],
              correctAnswer: "abs",
              explanation: "abs() بترجع القيمة المطلقة"
            },
            {
              id: 1104,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(abs(-10))',
              correctAnswer: "10",
              explanation: "abs(-10) = 10"
            }
          ]
        },
        {
          id: 12,
          title: "ترتيب العمليات",
          xpReward: 25,
          exercises: [
            {
              id: 1201,
              type: "multiple_choice",
              question: "إيه نتيجة 2 + 3 * 4؟",
              options: ["14", "20", "24", "9"],
              correctAnswer: 0,
              explanation: "الضرب قبل الجمع: 2 + 12 = 14"
            },
            {
              id: 1202,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print((2 + 3) * 4)',
              correctAnswer: "20",
              explanation: "الأقواس الأول: 5 * 4 = 20"
            },
            {
              id: 1203,
              type: "fill_blank",
              question: "عايز نتيجة 20 من 2+3*4",
              code: 'print((2 + 3) ___ 4)',
              bank: ["*", "+", "-", "/"],
              correctAnswer: "*",
              explanation: "الأقواس بتغير الترتيب"
            }
          ]
        },
        {
          id: 13,
          title: "تحويل الأنواع",
          xpReward: 25,
          exercises: [
            {
              id: 1301,
              type: "multiple_choice",
              question: "إيه وظيفة str()؟",
              options: ["تحول لنص", "تحول لرقم", "تحذف", "تطبع"],
              correctAnswer: 0,
              explanation: "str() بتحول أي حاجة لنص"
            },
            {
              id: 1302,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(str(5) + " apples")',
              correctAnswer: "5 apples",
              explanation: "str(5) = '5'"
            },
            {
              id: 1303,
              type: "fill_blank",
              question: "حول الرقم لنص",
              code: 'x = ___(10)\nprint(x + "s")',
              bank: ["str", "int", "float", "print"],
              correctAnswer: "str",
              explanation: "str() للتحويل لنص"
            },
            {
              id: 1304,
              type: "predict_output",
              question: "إيه اللي هيطلع؟",
              code: 'print(int(3.9))',
              correctAnswer: "3",
              explanation: "int() بتشيل الكسر"
            }
          ]
        }
      ],
      project: {
        id: 2,
        title: "🧮 آلة حاسبة",
        description: "اعمل آلة حاسبة بتاخد رقمين من المستخدم وتطبع مجموعهما.",
        requirements: [
          "استخدم input لقراءة رقمين",
          "استخدم int() لتحويل المدخلات",
          "اجمعهم بـ +",
          "اطبع الناتج بـ print"
        ],
        starterCode: `# Calculator
# 1. اطلب رقم أول
# 2. اطلب رقم تاني
# 3. اطبع الناتج
# النتيجة: "Result: <الناتج>"
`,
        testCases: [
          { input: "5\n3\n", expected_output: "Result: 8", description: "5 + 3" },
          { input: "10\n20\n", expected_output: "Result: 30", description: "10 + 20" },
          { input: "7\n7\n", expected_output: "Result: 14", description: "7 + 7" }
        ],
        requiredKeywords: ["input", "int", "print"],
        xpReward: 150,
        difficulty: "easy"
      }
    }
  ]
};