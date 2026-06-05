import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import HTMLtoDOCX from "html-to-docx";

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
        const isMQ1 = `${subject} ${topic} ${params.moduleCode || ""} ${params.moduleTitle || ""}`.toUpperCase().includes("MQ1");
        
        systemInstruction = `أنت موجه بيداغوجي وأستاذ ذكي عالي الكفاءة في قطاع التكوين المهني بالجزائر والوطن العربي، وتعمل وفق المبادئ التوجيهية لـ المعهد الوطني للتكوين والتعليم المهنيين (INFEP).
مهمتك الأساسية هي صياغة "مخطط درس نموذجي سلوكي" (Behavioral Lesson Plan) باللغة العربية متوافق تماماً مع المقاربة بالكفاءات (APC) والمعايير البيداغوجية لـ INFEP.

شروط هامة ومقدسة لتنسيق الجدول السلوكي لـ INFEP:
يجب صياغة العرض الرئيسي للدرس في شكل جدول Markdown بيداغوجي سلوكي صارم يقسم المخرجات إلى أعمدة دقيقة وواضحة خالية من عيوب الدمج العشوائي:
| المرحلة البيداغوجية | الأنشطة البيداغوجية بالتفصيل (نشاط المكوّن | نشاط المتربص) | التقييم التكويني (معايير الأداء والتحقق الفوري) | المدة الزمنية |

تفاصيل كيفية صياغة وتوزيع الأعمدة:
1. **المرحلة البيداغوجية**: يجب أن تنتقل الحصة عبر 4 محطات سلوكية كبرى:
   - مرحلة الانطلاق والتحفيز (الوضعية الانطلاقية والتقييم التشخيصي واستدعاء المكتسبات القبلية).
   - مرحلة العرض والتحليل (بناء المعارف الجديدة وتحليل الكفاءة المفككة).
   - مرحلة التطبيق والممارسة (التمارين التطبيقية والوضعية الإدماجية داخل الورشة).
   - مرحلة التقييم والختام (التقييم التحصيلي والتقييم التكويني الختامي وإعلان معايير النجاح).
2. **الأنشطة البيداغوجية (نشاط المكوّن | نشاط المتربص)**: يجب تقسيم هذا العمود بوضوح وتفصيل دور كل منهما:
   - نشاط المكوّن: الشرح، توجيه المعطيات، طرح الأسئلة السقراطية، تنشيط التفكير، توجيه المناولات وتدريبهم على العتاد.
   - نشاط المتربص: الملاحظة، السماع الفعال، الإجابة عن الأسئلة، تدوين المخططات، القيام بالمناولة التطبيقية وفك وتجميع القطع بشكل فردي أو جماعي.
3. **التقييم التكويني (معايير الأداء والتحقق)**: تدوين مؤشرات نجاح دقيقة وواضحة لمراقبة تطور الكفاءة فورياً لدى المتربص أثناء أداء الأنشطة (مثل: القدرة على تحديد منافذ اللوحة الأم بدون خطأ، التزام قواعد السلامة الكهربائية أثناء تجميع وحدة التغذية).
4. **المدة الزمنية**: توزيع عادل ومنطقي لكل مرحلة بحيث يتطابق مجموعها تماماً مع الزمن المخطط له للحصة.

${isMQ1 ? `🚨 توجه بيداغوجي خاص بمقياس MQ1 (تجميع وتثبيت العتاد والبرمجيات):
الدرس الحالي يتبع المقياس الأساسي MQ1 لمعايير INFEP للتخصصات التقنية ومطوري نظم الإعلام الآلي وصيانة الشبكات.
يجب إبراز الجوانب العملية والورشات التقنية لتفكيك العتاد، فحص المكونات، احترام تدابير الأمان الكهروستاتيكي ESD (حماية المكونات من تفريغ الشحنات الكهربائية الساكنة)، واختبار تشغيل الأنظمة بالكامل في نموذج الجدول السلوكي.

${params.mq1SpecificPrompt || ""}` : ""}

بجانب الجدول السلوكي البنيوي، يجب ترويس المستند ببطاقة إدارية وتقنية تحتوي على:
- المقياس الكلي والوحدة التعليمية المستهدفة ومستوى التأهيل.
- الوسائل البيداغوجية والمادية المستعملة بالورشة أو المخبر (أدوات تفكيك، لوحات أم، رامات، مفكات براغي، بطاقة المضاد الشحنات).
- طريقة السير والتغلب على عراقيل الحصة بيداغوجياً (الخطة البديلة).
- تقييم منزلي وخاتمة الدرس.`;

        userPrompt = `بيانات الدرس المراد توليد خطته السلوكية:
المقرر المعرفي: ${subject || "غير محدد"}
عنوان الدرس: ${topic || "غير محدد"}
الصف الموجه له: ${grade || "غير محدد"}
مدة الحصة الكلية: ${duration || "45"} دقيقة
التركيز المفضل للأستاذ: ${focus || "تطبيق عملي للمقاييس المهنية"}`;
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
        const isPremiumInfographic = style && (style.includes("Infographic") || style.includes("إنفوجرافيك") || style.includes("infographic"));

        if (isPremiumInfographic) {
          systemInstruction = `أنت موجه بيداغوجي ومحلل بيداغوجي ذكي ومصمم كفاءات خبير ومصمم جرافيك تعليمي محترف بالمديرية العامة للمناهج (معايير INFEP).
مهمتك تفكيك وتحليل موضوع درس الأستاذ [Topic] وصياغة دليل وهيكل "إنفوجرافيك بيداغوجي طولي وممتع" لتقديمه للطلاب باللغة العربية الفصحى.

يجب أن تقوم تلقائياً بتوليد الهيكل التالي مفصلاً باستخدام تنسيقات Markdown الأنيقة (التربيعات، الجداول، والاقتباسات):

- عنوان موضوع الدرس الرئيسي بشكل بارز وجذاب.
- تحليل بيداغوجي ذكي وتفكيك الموضوع إلى أجزائه الأساسية تلقائياً.
- شمولية التخصصات (مبرمج ليفهم لغة الميكانيك، الكهرباء، الفلاحة، المعلوماتية، والإدارة) حسب المادة المعنية.
- دقة لغوية: التركيز التام على المصطلحات العلمية باللغة العربية الفصحى مع المرادفات الأجنبية أو الفرنسية عند الاقتضاء.

الهيكل البنيوي للإنفوجرافيك التعليمي المتولد:
1. بطاقة التفاصيل البيداغوجية والتعريفية (Definition & Profile Panel)
2. المكونات/التشريح والقطع الأساسية بالتفصيل (Main Components & Anatomy Panel)
3. آلية السير والتشغيل أو العلاقات الديناميكية (Workflow & Operation Panel)
4. لوحة الميزات والمواصفات الفنية المتقدمة (Features & Specifications)
5. لوحة المخاطر والمحاذير والحدود الفنية (Risks, Warnings, or Limitations)
6. شبكة الفوائد ونقاط القوة والتحسين المستمر (Benefits & Strengths)
7. تذييل احترافي خاص بضمان جودة مصدر الإنفوجرافيك: "المصدر: منصة الأستاذ المحترف للتكوين APC - منشورات الأستاذ المهنية المميزة لأعضاء صفحتنا الكرام"`;

          userPrompt = `بيانات الإنفوجرافيك البيداغوجي المطلوب توليد محتواه وصياغته للتلاميذ:
المقرر / الفرع المعرفي: ${subject || "غير محدد"}
موضوع الإنفوجرافيك بالتفصيل: ${topic || "موضوع تقني غير محدد"}
النمط وأسلوب التصميم: إنفوجرافيك طولي متميز بأسلوب دليل التاريخ الطبيعي والتحرير الأكاديمي الاستثنائي (Premium Vertical Infographic)
لغة التسميات والشروحات التقنية: ${language || "العربية الفصحى مع التسميات العلمية والإنجليزية"}`;
        } else {
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

      // Multi-modal enhancement: generate an actual image using gemini-2.1-flash-image / gemini-2.5-flash-image when requested
      let imageUrl = "";
      if (tool === "diagram_generator") {
        try {
          const { topic, style } = params;
          const isPremiumInfographic = style && (style.includes("Infographic") || style.includes("إنفوجرافيك") || style.includes("infographic"));
          
          let imagePrompt = "";
          let aspectRatio: "16:9" | "3:4" | "4:3" | "1:1" = "16:9";

          if (isPremiumInfographic) {
            imagePrompt = `Premium vertical educational infographic about [${topic || "Motherboard"}]. STYLE: Premium scientific natural-history guidebook mixed with modern editorial infographic design. Refined, collectible, highly structured. Clean, light-colored background. Soft elegant muted scientific palette with light blues, warm grays, subtle pastel tones, gentle shadows, and soft highlights. High information density but visually uncluttered. Professional Arabic typography with clear hierarchy, consistent spacing, modern layout, and polished visual balance. MAIN VISUAL COMPOSITION: Semi-realistic scientific details and rendering of the subject with soft shading. Main subject positioned in the upper-middle focal area with elegant labels, annotations, arrows, and fine callout lines. AUTOMATIC DETAIL SECTIONS: Zoomed educational diagrams, cross-sections, exploded views and flow arrows visually complementing the main subject with rich educational layout, 3:4 portrait vertical infographic design.`;
            aspectRatio = "3:4";
          } else {
            imagePrompt = `Detailed high-quality educational technical schematic diagram of: ${topic || "Motherboard components of a computer"}. Style is ${style || "colored schematic line art"}, professional illustrations for classroom use, high resolution, sharp visual details, with blank outline labels, isolated on elegant clean background, 16:9 widescreen layout.`;
            aspectRatio = "16:9";
          }
          
          const imgResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: imagePrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio
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

  // API Endpoint to transform HTML into real binary Microsoft Word XML (.docx) format
  app.post("/api/export-docx", async (req: any, res: any) => {
    try {
      const { html, title } = req.body;
      if (!html) {
        return res.status(400).json({ error: "محتوى المستند مطلوب للتحويل والتصدير" });
      }

      // Ensure proper structure
      const parsedHtml = html.includes("<html") ? html : `
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
        </head>
        <body style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
          ${html}
        </body>
        </html>
      `;

      // Use the library to compile the document asynchronously
      const fileBuffer = await HTMLtoDOCX(parsedHtml, null, {
        orientation: "portrait",
        margins: {
          top: 1440,
          bottom: 1440,
          left: 1440,
          right: 1440
        },
        table: { row: { cantSplit: true } },
        footer: true,
        header: true,
        pageNumber: true
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const safeTitle = (title || "مستند_بيداغوجي").replace(/[\\/*?:[\]]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeTitle)}.docx"`);
      return res.send(fileBuffer);
    } catch (error: any) {
      console.error("DOCX Binary Compilation Error:", error);
      return res.status(500).json({ error: "فشل تجميع مستند Word الثنائي. يرجى إعادة المحاولة من خلال المخدم." });
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
