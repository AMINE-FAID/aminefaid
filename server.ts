import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

// Ensure local environment works perfectly with single-stack standard protocols
dns.setDefaultResultOrder('ipv4first');

// ============= LOGGER =============
function log(level: 'info' | 'error' | 'warn', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// ============= RATE LIMITING =============
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'عدد الطلبات كثير جداً، يرجى المحاولة لاحقاً',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' // Skip rate limiting in development
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // ============= CORS CONFIGURATION =============
  const corsOptions = {
    origin: process.env.APP_URL || '*',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));

  // ============= HEALTH CHECK ENDPOINT =============
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Lazy initialize the AI client to prevent crash-on-startup if GEMINI_API_KEY is missing
  let aiClient: any = null;
  
  function getAiClient() {
    const key = process.env.GEMINI_API_KEY;
    
    // Validate API key exists and is not the placeholder
    if (!key || key.trim() === "" || key === "MY_GEMINI_API_KEY") {
      log('warn', 'Gemini API key is missing or invalid');
      throw new Error("UNAUTHORIZED");
    }
    
    if (!aiClient) {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        log('info', 'AI Client initialized successfully');
      } catch (err: any) {
        log('error', 'Failed to initialize AI Client', err.message);
        throw new Error("CONFIG_ERROR");
      }
    }
    return aiClient;
  }

  // ============= INPUT VALIDATION =============
  interface GenerateRequest {
    tool: string;
    params?: Record<string, any>;
  }

  const requiredFieldsByTool: Record<string, string[]> = {
    'lesson_planner': ['subject', 'topic', 'grade'],
    'curriculum_planner': ['course', 'term', 'grade'],
    'assessment_generator': ['testType', 'topic', 'grade'],
    'performance_report': ['classGroup', 'numStudents'],
    'admin_copilot': ['documentType', 'tone'],
    'diagram_generator': ['subject', 'topic']
  };

  function validateInput(tool: string, params: any): { valid: boolean; error?: string } {
    if (!tool || typeof tool !== 'string') {
      return { valid: false, error: 'نوع الأداة مطلوب وغير صحيح' };
    }

    if (!params || typeof params !== 'object') {
      return { valid: false, error: 'المعاملات مطلوبة وتجب أن تكون object' };
    }

    const required = requiredFieldsByTool[tool];
    if (required) {
      const missing = required.filter(f => !params[f]);
      if (missing.length > 0) {
        return { 
          valid: false, 
          error: `الحقول المطلوبة: ${missing.join(', ')}` 
        };
      }
    }

    return { valid: true };
  }

  // API Endpoint for generation
  app.post("/api/generate", apiLimiter, async (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();

    // Set timeout for the entire request (30 seconds)
    const timeout = setTimeout(() => {
      log('warn', `Request ${requestId} timed out`, { tool: req.body.tool });
      if (!res.headersSent) {
        res.status(408).json({ 
          error: "انتهت مهلة الانتظار - يرجى المحاولة بطلب أقل تعقيداً" 
        });
      }
    }, 30000);

    try {
      const { tool, params } = req.body as GenerateRequest;
      
      log('info', `New request ${requestId}`, { tool });

      // ============= INPUT VALIDATION =============
      const validation = validateInput(tool, params);
      if (!validation.valid) {
        clearTimeout(timeout);
        return res.status(400).json({ error: validation.error });
      }

      let ai;
      try {
        ai = getAiClient();
      } catch (err: any) {
        clearTimeout(timeout);
        log('error', `Request ${requestId} - AI Client error`, err.message);
        
        if (err.message === "UNAUTHORIZED") {
          return res.status(401).json({
            error: "مفتاح API الخاص بـ Gemini غير متوفر. يرجى إعداد المفتاح في لوحة 'Secrets' في شاشة إعدادات التطبيق."
          });
        }
        
        return res.status(500).json({
          error: "خطأ في تكوين الخادم. يرجى الاتصال بالدعم."
        });
      }

      let systemInstruction = "";
      let userPrompt = "";

      if (tool === "lesson_planner") {
        const { subject, topic, grade, duration, focus } = params!;
        systemInstruction = `أنت موجه بيداغوجي وأستاذ ذكي عالي الكفاءة في قطاع التكوين المهني بالجزائر والوطن العربي.
مهمتك الأساسية هي صياغة "مخطط درس نموذجي سلوكي" باللغة العربية متوافق تماماً مع المعايير البيداغوجية للمعهد الوطني للتكوين المهني (INFEP).

يجب بشكل صارم ومطلق أن تصمم خطة الدرس في جدول سلوكي مهيكل بالتفصيل كما يلي (استخدم جدول Markdown متوافق تماماً):
| مرحلة | مواضيع التكوين | الروابط | عناصر المحتوى | المدة | الانشطة البيداغوجية (ما أفعله) (ما يفعله المتربص) | تنويعات وتكيفات تربوية |

قم بملء هذا الجدول بشكل غني بيداغوجياً:
1. المراحل (مثل: تمهيد وانطلاق، عرض واكتساب، تطبيق وممارسة، تقييم وخاتمة).
2. مواضيع التكوين والروابط بوضوح (الربط مع المقاييس القبلية والبعدية مثل MQ1, MQ2, MC2 إلخ).
3. تفصيل "الأنشطة البيداغوجية" لتشمل بالتفصيل دور المكون ودور المتربص (مثال: 'يقدم المكون عرضاً تفاعلياً حول...').
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
التركيز المفضل للأستاذ: ${focus || "تطبيق عملي للمقاييس المهنية"}`;
      } 
      else if (tool === "curriculum_planner") {
        const { course, term, grade, weeks, objectives } = params!;
        systemInstruction = `أنت خبير هندسة المناهج ومصمم المخططات البيداغوجية بالمديرية العامة للمناهج (معايير INFEP).
مهمتك توليد "مخطط مقياس وتوزيع كفاءات فصلي/سنوي سلوكي" باللغة العربية تفصيلي ومريح للأستاذ، مصمم ومبني بالكفاءة الكاملة.

يجب وبشكل قاطع توليد تخطيط المقياس في هيكل جدول المقاربة بالكفاءات (APC) لـ INFEP كما يلي:
| الأغراض الوسطية (الموضحات عن السلوك المرتقب) | المدة (ساعة) | العناصر المحتوى الأساسية | الانشطة البيداغوجية | معايير التقييم |

محددات تصميم المخطط:
1. الترويسة العليا الرسمية: يجب كتابة ترويسة إدارية تحتوي على الجمهورية والوزارة والمعهد الوطني (INFEP).
2. معلومات المقياس: رقم وعنوان المقياس، الكفاءة المستهدفة بتسمياتها المنهجية، نوع الكفاءة (مهنية أو مكملة).
3. تفصيل الوحدات بذكاء: تقسيم المادة للأغراض والنشاطات البيداغوجية مع آليات التقييم المستمر.`;
        userPrompt = `بيانات وخصائص المقياس التعليمي:
اسم المادة / المقياس: ${course || "غير محدد"}
الصف الدراسي ومستواهم: ${grade || "غير محدد"}
الفصل الدراسي المقصود: ${term || "كامل الدورة التكوينية"}
عدد الأسابيع المخططة: ${weeks || "8 أسابيع"}
الأهداف الكفاءتية المستهدفة: ${objectives || "استيعاب الممارسات والتثبيت والتركيب الفني"}`;
      }
      else if (tool === "assessment_generator") {
        const { testType, topic, grade, difficulty, numQuestions } = params!;
        systemInstruction = `أنت مقوم تربوي محترف ومصمم أسئلة وتدفقات معيارية لقياس فهم الطلاب.
مهمتك توليد "اختبار / تقييم بيداغوجي متكامل" باللغة العربية يبتعد كلياً عن الحفظ الآلي ويقيس الفروق المعرفية الفعلية.
تأكد من أن يشمل الاختبار:
1. إرشادات واضحة وودية لتخفيف قلق الاختبار وتوعية الطلاب بطريقة التفاعل.
2. أسئلة متنوعة (اختيار من متعدد بمشتتات مدروسة، أسئلة فهم مفتوحة، أو مشكلة وضعية مركبة).
3. "شبكة التصحيح التفصيلية النموذجية" (معايير التصحيح المقترحة لكل سؤال بالتفصيل ومقدار النقاط).
4. تحديد الهدف المنهجي من كل سؤال (ما هي الكفاءة المحددة المقاسة؟).
صغ المخرجات بوضوح وأناقة في صيغة Markdown جاهز للنسخ الفوري أو الطباعة.`;
        userPrompt = `مواصفات التقييم المرجو:
المادة والموضوع المستهدف: ${topic || "غير محدد"}
نوع التقييم: ${testType || "اختبار تكويني متوسط"}
الصف الدراسي ومستواهم: ${grade || "غير محدد"}
مستوى الصعوبة المطلوب: ${difficulty || "متوسط"}
عدد الأسئلة المستهدفة: ${numQuestions || "5 أسئلة"}`;
      }
      else if (tool === "performance_report") {
        const { classGroup, numStudents, rawNotes, reportType } = params!;
        systemInstruction = `أنت موجه تربوي ومتحدث محترف خبير في تفريغ ملحوظات الأستاذ إلى تقارير تقييم رسمية.
مهمتك هي تحليل ملحوظات الأستاذ العشوائية السريعة وعلامات الطلاب وصياغة "تقرير أداء بيداغوجي تربوي" باللغة العربية الفصحى المهذبة.
الخيارات لنمط الصياغة:
- إذا كان التقرير لـ "أولياء الأمور": ركز على الجوانب التشجيعية، السلوك البيداغوجي، الفرص الملموسة للتحسين.
- إذا كان التقرير لـ "إدارة المدرسة": ركز على الإحصاءات العامة وعلامات الضعف الأكثر شيوعاً والتوصيات الجماعية.
قم بهيكلة التقرير وتفقيطه باستخدام Markdown، مع استخدام علامات واضحة وأسماء وهمية إذا لزم الأمر لوضع مثال إيضاحي.`;
        userPrompt = `تفاصيل تقرير الفئة:
الفوج/الصف: ${classGroup || "غير محدد"}
عدد الطلاب المقدر: ${numStudents || "عينة دراسية"}
نوع التقرير المستهدف: ${reportType || "تقرير مخصص لأولياء الأمور"}
ملحوظات الأستاذ المكتوبة بسرعة أو البيانات المتوفرة:
${rawNotes || "مستوى تفاعلي طيب مع الحاجة لتحسين التعبير وملاحظات دقيقة في الحساب."}`;
      }
      else if (tool === "admin_copilot") {
        const { documentType, tone, bulletPoints, recipient } = params!;
        systemInstruction = `أنت مساعد إداري مدرسي فائق الجودة متمكن من اللوائح وأدبيات المراسلات والمكاتبات الرسمية للمؤسسات التعليمية.
مهمتك دمج الأفكار العشوائية للأستاذ وصياغة "وثيقة إدارية أو خطاب رسمي بيداغوجي" باللغة العربية الفصحى الفاضلة مع حفظ المعنى والدقة.
يجدر بالوثيقة أن تحترم الهيكل الإداري الكلاسيكي بدقة بالغة:
1. الترويسة العليا (وزارة التربية أو تسمية تذكيرية إدارية عامة).
2. تحديد التاريخ والمستلم والموضوع.
3. التمهيد والترحيب والتحية الأخلاقية الراقية.
4. صياغة صلب الموضوع بفقرات متقنة ومهذبة، محكمة النبرة والهدف حسب المطلوب (دبلوماسية حذرة، حازمة ومنظمة، أو ودية).
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
        const { subject, topic, style, language } = params!;
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
      else {
        clearTimeout(timeout);
        log('warn', `Request ${requestId} - Unknown tool: ${tool}`);
        return res.status(400).json({ error: "نوع الأداة غير معروف" });
      }

      // Generate the vocational context block if provided
      let vocationalContext = "";
      if (params && params.programName) {
        vocationalContext = `\n\n[سياق بيداغوجي رسمي للتكوين المهني]:
- هذا المستند يتبع رسمياً المنهاج الوزاري لبرنامج: ${params.programName} ${params.programCode ? `(رمز: ${params.programCode})` : ""}
- الشهادة المستهدفة: ${params.diploma || "شهادة التكوين المهني"}
- الوحدة التعليمية أو المادة المقصودة: ${params.moduleCode || ""} - ${params.moduleTitle || ""}.
- توجيه خاص: يرجى كتابة وتفصيل المحتوى التعليمي ليكون متوافقاً تماماً مع الكفاءات المنهجية والمقاييس المعتمدة من INFEP.`;
      }

      if (vocationalContext) {
        userPrompt += vocationalContext;
      }

      // ============= QUERY GEMINI WITH ERROR HANDLING =============
      let generatedText = "";
      
      try {
        const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        
        log('info', `Request ${requestId} - Calling Gemini with model: ${model}`, { tool });

        const response = await ai.models.generateContent({
          model: model,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });

        // Validate response structure
        if (!response || !response.text) {
          log('error', `Request ${requestId} - Empty response from Gemini`, { tool });
          clearTimeout(timeout);
          return res.status(502).json({
            error: "فشل توليد المحتوى: رد فارغ من خدمة الذكاء الاصطناعي"
          });
        }

        generatedText = response.text;
        log('info', `Request ${requestId} - Content generated successfully`, { 
          tool, 
          contentLength: generatedText.length 
        });

      } catch (aiError: any) {
        log('error', `Request ${requestId} - Gemini API error`, {
          error: aiError.message,
          code: aiError.code
        });
        clearTimeout(timeout);

        // Handle specific Gemini errors
        if (aiError.message?.includes('API key')) {
          return res.status(401).json({
            error: "خطأ في المصادقة. يرجى التحقق من إعدادات الخادم."
          });
        }

        if (aiError.message?.includes('quota') || aiError.message?.includes('rate')) {
          return res.status(429).json({
            error: "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً."
          });
        }

        return res.status(503).json({
          error: "خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة لاحقاً."
        });
      }

      // ============= GENERATE DIAGRAM IMAGE (OPTIONAL) =============
      let imageUrl = "";
      if (tool === "diagram_generator") {
        try {
          const { topic, style } = params!;
          const imagePrompt = `Create a detailed, educational, and clear technical schematic diagram of: "${topic}". 
Style: ${style || "colored technical schematic"}. 
Format: Professional educational illustration suitable for classroom use.
Aspect ratio: 16:9`;
          
          log('info', `Request ${requestId} - Attempting to generate image`, { topic });

          // Use gemini-2.0-flash instead of non-existent gemini-2.5-flash-image
          const imgResponse = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: { parts: [{ text: imagePrompt }] },
            config: {
              temperature: 0.8,
            }
          });

          // Safe extraction of image data
          if (imgResponse?.candidates?.[0]?.content?.parts) {
            const imagePart = imgResponse.candidates[0].content.parts.find((p: any) => p.inlineData?.data);
            if (imagePart?.inlineData?.data) {
              imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
              log('info', `Request ${requestId} - Image generated successfully`);
            }
          }
        } catch (imgErr: any) {
          log('warn', `Request ${requestId} - Image generation failed (non-critical)`, {
            error: imgErr.message
          });
          // Image generation is optional, don't fail the entire request
          imageUrl = "";
        }
      }

      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      log('info', `Request ${requestId} completed`, { tool, duration: `${duration}ms` });

      return res.json({ 
        result: generatedText, 
        imageUrl,
        requestId,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      log('error', `Request ${requestId} - Unhandled error`, {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });

      if (!res.headersSent) {
        return res.status(500).json({
          error: "حدث خطأ غير متوقع أثناء معالجة الطلب",
          requestId
        });
      }
    }
  });

  // ============= STATIC FILES / VITE SERVER =============
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    log('info', 'Vite development server middleware loaded');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    log('info', 'Production static file serving configured');
  }

  // ============= START SERVER =============
  app.listen(PORT, "0.0.0.0", () => {
    log('info', `Smart Professor Fullstack Backend running on http://localhost:${PORT}`);
    log('info', `Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
