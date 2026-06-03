import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Ensure local environment works perfectly with single-stack standard protocols
dns.setDefaultResultOrder('ipv4first');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Lazy initialize the AI client to prevent crash-on-startup if GEMINI_API_KEY is missing
  let aiClient: any = null;
  function getAiClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      throw new Error("api_key_missing");
    }
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // API Endpoint for generation
  app.post("/api/generate", async (req, res) => {
    try {
      const { tool, params } = req.body;
      if (!tool) {
        return res.status(400).json({ error: "نوع الأداة مطلوب" });
      }

      let ai;
      try {
        ai = getAiClient();
      } catch (err: any) {
        if (err.message === "api_key_missing") {
          return res.status(401).json({
            error: "مفتاح API الخاص بـ Gemini غير متوفر. يرجى إعداد المفتاح في لوحة 'Secrets' في شاشة إعدادات التطبيق لتمكين ميزات الذكاء الاصطناعي بنجاح."
          });
        }
        throw err;
      }

      let systemInstruction = "";
      let userPrompt = "";

      if (tool === "lesson_planner") {
        const { subject, topic, grade, duration, focus } = params;
        systemInstruction = `أنت موجه بيداغوجي وأستاذ ذكي عالي الكفاءة في قطاع التكوين المهني بالجزائر والوطن العربي.
مهمتك الأساسية هي صياغة "مخطط درس نموذجي سلوكي" باللغة العربية متوافق تماماً مع المعايير البيداغوجية للمعهد الوطني للتكوين والتعليم المهنيين (INFEP).

يجب بشكل صارم ومطلق أن تصمم خطة الدرس في جدول سلوكي مهيكل بالتفصيل كما يلي (استخدم جدول Markdown متوافق تماماً):
| مرحلة | مواضيع التكوين | الروابط | عناصر المحتوى | المدة | الانشطة البيداغوجية (ما أفعله) (ما يفعله المتربص) | تقييم تكويني |

قم بملء هذا الجدول بشكل غني بيداغوجياً:
1. المراحل (مثل: تمهيد وانطلاق، عرض واكتساب، تطبيق وممارسة، تقييم وخاتمة).
2. مواضيع التكوين والروابط بوضوح (الربط مع المقاييس القبلية والبعدية مثل MQ1, MQ2, MC2 إلخ).
3. تفصيل "الأنشطة البيداغوجية" لتشمل بالتفصيل دور المكون ودور المتربص (مثال: 'يقدم المكون عرضاً تفاعلياً حول تفكيك المعالج ويوجه الأسئلة السقراطية. يتابع المتربص ويسجل الملاحظات الفردية ويطرح الأسئلة').
4. المدد الزمنية الموزعة بدقة (مجموعها يطابق مدة الدرس الإجمالية).

بجانب الجدول، يجب أن تضمن الوثيقة الحقول الإدارية البيداغوجية الرسمية التالية في أسفل المستند:
- المواد والأجهزة والمعدات المستخدمة (مثل أجهزة الحواسيب، أدوات التفكيك، نظام التشغيل)
- كمية المواد التعليمية الموزعة (مثل الأدلة البيداغوجية، الكتيبات، مذكرات التثبيت)
- فضاء التدريس (مثل ورشة تجميع العتاد، قاعة التدريس، مخبر الإعلام الآلي)
- الإجراء وطريقة تسيير الدرس
- إنهاء الدرس والتغلب على الصعوبات (خطة الطوارئ البيداغوجية مثل تعطل الحواسيب)
- وظائف أو مهام منزلية خارج الفوج
- ملاحظات تتبعية لاحقة عن الدرس

تطبيق البروتوكولات الذكية:
- المبادئ الأولى: تفكيك المفاهيم المعقدة لعناصر أبسط مع إرفاق مقارنات وتشبيهات ملموسة (Analogies).
- التقييم التكويني: حدد معايير أداء واضحة وتفاعلية مدمجة.`;
        userPrompt = `بيانات الدرس المراد توليد خطته السلوكية:
المقرر المعرفي: ${subject || "غير محدد"}
عنوان الدرس: ${topic || "غير محدد"}
الصف الموجه له: ${grade || "غير محدد"}
مدة الحصة الكلية: ${duration || "45"} دقيقة
التركيز المpreferred للأستاذ: ${focus || "تطبيق عملي للمقاييس المهنية"}`;
      } 
      else if (tool === "curriculum_planner") {
        const { course, term, grade, weeks, objectives } = params;
        systemInstruction = `أنت خبير هندسة المناهج ومصمم المخططات البيداغوجية بالمديرية العامة للمناهج (معايير INFEP).
مهمتك توليد "مخطط مقياس وتوزيع كفاءات فصلي/سنوي سلوكي" باللغة العربية تفصيلي ومريح للأستاذ، مصمم ومبني بالكامل وفقاً لمنهاج التكوين والتعليم المهنيين.

يجب وبشكل قاطع توليد تخطيط المقياس في هيكل جدول المقاربة بالكفاءات (APC) لـ INFEP كما يلي:
| الأغراض الوسطية (الموضحات عن السلوك المرتقب) | المدة (ساعة) | العناصر المحتوى الأساسية | الانشطة البيداغوجية | التقييم التكويني |

محددات تصميم المخطط:
1. الترويسة العليا الرسمية: يجب كتابة ترويسة إدارية تحتوي على الجمهورية والوزارة والمعهد الوطني (INFEP).
2. معلومات المقياس: رقم وعنوان المقياس، الكفاءة المستهدفة بتسمياتها المنهجية، نوع الكفاءة (مهنية أو مكملة)، الروابط والمقاييس السابقة واللاحقة، وتاريخ البداية والنهاية والتقييم.
3. تفصيل الوحدات بذكاء: تقسيم المادة للأغراض والنشاطات البيداغوجية مع آليات التقييم المستمر، وتفادي النصوص النظرية الطويلة والمملة.`;
        userPrompt = `بيانات وخصائص المقياس التعليمي:
اسم المادة / المقياس: ${course || "غير محدد"}
الصف الدراسي ومستواهم: ${grade || "غير محدد"}
الفصل الدراسي المقصود: ${term || "كامل الدورة التكوينية"}
عدد الأسابيع المخططة: ${weeks || "8 أسابيع"}
الأهداف الكفاءتية المستهدفة: ${objectives || "استيعاب الممارسات والتثبيت والتركيب الفني"}`;
      }
      else if (tool === "assessment_generator") {
        const { testType, topic, grade, difficulty, numQuestions } = params;
        systemInstruction = `أنت مقوم تربوي محترف ومصمم أسئلة وتدفقات معيارية لقياس فهم الطلاب.
مهمتك توليد "اختبار / تقييم بيداغوجي متكامل" باللغة العربية يبتعد كلياً عن الحفظ الآلي ويقيس الفروق المعرفية بين الطلاب.
تأكد من أن يشمل الاختبار:
1. إرشادات واضحة وودية لتخفيف قلق الاختبار وتوعية الطلاب بطريقة التفاعل.
2. أسئلة متنوعة (اختيار من متعدد بمشتتات مدروسة، أسئلة فهم مفتوحة، أو مشكلة وضعية مركبة).
3. "شبكة التصحيح التفصيلية النموذجية" (معايير التصحيح المقترحة لكل سؤال بالتفصيل ومقدار النقاط).
4. تحديد الهدف المنهجي من كل سؤال (ما هي الكفاءة المحددة المقاسة؟).
صغ المخرجات بوضوح وأناقة في تمليك Markdown جاهز للنسخ الفوري أو الطباعة.`;
        userPrompt = `مواصفات التقييم المرجو:
المادة والموضوع المستهدف: ${topic || "غير محدد"}
نوع التقييم: ${testType || "اختبار تكويني متوسط"}
الصف الدراسي ومستواهم: ${grade || "غير محدد"}
مستوى الصعوبة المطلوب: ${difficulty || "متوسط"}
عدد الأسئلة المستهدفة: ${numQuestions || "5 أسئلة"}`;
      }
      else if (tool === "performance_report") {
        const { classGroup, numStudents, rawNotes, reportType } = params;
        systemInstruction = `أنت موجه تربوي ومتحدث محترف خبير في تفريغ ملحوظات الأستاذ إلى تقارير تقييم رسمية.
مهمتك هي تحليل ملحوظات الأستاذ العشوائية السريعة وعلامات الطلاب وصياغة "تقرير أداء بيداغوجي تربوي" باللغة العربية يعكس مستواهم الفعلي بأسلوب بناء ومرن ومهذب يراعي توازن وراحة المعلم.
الخيارات لنمط الصياغة:
- إذا كان التقرير لـ "أولياء الأمور": ركز على الجوانب التشجيعية، السلوك البيداغوجي، الفرص الملموسة للتحسين المنزلي برفق ودعم.
- إذا كان التقرير لـ "إدارة المدرسة": ركز على الإحصاءات العامة وعلامات الضعف الأكثر شيوعاً والتوصيات الجماعية لبرنامج معالجة نقاط الفجوات.
قم بهيكلة التقرير وتفقيطه باستخدام Markdown، مع استخدام علامات واضحة وأسماء وهمية إذا لزم الأمر لوضع مثال إيضاحي ناصع.`;
        userPrompt = `تفاصيل تقرير الفئة:
الفوج/الصف: ${classGroup || "غير محدد"}
عدد الطلاب المقدر: ${numStudents || "عينة دراسية"}
نوع التقرير المستهدف: ${reportType || "تقرير مخصص لأولياء الأمور"}
ملحوظات الأستاذ المكتوبة بسرعة أو البيانات المتوفرة:
${rawNotes || "مستوى تفاعلي طيب مع الحاجة لتحسين التعبير وملاحظات دقيقة في الحساب."}`;
      }
      else if (tool === "admin_copilot") {
        const { documentType, tone, bulletPoints, recipient } = params;
        systemInstruction = `أنت مساعد إداري مدرسي فائق الجودة متمكن من اللوائح وأدبيات المراسلات والمكاتبات الرسمية للأستاذ.
مهمتك دمج الأفكار العشوائية للأستاذ وصياغة "وثيقة إدارية أو خطاب رسمي بيداغوجي" باللغة العربية الفصحى الفائقة.
يجدر بالوثيقة أن تحترم الهيكل الإداري الكلاسيكي بدقة بالغة:
1. الترويسة العليا (وزارة التربية أو تسمية تذكيرية إدارية عامة).
2. تحديد التاريخ والمستلم والموضوع.
3. التمهيد والترحيب والتحية الأخلاقية الراقية.
4. صياغة صلب الموضوع بفقرات متقنة ومهذبة، محكمة النبرة والهدف حسب المطلوب (دبلوماسية حذرة، حازمة ومنظمة، أو ترحيبية تشاركية).
5. خاتمة راقية وحث على التعاون التربوي مع مكان مخصص لاسم وتوقيع ومصادقة الأستاذ.
أبرز الوثيقة في سياق Markdown ناصع تفتخر به المؤسسة التعليمية ويوفر جهداً كلياً على المعلم.`;
        userPrompt = `بيانات المكاتبة المطلوبة:
نوع المستند الإداري: ${documentType || "مراسلة أولياء الأمور لعقوبة أو تذكير"}
المرسل إليه / المتلقي: ${recipient || "إدارة المؤسسة أو أولياء الأمور"}
النبرة المرجوة في الصياغة: ${tone || "رسمية تربوية ودبلوماسية متمكنة"}
الأفكار والمعلومات المطلوب إدراجها:
${bulletPoints || "التأكيد على أهمية إحضار كراسات القسم والالتزام بالتوقيت المدرسي لتجنب الإقصاء."}`;
      }
      else if (tool === "diagram_generator") {
        const { subject, topic, style, language } = params;
        systemInstruction = `أنت موجه بيداغوجي ومصمم كفاءات خبير في تفكيك العلوم وتجسيد المخططات التقنية وتبسيطها باللغة العربية.
مهمتك صياغة "دليل بيداغوجي متميز ومفصل" باللغة العربية يشرح المخطط التقني أو الرسم التوضيحي المرفق [Topic].
احرص على تنظيم الدليل في المخرجات مستعملاً أقسام وعناوين واضحة بالـ Markdown:
1. مقدمة بيداغوجية شيقة عن تفعيل الكفاءة المستهدفة بالربط مع المخطط البصري.
2. تفصيل المكونات والقطع الأساسية مع توضيح أدوارها وعلاقتها الديناميكية ببعضها.
3. توصيات تربوية للأستاذ حول كيفية استدراج التلاميذ بالأسلوب السقراطي لملاحظة التفاصيل.
4. شبكة تقييم تكويني سريعة (سؤالين أو ثلاثة لقياس تمكن الطالب من قراءة المخطط).
اجعل الأسلوب منساباً وتجنب الملل، لتوفر للأستاذ جهداً بليغاً في التحضير والورقيات الإدارية.`;
        userPrompt = `بيانات المخطط التعليمي المطلوب لشرح المادة:
المادة/الفرع المعرفي: ${subject || "غير محدد"}
موضوع المخطط التقني/الصورة المراد شرحها: ${topic || "مكونات اللوحة الأم لخصائص الحاسوب"}
النمط الفني المقترح للمخطط: ${style || "مخطط تقني مفصل (Technical schematic)"}
اللغة المفضلة في الشرح والتعليقات: ${language || "العربية الفصحى مع التسميات الإنجليزية والعربية"}`;
      }

      // Generate the vocational context block if provided
      let vocationalContext = "";
      if (params && params.programName) {
        vocationalContext = `\n\n[سياق بيداغوجي رسمي للتكوين المهني]:
- هذا المستند يتبع رسمياً المنهاج الوزاري لبرنامج: ${params.programName} ${params.programCode ? `(رمز: ${params.programCode})` : ""}
- الشهادة المستهدفة: ${params.diploma || "شهادة التكوين المهني"}
- الوحدة التعليمية أو المادة المقصودة: ${params.moduleCode || ""} - ${params.moduleTitle || ""}.
- توجيه خاص: يرجى كتابة وتفصيل المحتوى التعليمي ليكون متوافقاً تماماً مع الكفاءات المنهجية والمقاييس المعتمدة رسمياً في التكوين والتعليم المهني بالجزائر والمنظومة العربية.`;
      }

      if (vocationalContext) {
        userPrompt += vocationalContext;
      }

      // Query Gemini with the standard task model
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const generatedText = response.text || "لم يتم توليد أي محتوى، يرجى المحاولة والتحقق من المدخلات.";

      // Multi-modal enhancement: generate an actual image using gemini-2.5-flash-image when requested
      let imageUrl = "";
      if (tool === "diagram_generator") {
        try {
          const { topic, style } = params;
          const imagePrompt = `Detailed high-quality educational technical schematic diagram of: ${topic || "Motherboard components of a computer"}. Style is ${style || "colored schematic line art"}, professional illustrations for classroom use, high resolution, sharp visual details, with blank outline labels, isolated on elegant clean background, 16:9 widescreen layout.`;
          
          const imgResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: imagePrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });

          if (imgResponse.candidates?.[0]?.content?.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr) {
          console.error("Failed to generate educational diagram via AI model:", imgErr);
          // High quality standard educator illustration placeholder fallback representing educational diagram
          imageUrl = `https://picsum.photos/seed/${encodeURIComponent(params.topic || "motherboard")}/1024/576`;
        }
      }

      return res.json({ result: generatedText, imageUrl });

    } catch (error: any) {
      console.error("API Error in Server Generate:", error);
      return res.status(500).json({ error: error.message || "حدث خطأ غير متوقع أثناء توليد المحتوى التعليمي" });
    }
  });

  // Serve static files or Vite Server depending on environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Professor Fullstack Backend running on http://localhost:${PORT}`);
  });
}

startServer();
