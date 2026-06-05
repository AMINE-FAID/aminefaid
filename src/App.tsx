import { useState, useEffect, useCallback } from "react";
import { BookOpen, Calendar, Award, FileText, Mail, Sparkles, Clock, Copy, Download, Save, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Plus, Trash2, Heart, TrendingUp, BookOpenCheck, RotateCw, FolderLock, CreditCard as Edit2, Check, ChevronRight, Menu, Coffee, Circle as HelpCircle, Image, LogOut, User, Cloud, CloudOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import AuthPage from "./components/AuthPage";

import {
  uploadToGoogleDrive,
  createGoogleSheet,
  createCalendarEvent,
  createGoogleSlides,
  createGoogleTask,
  sendGoogleChatMessage,
  createGoogleForm
} from "./utils/googleWorkspace";

import { 
  ActiveTool, 
  SavedItem,
  LessonPlannerParams,
  CurriculumPlannerParams,
  AssessmentParams,
  PerformanceReportParams,
  AdminCopilotParams,
  DiagramGeneratorParams
} from "./types";

import { 
  LESSON_PRESETS, 
  CURRICULUM_PRESETS, 
  ASSESSMENT_PRESETS, 
  REPORT_PRESETS, 
  ADMIN_PRESETS 
} from "./data/examples";

import { 
  PRELOADED_VOCATIONAL_PROGRAMS,
  VocationalProgram,
  VocationalModule,
  getSuggestedTopicsForModule
} from "./data/vocationalCurricula";

import { 
  downloadTextFile, 
  downloadHtmlDocument,
  copyToClipboard, 
  TEACHER_WELLNESS_TIPS, 
  PEDAGOGICAL_APC_PILLARS 
} from "./utils/helpers";

const DIAGRAM_PRESETS = [
  {
    label: "اللوحة الأم للحاسوب",
    data: {
      subject: "المعلوماتية والتربية التكنولوجية",
      topic: "مكونات اللوحة الأم ومعالج الحاسوب الدقيق والمنافذ",
      style: "مخطط تخطيطي ملون عالي التقنية (Colored schematic line art)",
      language: "العربية الفصحى مع التسميات الإنجليزية"
    }
  },
  {
    label: "الدارة الكهربائية البسيطة",
    data: {
      subject: "العلوم الفيزيائية والتكنولوجية",
      topic: "الدارة الكهربائية البسيطة والمولد والمستقبلات والقاطعة والأسلاك بأسلوب المقاربة بالكفاءات",
      style: "مخطط تخطيطي ملون عالي التقنية (Colored schematic line art)",
      language: "العربية والرموز الفيزيائية العالمية"
    }
  },
  {
    label: "الخلية الحيوانية ومكوناتها",
    data: {
      subject: "علوم الطبيعة والحياة",
      topic: "الخلية الحيوانية وجدارها الخلوي والنواة والميتوكوندريا",
      style: "مخطط تخطيطي ملون عالي التقنية (Colored schematic line art)",
      language: "العربية الفصحى لطلاب العلوم"
    }
  }
];

export default function App() {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setAuthLoading(false);
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSavedItems([]);
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<"tools" | "vocational_curriculums" | "satchel" | "guide" | "google_workspace">("tools");
  const [activeTool, setActiveTool] = useState<ActiveTool>("lesson_planner");

  // Google Workspace States
  const [gToken, setGToken] = useState<string | null>(() => {
    const raw = localStorage.getItem("smart_professor_google_setup");
    if (raw) {
      try { return JSON.parse(raw).token || null; } catch(e) {}
    }
    return null;
  });
  const [gClientId, setGClientId] = useState<string | null>(() => {
    const raw = localStorage.getItem("smart_professor_google_setup");
    if (raw) {
      try { return JSON.parse(raw).clientId || null; } catch(e) {}
    }
    return null;
  });
  const [gIsConnecting, setGIsConnecting] = useState(false);
  const [gSuccessMsg, setGSuccessMsg] = useState<string | null>(null);

  // Google Workspace App-Specific States
  const [driveExportStatus, setDriveExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [driveFileUrl, setDriveFileUrl] = useState<string | null>(null);

  const [sheetExportStatus, setSheetExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const [calEventTitle, setCalEventTitle] = useState("شرح مقياس تركيب العتاد والمادة MQ1");
  const [calEventDesc, setCalEventDesc] = useState("حصة تطبيقية تفصيلية لطلاب مستغل المعلوماتية لتركيب اللوحة الأم والمعالج والذاكرة");
  const [calEventDate, setCalEventDate] = useState("2026-06-04");
  const [calEventStart, setCalEventStart] = useState("09:00");
  const [calEventEnd, setCalEventEnd] = useState("10:30");
  const [calExportStatus, setCalExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [calendarEventUrl, setCalendarEventUrl] = useState<string | null>(null);

  const [slidesExportStatus, setSlidesExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [slidesUrl, setSlidesUrl] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("مراجعة كرايس المتربصين لـ MQ1 وتثبيت BIOS");
  const [taskNotes, setTaskNotes] = useState("تقييم مدى استيعاب الطلاب لتركيب أنظمة التشغيل والتعريفات الأساسية.");
  const [taskExportStatus, setTaskExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const [chatWebhookUrl, setChatWebhookUrl] = useState("https://chat.googleapis.com/v1/spaces/AAAAxxxx/messages");
  const [chatMessageText, setChatMessageText] = useState("مرحباً بالزملاء، قمت للتو بتوليد وتعديل مخطط الدرس السلوكي الجديد لـ MQ1 وهو جاهز للمراجعة بأسلوب المقاربة بالكفاءة.");
  const [chatExportStatus, setChatExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const [formsExportStatus, setFormsExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formsUrl, setFormsUrl] = useState<string | null>(null);

  // Vocational Curriculum States
  const [vocationalPrograms, setVocationalPrograms] = useState<VocationalProgram[]>(PRELOADED_VOCATIONAL_PROGRAMS);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("micro_info_operator");
  const [selectedModuleCode, setSelectedModuleCode] = useState<string>("MQ1");

  // Add Custom program helper form states (Inline in tab)
  const [newProgName, setNewProgName] = useState("");
  const [newProgCode, setNewProgCode] = useState("");
  const [newProgDiploma, setNewProgDiploma] = useState("");
  const [newProgDuration, setNewProgDuration] = useState("");
  const [newModuleCodeInput, setNewModuleCodeInput] = useState("");
  const [newModuleTitleInput, setNewModuleTitleInput] = useState("");
  const [newModuleDescInput, setNewModuleDescInput] = useState("");
  const [newModuleHoursInput, setNewModuleHoursInput] = useState<number>(30);
  const [newProgModulesList, setNewProgModulesList] = useState<VocationalModule[]>([]);
  const [expandedProgId, setExpandedProgId] = useState<string | null>("micro_info_operator");

  // Form Parameters States
  const [lessonParams, setLessonParams] = useState<LessonPlannerParams>({
    subject: "العلوم الفيزيائية والتكنولوجية",
    topic: "ظاهرة انكسار الضوء وقانون سنيل",
    grade: "السنة الثانية متوسط",
    duration: "45",
    focus: "الفهم التجريبي الملموس باستخدام مؤشرات ليزر وكوب ماء زجاجي وتطبيقات بصرية"
  });

  const [curriculumParams, setCurriculumParams] = useState<CurriculumPlannerParams>({
    course: "الرياضيات والجبر الأساسي",
    term: "الفصل الدراسي الأول",
    grade: "السنة الرابعة متوسط",
    weeks: "12 أسبوعاً بيداغوجياً",
    objectives: "التحكم في القواسم المشتركة الأكبر (PGCD)، الحساب على الجذور المربعة، ومبرهنة طاليس."
  });

  const [assessmentParams, setAssessmentParams] = useState<AssessmentParams>({
    testType: "اختبار فجائي قصير (تقييم تكويني)",
    topic: "كان وأخواتها وتأثيرها الإعرابي على الجملة الاسمية",
    grade: "الصف الخامس ابتدائي",
    difficulty: "متوسط",
    numQuestions: "4 أسئلة متنوعة التدرج"
  });

  const [reportParams, setReportParams] = useState<PerformanceReportParams>({
    classGroup: "الفوج 2 (رياضيات)",
    numStudents: "25 طالباً",
    reportType: "رسائل فردية دافئة ومخصصة لأولياء الأمور للتحسن",
    rawNotes: "أحمد: أداؤه ممتاز وذكي برهن في تمرين طاليس. وسام: يعاني من خوف شديد من الاختبارات ويحتاج لمزيد من الدعم النفسي بالبيت. رانيا: ممتازة لكن متسرعة في الحسابات والتفاصيل الصغيرة. إياد: غائب ولم يحضر، يرجى تذكير العائلة بمواعيد إعادة الفروض للتوازن."
  });

  const [adminParams, setAdminParams] = useState<AdminCopilotParams>({
    documentType: "استدعاء رسمي مستعجل لولي الأمر لمناقشة السلوك الدراسي والتراجع",
    recipient: "ولي أمر التلميذ المحترم هادئ السلوك",
    tone: "تربوية حازمة مغلفة بالدبلوماسية ورعاة مصلحة التلميذ",
    bulletPoints: "تكرر التأخر الصباحي لأكثر من 5 مرات متتالية هذا الشهر، فقدان تام لكراريس الفروض، تراجع حاد في المشاركة الصفية. نرجو الحضور العاجل لمكتب مستشار التوجيه يوم الأحد 10 صباحاً للتعاون."
  });

  const [diagramParams, setDiagramParams] = useState<DiagramGeneratorParams>({
    subject: "تكنولوجيا المعلومات والاتصال",
    topic: "مكونات اللوحة الأم (Motherboard) ومعالجة البيانات للحاسوب",
    style: "مخطط تخطيطي ملون عالي التقنية (Colored schematic line art)",
    language: "العربية الفصحى مع التسميات الإنجليزية"
  });

  // Generation & AI Output States
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputResult, setOutputResult] = useState<string>("");
  const [editableContent, setEditableContent] = useState<string>("");
  const [outputImageUrl, setOutputImageUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Persistence States (Teacher's Satchel)
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [timeSaved, setTimeSaved] = useState<number>(14.5); // Dynamic counter in hours
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Load and Save to LocalStorage + Supabase
  useEffect(() => {
    // Load local-only data (programs etc.)
    const savedProgs = localStorage.getItem("smart_professor_vocational_programs");
    if (savedProgs) {
      try { setVocationalPrograms(JSON.parse(savedProgs)); } catch (e) { /* ignore */ }
    }
    const savedHours = localStorage.getItem("smart_professor_time_saved");
    if (savedHours) setTimeSaved(parseFloat(savedHours));
  }, []);

  // Load satchel from Supabase when session changes
  useEffect(() => {
    if (!session) {
      setSavedItems([]);
      return;
    }
    (async () => {
      setSyncStatus("syncing");
      const { data, error } = await supabase
        .from("satchel_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load satchel:", error);
        setSyncStatus("error");
        return;
      }
      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        tool: item.tool as ActiveTool,
        content: item.content,
        imageUrl: item.image_url || undefined,
        timestamp: new Date(item.created_at).toLocaleDateString("ar-EG", {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit"
        })
      }));
      setSavedItems(mapped);
      setSyncStatus("synced");
    })();
  }, [session]);

  // Update dynamic time counter index periodically for micro-motivation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TEACHER_WELLNESS_TIPS.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Loading Steps Rotation
  useEffect(() => {
    if (!isGenerating) return;
    const steps = [
      "جاري استدعاء المعايير البيداغوجية لقاعدة المعرفة...",
      "تطبيق بروتوكول التفكيك المعرفي وتفكيك المفاهيم المادية...",
      "ملاءمة المبادئ الأولى لتفعيل الفهم الحقيقي وتقليل الملل...",
      "بناء جدول زمني دقيق خطوة بخطوة لكل دقيقة من زمن الدوام...",
      "تقييم ملاءمة الوقت المقدر لمراعاة التمايز وصعوبات التعلم...",
      "صياغة وضعيات الاحتكاك الخصومي وتأمين خطة طوارئ إضافية..."
    ];
    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setLoadingStep(steps[stepIdx]);
    }, 3000);
    return () => clearInterval(stepInterval);
  }, [isGenerating]);

  // Handle Preset Lode
  const loadPreset = (tool: ActiveTool, data: any) => {
    setErrorMsg(null);
    if (tool === "lesson_planner") setLessonParams(data);
    else if (tool === "curriculum_planner") setCurriculumParams(data);
    else if (tool === "assessment_generator") setAssessmentParams(data);
    else if (tool === "performance_report") setReportParams(data);
    else if (tool === "admin_copilot") setAdminParams(data);
    else if (tool === "diagram_generator") setDiagramParams(data);
  };

  // Apply Selected Vocational Module data directly to Generator Tools
  const applyModuleToTools = (mod: VocationalModule, prog: VocationalProgram) => {
    setErrorMsg(null);
    const topics = getSuggestedTopicsForModule(mod.code, mod.title);
    
    // 1. Populate Lesson Planner
    setLessonParams({
      subject: `${prog.name} - مقياس: ${mod.code}`,
      topic: topics[0] || mod.title,
      grade: prog.diploma,
      duration: "90",
      focus: `المقاربة بالكفاءات (APC) لورشة التخريج في: ${mod.title}. ملخص البنيات: ${mod.description.slice(0, 100)}`
    });

    // 2. Populate Curriculum Planner
    setCurriculumParams({
      course: `${prog.name} - مقياس: ${mod.code}`,
      term: "توزيع المقياس بيداغوجياً",
      grade: prog.diploma,
      weeks: `${Math.ceil(mod.durationHours / 4)} أسبوعاً للتكوين (${mod.durationHours} ساعة كليا)`,
      objectives: `إيقاظ وتفعيل الكفاءات المهنية المتعلقة بمحور: ${mod.title}. العناصر: ${mod.description}`
    });

    // 3. Populate Assessment Generator
    setAssessmentParams({
      testType: "امتحان نهاية المقياس/الوحدة (تقييم الكفاءة الشامل)",
      topic: `${mod.code}: ${mod.title} - معايير تقييم الأداء والمخرجات الكفاءية`,
      grade: prog.diploma,
      difficulty: "متوسط",
      numQuestions: "3 أسئلة متنوعة التدرج مع وضعية إدماجية تطبيقية"
    });

    // 4. Populate Diagram Generator
    setDiagramParams({
      subject: `التكوين والتعليم المهني - ${mod.code}`,
      topic: mod.code === "MC2" ? "مكونات اللوحة الأم والذاكرة ووحدات المعالجة" : (mod.code === "MQ1" ? "تركيب وتجميع المكونات الأساسية للوحدة المركزية للحاسوب" : mod.title),
      style: "مخطط تخطيطي ملون عالي التقنية (Colored schematic line art)",
      language: "العربية الفصحى مع التسميات التقنية"
    });

    // Change tool and tab context, give visual confirmation
    setActiveTool("lesson_planner");
    setActiveTab("tools");
  };

  // Append new custom program with modules and save to local storage
  const handleAddProgram = (newProg: VocationalProgram) => {
    const updated = [...vocationalPrograms, newProg];
    setVocationalPrograms(updated);
    localStorage.setItem("smart_professor_vocational_programs", JSON.stringify(updated));
    setSelectedProgramId(newProg.id);
    setSelectedModuleCode(newProg.modules[0]?.code || "");
  };

  const handleDeleteProgram = (id: string) => {
    // Avoid deleting the preloaded operators program
    if (id === "micro_info_operator") return;
    const updated = vocationalPrograms.filter(p => p.id !== id);
    setVocationalPrograms(updated);
    localStorage.setItem("smart_professor_vocational_programs", JSON.stringify(updated));
    setSelectedProgramId("micro_info_operator");
    setSelectedModuleCode("MQ1");
  };

  // Build Params based on selected tool
  const currentParamsForActiveTool = () => {
    if (activeTool === "lesson_planner") return lessonParams;
    if (activeTool === "curriculum_planner") return curriculumParams;
    if (activeTool === "assessment_generator") return assessmentParams;
    if (activeTool === "performance_report") return reportParams;
    if (activeTool === "diagram_generator") return diagramParams;
    return adminParams;
  };

  // Perform Server API call triggers
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setCopied(false);
    setJustSaved(false);
    setOutputResult("");
    setEditableContent("");
    setOutputImageUrl("");

    try {
      const currentProg = vocationalPrograms.find(p => p.id === selectedProgramId);
      const currentMod = currentProg?.modules.find(m => m.code === selectedModuleCode);

      const baseParams = currentParamsForActiveTool();
      const payloadParams = currentProg ? {
        ...baseParams,
        programName: currentProg.name,
        programCode: currentProg.code,
        diploma: currentProg.diploma,
        moduleCode: currentMod?.code,
        moduleTitle: currentMod?.title,
        moduleDesc: currentMod?.description,
        moduleHours: currentMod?.durationHours
      } : baseParams;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tool: activeTool,
          params: payloadParams
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "فشل توليد المستند.");
      }

      setOutputResult(data.result);
      setEditableContent(data.result);
      if (data.imageUrl) {
        setOutputImageUrl(data.imageUrl);
      }
      
      // Increment and update saved state dynamically
      const addedHours = 1.5;
      const newHours = parseFloat((timeSaved + addedHours).toFixed(1));
      setTimeSaved(newHours);
      localStorage.setItem("smart_professor_time_saved", newHours.toString());

    } catch (err: any) {
      console.error("Generation error:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء التواصل مع الخادم التربوي الذكي.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Generated item into portfolio/satchel
  const handleSaveToSatchel = async () => {
    if (!editableContent.trim()) return;

    let titleText = "";
    if (activeTool === "lesson_planner") titleText = `خطة درس: ${lessonParams.topic}`;
    else if (activeTool === "curriculum_planner") titleText = `مخطط مادة: ${curriculumParams.course}`;
    else if (activeTool === "assessment_generator") titleText = `تقييم: ${assessmentParams.topic}`;
    else if (activeTool === "performance_report") titleText = `تقرير أداء: ${reportParams.classGroup}`;
    else if (activeTool === "diagram_generator") titleText = `مخطط بيداغوجي: ${diagramParams.topic}`;
    else titleText = `مراسلة إدارية: ${adminParams.documentType.slice(0, 30)}...`;

    const timestamp = new Date().toLocaleDateString("ar-EG", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    if (session) {
      setSyncStatus("syncing");
      const { data, error } = await supabase
        .from("satchel_items")
        .insert({
          title: titleText,
          tool: activeTool,
          content: editableContent,
          image_url: outputImageUrl || null
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save to Supabase:", error);
        setSyncStatus("error");
        return;
      }
      const newItem: SavedItem = {
        id: data.id,
        title: titleText,
        tool: activeTool,
        content: editableContent,
        imageUrl: outputImageUrl || undefined,
        timestamp
      };
      setSavedItems(prev => [newItem, ...prev]);
      setSyncStatus("synced");
    } else {
      // Fallback: localStorage only
      const newItem: SavedItem = {
        id: "sav_" + Date.now(),
        title: titleText,
        tool: activeTool,
        content: editableContent,
        imageUrl: outputImageUrl || undefined,
        timestamp
      };
      const updated = [newItem, ...savedItems];
      setSavedItems(updated);
      localStorage.setItem("smart_professor_satchel", JSON.stringify(updated));
    }

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  // Delete Item from portfolio
  const handleDeleteFromSatchel = async (id: string) => {
    if (session) {
      const { error } = await supabase.from("satchel_items").delete().eq("id", id);
      if (error) { console.error("Delete error:", error); return; }
    } else {
      const updated = savedItems.filter((item) => item.id !== id);
      localStorage.setItem("smart_professor_satchel", JSON.stringify(updated));
    }
    setSavedItems(prev => prev.filter((item) => item.id !== id));
  };

  // Copy with UI state feedback
  const handleCopy = async () => {
    const textToCopy = isEditing ? editableContent : outputResult;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Local document download
  const handleDownload = () => {
    const textToWrite = isEditing ? editableContent : outputResult;
    let filename = "";
    let titleStr = "وثيقة تربوية بيداغوجية";

    if (activeTool === "lesson_planner") {
      filename = `خطة_درس_${lessonParams.topic}.html`;
      titleStr = `خطة درس: ${lessonParams.topic}`;
    } else if (activeTool === "curriculum_planner") {
      filename = `مخطط_مادة_${curriculumParams.course}.html`;
      titleStr = `مخطط وتوزيع مقياس: ${curriculumParams.course}`;
    } else if (activeTool === "assessment_generator") {
      filename = `ملف_تقييم_${assessmentParams.topic}.html`;
      titleStr = `ملف تقييم ومراقبة: ${assessmentParams.topic}`;
    } else if (activeTool === "performance_report") {
      filename = `تقرير_طلاب_${reportParams.classGroup}.html`;
      titleStr = `تقرير بيداغوجي لنتائج الطلاب: ${reportParams.classGroup}`;
    } else if (activeTool === "diagram_generator") {
      filename = `مخطط_توضيحي_${diagramParams.topic}.html`;
      titleStr = `مخطط توضيحي بيداغوجي: ${diagramParams.topic}`;
    } else {
      filename = `وثيقة_إدارية_${adminParams.recipient}.html`;
      titleStr = `وثيقة إدارية بيداغوجية: ${adminParams.recipient}`;
    }

    downloadHtmlDocument(filename, titleStr, textToWrite, outputImageUrl || undefined);
  };

  // --- GOOGLE WORKSPACE API HANDLERS ---

  // Service 1: Drive Upload
  const handleDriveExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm("هل تأكد رغبتك في رفع المخطط البيداغوجي المفتوح حالياً كملف وثيقة مدمجة إلى حساب Google Drive الخاص بك؟");
    if (!confirmed) return;

    setDriveExportStatus("loading");
    setDriveFileUrl(null);
    try {
      const activeText = isEditing ? editableContent : outputResult;
      const safeTitle = (activeTool === "lesson_planner" ? lessonParams.topic : activeTool === "curriculum_planner" ? curriculumParams.course : "مستند_بيداغوجي").replace(/\s+/g, "_");
      const filename = `وثيقة_الأستاذ_${safeTitle}_${Date.now()}.html`;
      
      const res = await uploadToGoogleDrive(gToken, filename, activeText);
      setDriveFileUrl(res.webViewLink);
      setDriveExportStatus("success");
      setGSuccessMsg("تم رفع الملف إلى Google Drive بنجاح!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setDriveExportStatus("error");
      alert(`فشل التصدير لـ Drive: ${err.message}`);
    }
  };

  // Service 2: Google Sheets Export
  const handleSheetsExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm("هل تؤكد رفع وإنشاء جدول بيانات جديد في Google Sheets وتصدير التوزيع السلوكي المعياري لـ MQ1 إليه؟");
    if (!confirmed) return;

    setSheetExportStatus("loading");
    setSheetUrl(null);
    try {
      const title = `المخطط البيداغوجي لـ MQ1: تركيب العتاد المادي والبرمجي - INFEP`;
      const headers = [
        "الأغراض الوسطية (الموضحات السلوكية)",
        "المدة (ساعة)",
        "العناصر المحتوى الأساسية",
        "الأنشطة البيداغوجية (دور المكون والتربص)",
        "التقييم التكويني المستمر"
      ];
      const rows = [
        [
          "تحديد وتجهيز أدوات تفكيك عتاد الحاسوب وأجهزة الصيانة",
          "8 ساعات",
          "مفكات البراغي، السوار المعادل للشحنات، كتالوج اللوحة الأم، ورقة التوزيع الفني",
          "يقدم الأستاذ تعريف بقرصة الشاشات ومخاطر الكهرباء الراكدة ESD ويوجه الأسئلة السقراطية. يتدرب المتربص على ارتداء السوار وتأريض العناصر.",
          "فرض محروس تطبيقي مستقل لتحديد 10 قطع مختلفة للوحة الأم على طاولة الورشة"
        ],
        [
          "تركيب وتأمين لوحة الأم (Motherboard) في الهيكل المعدني",
          "12 ساعة",
          "براغي التثبيت، النتوءات النحاسية، المنافذ الخلفية، مقبس خط الإشارات الداخلي",
          "يشرح الأستاذ خطوات الفحص البصري للمقابس قبل التثبيت. يقوم الطالب بوضع اللوحة بمحاذاة فتحات الهيكل وربط البراغي بتثبيت متوازن.",
          "ملاحظة بصرية مباشرة مع سلم تنقيط (0-5) لسلامة التمديد الفيزيائي وغياب الاهتزاز"
        ],
        [
          "تثبيت وتأمين الميكرو-معالج (Processor) مع المبرد والرام",
          "15 ساعة",
          "المعجون الحراري، مقبس LGA/PGA، قاذف المشتت الحراري، شرائح الرام DDR4/DDR5",
          "يعرض الأستاذ خطوات تطبيق المعجون بدقة حبة الحمص وتوجيه السهم الذهبي للمعالج. يستخرج المتربص شرائح الرام ويدرجها بالمجرى بزاوية 90 درجة.",
          "استجواب شفوي سريع حول اتجاهات الرام ومخاطر الضغط غير المتناسق على أرجل المعالج"
        ],
        [
          "توصيل كابلات إمداد الطاقة واللوحة الأمامية والقرص الصلب SATA",
          "10 ساعات",
          "كابل ATX 24-pin، موصل EPS 12V، موصلات Front Panel، كابل نقل البيانات SATA",
          "يوضح الأستاذ خريطة الكابلات والجهود الكهربائية (+12V, +5V, +3.3V). يقوم المتربصون بدمج موصلات اللوحة الأمامية والتحكم في مفاتيح التشغيل LED.",
          "اختبار تشغيل المروحة الأمامية والخلفية وسماع نغمة الإشارة الأولية الصادرة من السماعة"
        ],
        [
          "الدخول لواجهة BIOS وتهيئة خيارات الإقلاع وتثبيت أنظمة التشغيل",
          "20 ساعة",
          "بيوس BIOS/UEFI، أولوية الإقلاع Boot Priority، واجهة التوزيع Multiboot، أنظمة ويندوز ولينكس",
          "يقود الأستاذ تجربة استدعاء البيوس عبر مفاتيح Del/F2 وتعديل إعدادات التمهيد والـ USB. يقوم الطالب بتقسيم الهاردوير وتثبيت ويندوز ولينكس.",
          "تثبيت نظام متعدد الإقلاع (Win/Linux) بنجاح وإظهار شاشة تهيئة GRUB عند بدء التشغيل"
        ]
      ];

      const res = await createGoogleSheet(gToken, title, headers, rows);
      setSheetUrl(res.spreadsheetUrl);
      setSheetExportStatus("success");
      setGSuccessMsg("تم إنشاء وتصدير جدول Google Sheet للوحدة MQ1 بنجاح!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetExportStatus("error");
      alert(`فشل تصدير Google Sheet: ${err.message}`);
    }
  };

  // Service 3: Calendar Event Create
  const handleCalendarExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm(`هل تؤكد إدراج الحصة التعليمية "${calEventTitle}" كحدث رسمي في تقويم Google Calendar الخاص بك؟`);
    if (!confirmed) return;

    setCalExportStatus("loading");
    setCalendarEventUrl(null);
    try {
      const startTime = `${calEventDate}T${calEventStart}:00`;
      const endTime = `${calEventDate}T${calEventEnd}:00`;
      
      const res = await createCalendarEvent(gToken, {
        summary: calEventTitle,
        description: calEventDesc,
        startTime,
        endTime
      });

      setCalendarEventUrl(res.htmlLink);
      setCalExportStatus("success");
      setGSuccessMsg("تم إدراج الحدث والحصة في تقويم Google Calendar بنجاح!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setCalExportStatus("error");
      alert(`فشل إدراج حدث التقويم: ${err.message}`);
    }
  };

  // Service 4: Google Slides Export
  const handleSlidesExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm("هل تؤكد توليد عرض بيداغوجي للدرس في Google Slides؟");
    if (!confirmed) return;

    setSlidesExportStatus("loading");
    setSlidesUrl(null);
    try {
      const title = `العرض البيداغوجي الرقمي لدرس: ${lessonParams.topic || "تركيب وتثبيت العتاد"}`;
      const slides = [
        {
          title: "مقدمة واصطلاحات بيداغوجية - معايير INFEP",
          bullets: [
            "تطوير السلوك البنائي لتركيب وتثبيت العتاد وفق الكفاءة المهنية المستهدفة",
            "استكشاف الكفاءة السلوكية الفرعية وتفكيك الآلة بأسلوب المقاربة بالكفاءة APC",
            "احترام مقاييس السلامة والأمن الصناعي وحماية المعالج من شحنات ESD"
          ]
        },
        {
          title: "عناصر المحتوى وسلسلة الأنشطة البيداغوجية لـ MQ1",
          bullets: [
            "تثبيت لوحة الأم بدقة واستعمال البراغي النحاسية لمنع التماس الكهربائي",
            "دمج وتطابق المعالج مع توجيه السهم وإدراك كمية معجون التبريد بدقة",
            "ربط خط الإقلاع ATX وإشارات لوحة التحكم الأمامية والقرص الصلب SATA"
          ]
        },
        {
          title: "الشبكة التقويمية والتحقق من الكفاءة",
          bullets: [
            "سلم التنقيط المهني المعتمد والمراقبة البصرية المباشرة للمتربص",
            "اختبار تشغيل المروحة وسماع نغمة الإشارة الأولية للبوت BIOS",
            "التمكن من تهيئة خيارات الإقلاع Boot Priority وتثبيت نظام التشغيل"
          ]
        }
      ];

      const res = await createGoogleSlides(gToken, title, slides);
      setSlidesUrl(res.slideUrl);
      setSlidesExportStatus("success");
      setGSuccessMsg("تم تصدير هيكل العرض البيداغوجي لـ Google Slides بنجاح!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSlidesExportStatus("error");
      alert(`فشل التصدير لعروض Google Slides: ${err.message}`);
    }
  };

  // Service 5: Google Tasks Create
  const handleTaskExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm(`هل تؤكد إدراج مهمة "${taskTitle}" في كشف Google Tasks لجدول أعمالك؟`);
    if (!confirmed) return;

    setTaskExportStatus("loading");
    try {
      await createGoogleTask(gToken, taskTitle, taskNotes);
      setTaskExportStatus("success");
      setGSuccessMsg("تم إدراج المهمة التربوية بنجاح في Google Tasks!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setTaskExportStatus("error");
      alert(`فشل إدراج المهمة: ${err.message}`);
    }
  };

  // Service 6: Google Chat Webhook Send
  const handleChatExport = async () => {
    if (!chatWebhookUrl.trim()) {
      alert("يرجى إدخال رابط الويب-هوك (Webhook) الخاص بـ Google Chat Space أولاً.");
      return;
    }
    const confirmed = window.confirm("هل أنت متأكد من إرسال هذا الإشعار البيداغوجي إلى قناة القسم أو الزملاء في Google Chat؟");
    if (!confirmed) return;

    setChatExportStatus("loading");
    try {
      const ok = await sendGoogleChatMessage(gToken, chatWebhookUrl, chatMessageText);
      if (ok) {
        setChatExportStatus("success");
        setGSuccessMsg("تم بث الإشعار إلى Google Chat Space بنجاح وحيوية!");
        setTimeout(() => setGSuccessMsg(null), 4000);
      } else {
        throw new Error("فشل الخادم في الرد بـ HTTP 200 OK");
      }
    } catch (err: any) {
      console.error(err);
      setChatExportStatus("error");
      alert(`فشل البث لـ Google Chat: ${err.message}`);
    }
  };

  // Service 7: Google Forms Quiz Create
  const handleFormExport = async () => {
    if (!gToken) {
      alert("يرجى إدخال رمز التحقق للربط مع Google أولاً.");
      return;
    }
    const confirmed = window.confirm("هل تؤكد توليد اختبار كفاءة تفاعلي وتصديره مباشرة إلى نماذج Google Forms؟");
    if (!confirmed) return;

    setFormsExportStatus("loading");
    setFormsUrl(null);
    try {
      const title = `اختبار كشف الكفاءة لـ MQ1: تجميع العتاد والمادة - INFEP`;
      const questions = [
        {
          question: "ما هو الإجراء الوقائي الأول قبل الإمساك بقطع اللوحة الأم والمعالج داخل ورشة التكوين؟",
          answers: [
            "توصيل كابل التيار الكهربائي مباشرة من المقبس",
            "ارتداء السوار المعادل للشحنات المعزولة ESD وتأريضه",
            "مسح أرجل المعالج بقطعة قماش مبللة بالماء",
            "تثبيت براغي الهيكل المعدني بقوة شديدة"
          ]
        },
        {
          question: "ما دلالة سماع نغمة بيب واحدة قصيرة صامتة (Single short beep) عند بدء تشغيل الكمبيوتر؟",
          answers: [
            "تلف اللوحة الأم وانفجار المكثفات الكهربائية",
            "سلامة العتاد الأساسي واللوحة الأم ونجاح الإقلاع الأولي بسلام",
            "عدم وجود نظام تشغيل معتمد على القرص الصلب",
            "خلل في توصيل كابلات التغذية بقوة المعالج"
          ]
        },
        {
          question: "ما هو المقدار الأنسب بيداغوجياً لاستخدام المعجون الحراري (Thermal Paste) على الميكرو-معالج؟",
          answers: [
            "دهن كامل القطعة وحشو الأطراف بكميات كثيفة",
            "وضع قطرة دائرية بحجم حبة الحمص في منتصف المعالج بالضبط",
            "رش المعالج بالماء قبل تركيب المبرد",
            "تجنب استخدام أي معجون لمنع التماسات الكهربائية"
          ]
        }
      ];

      const res = await createGoogleForm(gToken, title, questions);
      setFormsUrl(res.responderUri);
      setFormsExportStatus("success");
      setGSuccessMsg("تم إنشاء اختبار المتربصين وتوليد نموذج Google Form بنجاح متميز!");
      setTimeout(() => setGSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFormsExportStatus("error");
      alert(`فشل توليد نموذج Google Form: ${err.message}`);
    }
  };

  const handleSaveGoogleSetupLocal = () => {
    localStorage.setItem("smart_professor_google_setup", JSON.stringify({ token: gToken, clientId: gClientId }));
    alert("🟢 تم حفظ إعدادات ربط Google Workspace بنجاح متميز!");
  };

  const handleClearGoogleSetupLocal = () => {
    setGToken(null);
    setGClientId(null);
    localStorage.removeItem("smart_professor_google_setup");
    alert("🔴 تم فصل وإلغاء الربط بـ Google بنجاح.");
  };

  // Formatted reader layout splitting lines dynamically for visual satisfaction
  const renderFormattedMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    return (
      <div className="space-y-4 text-slate-200 leading-relaxed text-right md:text-md">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          // Main Header H1
          if (trimmed.startsWith("# ")) {
            return (
              <h1 key={idx} className="text-2xl font-bold text-amber-300 border-b pb-2 border-amber-500/20 mt-6 font-sans">
                {trimmed.replace("# ", "")}
              </h1>
            );
          }
          // Header H2
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={idx} className="text-xl font-bold text-white flex items-center gap-2 mt-5 font-sans">
                <span className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-sky-500 rounded-full inline-block"></span>
                {trimmed.replace("## ", "")}
              </h2>
            );
          }
          // Header H3
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-lg font-semibold text-blue-300 mt-4 underline decoration-blue-500/30 decoration-2">
                {trimmed.replace("### ", "")}
              </h3>
            );
          }
          // Bullet point list item
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-2 mr-4 text-slate-200">
                <span className="text-amber-400 font-bold mt-1 select-none">•</span>
                <span>{trimmed.slice(2)}</span>
              </div>
            );
          }
          // Pre-formatted code blocks
          if (trimmed.startsWith("```")) {
            return null; // Don't render the triple backticks directly
          }
          
          // Regular paragraphs
          return (
            <p key={idx} className="text-slate-300 font-sans tracking-tight">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans antialiased overflow-x-hidden relative">

      {/* Auth Gate */}
      {authLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm" style={{ fontFamily: "Tajawal, sans-serif" }}>جاري تحميل المنصة...</p>
          </div>
        </div>
      )}
      {!authLoading && !session && (
        <AuthPage onAuthenticated={() => {}} />
      )}
      {!authLoading && session && (
      <div className="min-h-screen">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[20%] w-[45%] h-[45%] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />
      </div>

      {/* Dynamic Top Announcement bar: Teacher Wellness and Socratic Motivator */}
      <div className="bg-[#030712]/60 text-slate-200 py-2.5 px-4 text-xs font-medium border-b border-white/5 backdrop-blur-md shadow-xs transition-all duration-300 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
              عناية ذاتية بالأستاذ
            </span>
            <AnimatePresence mode="wait">
              <motion.span 
                key={currentTipIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-slate-300 font-sans"
              >
                <strong>{TEACHER_WELLNESS_TIPS[currentTipIndex].title}:</strong> {TEACHER_WELLNESS_TIPS[currentTipIndex].desc}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>موقّت العمل المتوازن</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Professional Header Block */}
      <header className="bg-slate-950/40 border-b border-white/10 backdrop-blur-lg py-5 px-4 md:px-8 shadow-md relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-right">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center text-blue-400 shadow-lg border border-white/10 pulsing-glow">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight font-sans">الأستاذ الذكي</h1>
                <span className="text-xs bg-gradient-to-r from-blue-500/20 to-sky-500/20 text-blue-300 border border-blue-500/25 font-bold px-2.5 py-1 rounded-full font-sans shadow-sm">مساعد الأستاذ الفائق</span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 font-sans mt-1">
                المنصة البيداغوجية الذكية للمقاربة بالكفاءات (APC) · التكوين والتعليم المهني
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Status */}
            <div className="flex items-center gap-1.5 text-xs">
              {syncStatus === "syncing" && (
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-3 h-3 border border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
                  مزامنة...
                </span>
              )}
              {syncStatus === "synced" && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Cloud size={13} />
                  محفوظ
                </span>
              )}
              {syncStatus === "error" && (
                <span className="flex items-center gap-1 text-red-400">
                  <CloudOff size={13} />
                  خطأ في المزامنة
                </span>
              )}
            </div>

            {/* Time saved */}
            <div className="hidden sm:flex items-center gap-3 bg-white/5 text-slate-100 py-2.5 px-4 rounded-xl shadow-md border border-white/10">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <div className="text-right">
                <div className="text-blue-400 text-lg font-black leading-none">{timeSaved}<span className="text-xs font-medium text-slate-400 mr-1">ساعة</span></div>
                <p className="text-[10px] text-slate-400 mt-0.5">وقت موفّر</p>
              </div>
            </div>

            {/* User + signout */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl py-2 px-3">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <User size={14} className="text-blue-400" />
              </div>
              <span className="text-xs text-slate-300 font-medium hidden sm:block max-w-[140px] truncate">
                {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                title="تسجيل الخروج"
                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav Tabs for App Modules */}
      <div className="border-b border-white/10 bg-[#030712]/50 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-start overflow-x-auto scrollbar-none gap-6 py-1">
            
            <button
              onClick={() => { setActiveTab("tools"); setErrorMsg(null); }}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tools"
                  ? "border-blue-400 text-blue-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>الأدوات والحلول الذكية للأستاذ</span>
            </button>

            <button
              onClick={() => { setActiveTab("vocational_curriculums"); setErrorMsg(null); }}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "vocational_curriculums" 
                  ? "border-amber-400 text-amber-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Award className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-bold">برامج ومناهج التكوين المهني</span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {vocationalPrograms.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab("satchel"); setErrorMsg(null); }}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "satchel" 
                  ? "border-emerald-400 text-emerald-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpenCheck className="w-4 h-4 text-emerald-400" />
              <span>حقيبة الأستاذ المحفوظة</span>
              {savedItems.length > 0 && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ml-1">
                  {savedItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("guide"); setErrorMsg(null); }}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "guide"
                  ? "border-blue-400 text-blue-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>دليل المقاربة بالكفاءة (APC)</span>
            </button>

            <button
              onClick={() => { setActiveTab("google_workspace"); setErrorMsg(null); }}
              className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "google_workspace" 
                  ? "border-blue-400 text-blue-300" 
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 text-sky-400">🌐</span>
              <span>ربط Google Workspace</span>
              {gToken && (
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  متصل
                </span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Primary Application Layout Area */}
      <main className="max-w-7xl mx-auto py-8 px-4 md:px-8 relative z-10">
        
        {/* Error Messaging (Especially API Key Missing Alert) */}
        {errorMsg && (
          <div className="mb-6 bg-red-950/30 backdrop-blur-md border border-red-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 text-right shadow-md">
            <AlertCircle className="w-10 h-10 text-red-500 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-red-400 text-sm">خطأ في الإعدادات أو الاتصال بالذكاء الاصطناعي</h4>
              <p className="text-xs text-red-200 mt-1 leading-relaxed">{errorMsg}</p>
              {errorMsg.includes("Secrets") && (
                <div className="mt-3 bg-[#030712]/60 border border-red-500/10 p-3 rounded-xl text-xs text-slate-350 space-y-1">
                  <p className="font-bold text-white">كيف تحل المشكلة؟</p>
                  <p>1. افتح لوحة <strong>إعدادات التطبيق</strong> في الفولدر أو شريط الأدوات العلوي.</p>
                  <p>2. اضغط على خيار <strong>Secrets</strong> في لوائح الإعدادات المتاحة.</p>
                  <p>3. أضف مفتاحًا باسم <code className="bg-slate-950 px-1 py-0.5 rounded font-mono font-bold text-red-400 border border-red-500/10">GEMINI_API_KEY</code> وضَع فيه مفتاح Gemini API الخاص بك المنشأ من Google AI Studio.</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-bold"
            >
              تجاهل التنبيه
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* TAB 1: Core Tools Suite */}
          {activeTab === "tools" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              
              {/* Right column: Options list & Form configuration parameters */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* البوصلة المنهجية للتكوين المهني */}
                <div className="bg-gradient-to-br from-amber-950/20 via-slate-900/40 to-slate-950/55 backdrop-blur-md rounded-2xl p-5 shadow-lg border border-amber-500/20 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 border-amber-500/10">
                    <div className="flex flex-row-reverse items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                          <Award className="w-4 h-4 animate-pulse" />
                        </div>
                        <h4 className="text-xs font-black uppercase text-amber-300 tracking-wider font-sans">
                          البوصلة المنهجية (منهاج التكوين المعتمد)
                        </h4>
                      </div>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full font-sans font-bold">
                        نشط
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 mr-1">
                        البرنامج الوزاري المختار:
                      </label>
                      <select
                        value={selectedProgramId}
                        onChange={(e) => {
                          setSelectedProgramId(e.target.value);
                          const prog = vocationalPrograms.find(p => p.id === e.target.value);
                          if (prog && prog.modules.length > 0) {
                            setSelectedModuleCode(prog.modules[0].code);
                          } else {
                            setSelectedModuleCode("");
                          }
                        }}
                        className="w-full bg-slate-950/80 text-right text-slate-200 border border-white/10 hover:border-amber-500/25 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 font-sans outline-none transition-colors"
                      >
                        {vocationalPrograms.map((prog) => (
                          <option key={prog.id} value={prog.id}>
                            {prog.name} {prog.code ? `(${prog.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProgramId && (
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 mr-1">
                          المقياس / الوحدة البيداغوجية المستهدفة:
                        </label>
                        <select
                          value={selectedModuleCode}
                          onChange={(e) => setSelectedModuleCode(e.target.value)}
                          className="w-full bg-slate-950/80 text-right text-slate-200 border border-white/10 hover:border-amber-500/25 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-amber-500 font-sans outline-none transition-colors"
                        >
                          {vocationalPrograms.find(p => p.id === selectedProgramId)?.modules.map((mod) => (
                            <option key={mod.code} value={mod.code}>
                              {mod.code} - {mod.title} ({mod.durationHours} ساعة)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Active Module Mini Description & Suggested Topics */}
                  {selectedProgramId && selectedModuleCode && (() => {
                    const prog = vocationalPrograms.find(p => p.id === selectedProgramId);
                    const mod = prog?.modules.find(m => m.code === selectedModuleCode);
                    if (!mod || !prog) return null;
                    return (
                      <div className="bg-[#030712]/60 rounded-xl p-3 border border-white/5 space-y-2 text-right">
                        <div className="flex flex-row-reverse items-center justify-between text-[10px]">
                          <span className="text-amber-400 font-black">كفاءة وهدف الوحدة الحالية:</span>
                          <span className="text-slate-400">الحجم الساعي: {mod.durationHours} ساعة</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-relaxed font-sans">{mod.description}</p>
                        
                        <div className="pt-2 border-t border-white/10">
                          <button
                            onClick={() => applyModuleToTools(mod, prog)}
                            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 text-xs font-black py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-500/10"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>تطبيق المقاربة (APC) وموازنة المولدات فوراً</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Secondary Sidebar/Switcher for active educational task */}
                <div className="bg-slate-900/45 backdrop-blur-md rounded-2xl p-4 shadow-md border border-white/10">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider font-sans">
                    اختر الأداة الإدارية بيداغوجية المطلوبة:
                  </h3>
                  <div className="space-y-2">
                    {[
                      { id: "lesson_planner", label: "مخطط الدرس الذكي", desc: "خطط حصص مفصلة دقيقة بالدقيقة", icon: BookOpen, color: "text-amber-400 bg-amber-500/10 border border-amber-500/20" },
                      { id: "curriculum_planner", label: "موزّع المادة المنهجي", desc: "توزيع المناهج على أسابيع الدراسة", icon: Calendar, color: "text-blue-400 bg-blue-500/10 border border-blue-500/20" },
                      { id: "assessment_generator", label: "مولد التقييمات والاختبارات", desc: "أسئلة قياس الكفاءة وسلاسل الفروض", icon: Award, color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" },
                      { id: "diagram_generator", label: "توليد المخططات والصور التعليمية", desc: "رسوم توضيحية لتبسيط الفهم البصري", icon: Image, color: "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20" },
                      { id: "performance_report", label: "رادار أداء الطلاب", desc: "محلل علامات الطلاب وصياغتها", icon: FileText, color: "text-purple-400 bg-purple-500/10 border border-purple-500/20" },
                      { id: "admin_copilot", label: "المذكرات والمراسلات الإدارية", desc: "صياغة المكاتبات الرسمية للأولياء", icon: Mail, color: "text-rose-400 bg-rose-500/10 border border-rose-500/20" }
                    ].map((tool) => {
                      const IconComp = tool.icon;
                      const isSelected = activeTool === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTool(tool.id as ActiveTool);
                            setErrorMsg(null);
                          }}
                          className={`w-full text-right p-3 rounded-xl flex items-center justify-between transition-all group cursor-pointer border ${
                            isSelected 
                              ? "bg-white/10 border-white/20 text-white shadow-md font-bold" 
                              : "border-transparent text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${tool.color} ${isSelected ? "bg-amber-400/90 text-slate-950" : ""}`}>
                              <IconComp className="w-5 h-5" />
                            </span>
                            <div>
                              <p className="text-xs md:text-sm font-bold">{tool.label}</p>
                              <p className={`text-[10px] ${isSelected ? "text-slate-300" : "text-slate-400"}`}>{tool.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-amber-400 rotate-90" : "text-slate-500 group-hover:translate-x-1"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Dynamic Parameters Input Form Card */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/10 space-y-5">
                  <div className="flex items-center justify-between border-b pb-3 border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-amber-500" />
                      <span>إعدادات الأداة وببيانات الإدخال</span>
                    </h3>
                    <Coffee className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* FORM 1: Lesson Planner */}
                  {activeTool === "lesson_planner" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {LESSON_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("lesson_planner", p.data)}
                              className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-amber-500/20 transition-all"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المادة والمفهوم العام</label>
                          <input 
                            type="text" 
                            value={lessonParams.subject} 
                            onChange={(e) => setLessonParams({ ...lessonParams, subject: e.target.value })}
                            placeholder="مثال: العلوم الفيزيائية"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المرحلة الدراسية / الصف</label>
                          <input 
                            type="text" 
                            value={lessonParams.grade} 
                            onChange={(e) => setLessonParams({ ...lessonParams, grade: e.target.value })}
                            placeholder="مثال: السنة الثانية متوسط"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">عنوان موضوع الدرس بالتفصيل</label>
                        <input 
                           type="text" 
                           value={lessonParams.topic} 
                           onChange={(e) => setLessonParams({ ...lessonParams, topic: e.target.value })}
                           placeholder="مثال: ظاهرة انكسار الضوء"
                           className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">مدة الحصة بالدقائق</label>
                          <select 
                            value={lessonParams.duration} 
                            onChange={(e) => setLessonParams({ ...lessonParams, duration: e.target.value })}
                            className="w-full bg-[#030712]/60 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="45" className="bg-slate-950">45 دقيقة</option>
                            <option value="60" className="bg-slate-950">60 دقيقة</option>
                            <option value="90" className="bg-slate-950">90 دقيقة (حصتين)</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-400 block mb-1.5">بروتوكول بيداغوجي</span>
                          <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 p-1.5 rounded-xl flex items-center justify-center font-bold">
                            الاستدلال السقراطي (Socratic)
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">النمط أو التركيز البيداغوجي المفضل لديك</label>
                        <textarea 
                          rows={3}
                          value={lessonParams.focus} 
                          onChange={(e) => setLessonParams({ ...lessonParams, focus: e.target.value })}
                          placeholder="مثال: الفهم التجريبي الملموس بمؤشر ليزر..."
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* FORM 2: Curriculum Planner */}
                  {activeTool === "curriculum_planner" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {CURRICULUM_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("curriculum_planner", p.data)}
                              className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-blue-500/20 transition-all font-semibold"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المادة الدراسية</label>
                          <input 
                            type="text" 
                            value={curriculumParams.course} 
                            onChange={(e) => setCurriculumParams({ ...curriculumParams, course: e.target.value })}
                            placeholder="مثال: علوم الطبيعة والحياة"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">الصف الدراسي والمستوى</label>
                          <input 
                            type="text" 
                            value={curriculumParams.grade} 
                            onChange={(e) => setCurriculumParams({ ...curriculumParams, grade: e.target.value })}
                            placeholder="مثال: السنة الرابعة متوسط"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">الفصل المستهدف</label>
                          <input 
                            type="text" 
                            value={curriculumParams.term} 
                            onChange={(e) => setCurriculumParams({ ...curriculumParams, term: e.target.value })}
                            placeholder="مثال: الفصل الدراسي الأول"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">عدد أسابيع التوزيع</label>
                          <input 
                            type="text" 
                            value={curriculumParams.weeks} 
                            onChange={(e) => setCurriculumParams({ ...curriculumParams, weeks: e.target.value })}
                            placeholder="مثال: 12 أسبوعاً"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">الأهداف والكفاءات البيداغوجية المستهدفة</label>
                        <textarea 
                          rows={4}
                          value={curriculumParams.objectives} 
                          onChange={(e) => setCurriculumParams({ ...curriculumParams, objectives: e.target.value })}
                          placeholder="أدخل الأهداف الأساسية للمنهج..."
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* FORM 3: Assessment Generator */}
                  {activeTool === "assessment_generator" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ASSESSMENT_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("assessment_generator", p.data)}
                              className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-emerald-500/20 transition-all font-semibold"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">نوع ووزن التقييم</label>
                          <input 
                            type="text" 
                            value={assessmentParams.testType} 
                            onChange={(e) => setAssessmentParams({ ...assessmentParams, testType: e.target.value })}
                            placeholder="مثال: فرض محروس / تقويم قصير"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المرحلة الدراسية / الصف</label>
                          <input 
                            type="text" 
                            value={assessmentParams.grade} 
                            onChange={(e) => setAssessmentParams({ ...assessmentParams, grade: e.target.value })}
                            placeholder="مثال: الصف الخامس"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">مستوى الصعوبة</label>
                          <select 
                            value={assessmentParams.difficulty} 
                            onChange={(e) => setAssessmentParams({ ...assessmentParams, difficulty: e.target.value })}
                            className="w-full bg-[#030712]/60 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer font-sans"
                          >
                            <option value="سهل وبسيط" className="bg-slate-950">سهل وتأسيسي</option>
                            <option value="متوسط" className="bg-slate-950">متوسط وتفاعلي</option>
                            <option value="صعب (تفكير ناقد وحل وضعيات)" className="bg-slate-950">صعب (ذو طابع سقراطي وتحليلي)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">عدد ومواصفات الأسئلة</label>
                          <input 
                            type="text" 
                            value={assessmentParams.numQuestions} 
                            onChange={(e) => setAssessmentParams({ ...assessmentParams, numQuestions: e.target.value })}
                            placeholder="مثال: 4 أسئلة متنوعة التدرج"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-550 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">المفاهيم العلمية المستهدفة بالاختبار</label>
                        <textarea 
                          rows={3}
                          value={assessmentParams.topic} 
                          onChange={(e) => setAssessmentParams({ ...assessmentParams, topic: e.target.value })}
                          placeholder="أدخل الدرس موضوع الفرض والجزئية التربوية المطلوبة..."
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-550 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* FORM 4: Performance Report */}
                  {activeTool === "performance_report" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {REPORT_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("performance_report", p.data)}
                              className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-purple-500/20 transition-all font-semibold"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">الفوج أو الفصل الدراسي</label>
                          <input 
                            type="text" 
                            value={reportParams.classGroup} 
                            onChange={(e) => setReportParams({ ...reportParams, classGroup: e.target.value })}
                            placeholder="مثال: الفوج 2 علمي"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">عدد الطلاب</label>
                          <input 
                            type="text" 
                            value={reportParams.numStudents} 
                            onChange={(e) => setReportParams({ ...reportParams, numStudents: e.target.value })}
                            placeholder="مثال: 25 طالباً"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">نوع وتوجه التقرير</label>
                        <input 
                          type="text" 
                          value={reportParams.reportType} 
                          onChange={(e) => setReportParams({ ...reportParams, reportType: e.target.value })}
                          placeholder="مثال: رسائل فردية دافئة لأولياء الأمور"
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">الملحوظات الخام ومعلومات العلامات المتناثرة</label>
                        <textarea 
                          rows={4}
                          value={reportParams.rawNotes} 
                          onChange={(e) => setReportParams({ ...reportParams, rawNotes: e.target.value })}
                          placeholder="اكتب ملاحظات سريعة عن مستوى وسلوك وصعوبات الطلاب هنا..."
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* FORM 5: Admin Copilot */}
                  {activeTool === "admin_copilot" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ADMIN_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("admin_copilot", p.data)}
                              className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-rose-500/20 transition-all font-semibold"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">نوع المستند المطلوب</label>
                          <input 
                            type="text" 
                            value={adminParams.documentType} 
                            onChange={(e) => setAdminParams({ ...adminParams, documentType: e.target.value })}
                            placeholder="مثال: طلب استدعاء لولي الأمر"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المستلم / المعني بالوثيقة</label>
                          <input 
                            type="text" 
                            value={adminParams.recipient} 
                            onChange={(e) => setAdminParams({ ...adminParams, recipient: e.target.value })}
                            placeholder="مثال: ولي أمر التلميذ المحترم"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">النبرة والأسلوب في الصياغة</label>
                        <input 
                          type="text" 
                          value={adminParams.tone} 
                          onChange={(e) => setAdminParams({ ...adminParams, tone: e.target.value })}
                          placeholder="مثال: تربوية حازمة مغلفة بالدبلوماسية"
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">رؤوس الأقلام والأمور الواجب دمجها في المكاتبة</label>
                        <textarea 
                          rows={4}
                          value={adminParams.bulletPoints} 
                          onChange={(e) => setAdminParams({ ...adminParams, bulletPoints: e.target.value })}
                          placeholder="أدخل الأسباب أو الملاحظات التي تريد من السكرتير صياغتها بالكامل بأسلوب إداري بليغ..."
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* FORM 6: Diagram & Educational Image Generator */}
                  {activeTool === "diagram_generator" && (
                    <div className="space-y-4 text-right">
                      {/* Presets load Row */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5">تحميل مسبق ذكي وسريع للتجربة:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {DIAGRAM_PRESETS.map((p, idx) => (
                            <button
                              key={idx}
                              onClick={() => loadPreset("diagram_generator", p.data)}
                              className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full font-sans cursor-pointer hover:bg-indigo-500/20 transition-all font-semibold font-sans"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">المادة / الفرع المعرفي</label>
                          <input 
                            type="text" 
                            value={diagramParams.subject} 
                            onChange={(e) => setDiagramParams({ ...diagramParams, subject: e.target.value })}
                            placeholder="مثال: العلوم الفيزيائية والتكنولوجية"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">موضوع المخطط بالتفصيل</label>
                          <input 
                            type="text" 
                            value={diagramParams.topic} 
                            onChange={(e) => setDiagramParams({ ...diagramParams, topic: e.target.value })}
                            placeholder="مثال: مكونات اللوحة الأم (Motherboard)"
                            className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">الأسلوب البصري للمخطط</label>
                        <select 
                          value={diagramParams.style} 
                          onChange={(e) => setDiagramParams({ ...diagramParams, style: e.target.value })}
                          className="w-full bg-[#030712]/60 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer font-sans"
                        >
                          <option value="مخطط تخطيطي ملون عالي الدقة (Colored schematic line art)" className="bg-slate-950">مخطط تخطيطي ملون مخصص للأستاذ</option>
                          <option value="رسم خطي تقني دقيق باللونين الأسود والأبيض (Black & White Technical Schematic)" className="bg-slate-950">رسم خطي تقني أبيض وأسود للطباعة</option>
                          <option value="تفكيك ثلاثي الأبعاد هندسي متميز (3D Architectural Exploded Diagram)" className="bg-slate-950">عرض هندسي متفكك ثلاثي الأبعاد</option>
                          <option value="رسم تخطيطي مجهري بيداغوجي (Microscopic diagram model)" className="bg-slate-950">رسم علمي مجهري تفصيلي</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">لغة التمسيات والشرح بداخل الرسم</label>
                        <input 
                          type="text" 
                          value={diagramParams.language} 
                          onChange={(e) => setDiagramParams({ ...diagramParams, language: e.target.value })}
                          placeholder="مثال: العربية الفصحى مع التسميات الإنجليزية"
                          className="w-full bg-[#030712]/50 border border-white/10 hover:border-white/15 p-2 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* Submit Button Triggering Server Gemini API Router */}
                <div className="pt-3 font-sans">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#030712]/80 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] border border-indigo-500/30 active:scale-98 cursor-pointer text-sm md:text-md"
                  >
                    {isGenerating ? (
                      <>
                        <RotateCw className="w-5 h-5 animate-spin text-amber-405 animate-spin" />
                        <span>جاري صياغة المستند بالذكاء الاصطناعي...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>توليد وتنسيق المادة التعليمية الآن</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Socratic Pedagogy quick checklist card */}
                <div className="bg-slate-900/40 backdrop-blur-md text-slate-100 rounded-2xl p-5 shadow-md border border-white/10 font-sans">
                  <h4 className="text-xs font-extrabold text-amber-400 tracking-widest uppercase mb-3 font-sans">
                    ركائز جودة المقاربة بالكفاءات (APC) المدمجة
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-right">
                    {/* Render helper constants */}
                    {PEDAGOGICAL_APC_PILLARS.map((p) => (
                      <div key={p.id} className="bg-white/5 p-2.5 rounded-xl border border-white/5 font-sans">
                        <p className="text-xs font-bold text-slate-100">{p.title}</p>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-normal">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Left Column: Interactive Preview Canvas & Raw Editor View */}
              <div className="lg:col-span-7 space-y-6 animate-fadeIn">
                
                {/* Visual feedback when loading or empty states exist */}
                <div className="bg-slate-900/45 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 overflow-hidden min-h-[520px] flex flex-col font-sans">
                  
                  {/* Preview Toolbar Action Items */}
                  <div className="bg-[#030712]/50 px-5 py-4 border-b border-white/10 flex items-center justify-between font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block animate-pulse"></span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-200">معاينة وتخصيص مستندات الأستاذ</h3>
                    </div>

                    {/* Format / Raw edit slider */}
                    {(outputResult || editableContent) && (
                      <div className="flex items-center bg-slate-950/60 p-1 rounded-lg text-xs gap-1 border border-white/5 font-sans">
                        <button
                          onClick={() => setIsEditing(false)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${!isEditing ? "bg-white/10 text-white shadow-md border border-white/10" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          المستند المنسّق
                        </button>
                        <button
                          onClick={() => setIsEditing(true)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${isEditing ? "bg-white/10 text-white shadow-md border border-white/10" : "text-slate-400 hover:text-slate-200"}`}
                        >
                          المحرر اليدوي
                        </button>
                      </div>
                    )}
                  </div>

                  {/* CANVAS INNER */}
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                    
                    {/* STATE A: Processing Loop Active */}
                    {isGenerating && (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center relative shadow-lg border border-white/10 animate-pulse">
                          <RotateCw className="w-8 h-8 text-amber-400 animate-spin" />
                          <Sparkles className="w-4 h-4 text-indigo-400 absolute top-2 right-2 animate-bounce" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100 font-sans">يقوم الأستاذ الذكي بإنشاء دليلك المنهجي الآن</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans mx-auto leading-relaxed">
                            يتم معالجة المخرجات بموجب الأدلة التربوية للجزائر وكندا المقترنة بحلول الإدارة الفائقة لتمكين توازن المعلم وتحسين جودة التدريس.
                          </p>
                          <p className="text-xs text-amber-400/80 mt-3 font-mono animate-pulse">{loadingStep}</p>
                        </div>
                      </div>
                    )}

                    {/* STATE B: Document generated, show viewer or manual editor */}
                    {!isGenerating && outputResult && (
                      <div className="flex-1 flex flex-col justify-between h-full font-sans">
                        <div className="flex-1 overflow-y-auto max-h-[500px] mb-6 custom-scrollbar pr-2 text-right">
                          {isEditing ? (
                            <textarea
                              rows={20}
                              value={editableContent}
                              onChange={(e) => setEditableContent(e.target.value)}
                              className="w-full h-[400px] bg-slate-950 border border-white/10 p-4 rounded-xl text-slate-200 text-right text-xs md:text-sm font-mono focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                            />
                          ) : (
                            <>
                              {outputImageUrl && (
                                <div className="mb-6 rounded-2xl overflow-hidden border border-white/10 bg-[#030712]/40 p-2.5 shadow-xl transition-all hover:border-white/15">
                                  <img 
                                    src={outputImageUrl} 
                                    alt="المخطط التعليمي المولد بالذكاء الاصطناعي" 
                                    className="w-full h-auto aspect-video object-contain rounded-xl"
                                    referrerPolicy="no-referrer"
                                  />
                                  <p className="text-[10px] text-center text-slate-400 mt-2 font-sans font-medium">
                                    🎨 مخطط توضيحي تم إنشاؤه تلقائياً لدعم المعاينة البصرية والأنشطة التفاعلية في القسم
                                  </p>
                                </div>
                              )}
                              {renderFormattedMarkdown(outputResult)}
                            </>
                          )}
                        </div>
<div className="border-t pt-5 border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#030712]/50 -mx-6 -mb-6 p-4 md:-mx-8 md:-mb-8 font-sans">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleCopy}
                              className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 hover:text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-sans"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                  <span className="text-emerald-400">تم النسخ!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span>نسخ الحافظة</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={handleDownload}
                              className="bg-[#2563eb]/20 border border-[#3b82f6]/30 hover:bg-[#2563eb]/35 text-blue-300 hover:text-white font-black px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs font-sans"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-400" />
                              <span>تحميل المستند المنسق (.html)</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 font-sans font-sans">
                            <button
                              onClick={handleSaveToSatchel}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/10 border border-blue-500/30"
                            >
                              {syncStatus === "syncing" ? (
                                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                              ) : justSaved ? (
                                <Check className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                              ) : session ? (
                                <Cloud className="w-3.5 h-3.5 text-blue-200" />
                              ) : (
                                <Save className="w-3.5 h-3.5 text-blue-200" />
                              )}
                              <span>{justSaved ? "تم الحفظ!" : session ? "حفظ في السحابة" : "حفظ في حقيبتي"}</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* STATE C: Empty/Idle State */}
                    {!isGenerating && !outputResult && (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4 font-sans">
                        <div className="w-16 h-16 rounded-full bg-slate-950/40 border border-white/10 flex items-center justify-center text-slate-400 animate-pulse">
                          <BookOpen className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-200 font-sans">لم يتم إنشاء أي مستند بعد</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                            اختر الأداة المطلوبة من القائمة اليمين، املأ البيانات أو حمّل نموذجاً جاهزاً لتجربة سريعة، ثم اضغط على زر التوليد لصياغة المستند بالكامل في ثوانٍ.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Micro educational note card */}
                <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-4 shadow-[0_0_15px_rgba(245,158,11,0.05)] text-right">
                  <Coffee className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-normal">
                    <strong>نصائح توازن المعلم:</strong> يمكنك الضغط على <strong>"حفظ في حقيبتي"</strong> لتجميع أعمالك في الحقيبة المحفوظة واستعادتها لاحقًا دون اتصال إنترنت أو تعديلها وإعادة طباعتها بنقرة واحدة، مما يمنع التشتت ويحافظ على عطلتك الأسبوعية.
                  </p>
                </div>

              </div>
              
            </motion.div>
          )}

          {/* TAB: Vocational Programs & Custom Syllabus Manager */}
          {activeTab === "vocational_curriculums" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 text-right"
            >
              {/* Header Box */}
              <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row-reverse items-center justify-between gap-4 font-sans">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#b45309]/10 border border-[#b45309]/20 text-amber-400 flex items-center justify-center rounded-xl">
                    <Award className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">مستودع المناهج وبرامج التكوين المهني</h2>
                    <p className="text-xs text-slate-400 mt-1 font-sans">تسيير ومواءمة دساتير البرامج للتكوين والتعليم المهني وتصميم مذكرات المقاربة بالكفاءات (APC)</p>
                  </div>
                </div>
                <div className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 bg-clip-padding rounded-full font-sans">
                  منظومة تسيير الكفاءات الذكية
                </div>
              </div>

              {/* Grid content split between visual list and add program form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Right side: List of current Programs (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/10 space-y-4">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 border-b pb-3 border-white/10 justify-end">
                      <span>البرامج الوزارية والمناهج المفعلة حالياً</span>
                      <BookOpen className="w-4 h-4 text-amber-400" />
                    </h3>

                    <div className="space-y-4">
                      {vocationalPrograms.map((prog) => {
                        const isExpanded = expandedProgId === prog.id;
                        const isSelected = selectedProgramId === prog.id;
                        return (
                          <div 
                            key={prog.id} 
                            className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                              isSelected 
                                ? "bg-amber-950/15 border-amber-500/30" 
                                : "bg-slate-950/40 border-white/5 hover:border-white/10"
                            }`}
                          >
                            {/* Card Header Selector row */}
                            <div className="p-4 flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-3 bg-[#030712]/30">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-slate-900 rounded-lg text-amber-400 border border-white/5">
                                  <Award className="w-5 h-5" />
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <h4 className="text-xs md:text-sm font-bold text-white">{prog.name}</h4>
                                    {prog.isCustom && (
                                      <span className="text-[8px] bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">مخصص</span>
                                    )}
                                  </div>
                                  <div className="flex flex-row-reverse items-center gap-2 text-[10px] text-slate-450 mt-1 flex-wrap font-mono justify-start">
                                    <span>الرمز: {prog.code}</span>
                                    <span>•</span>
                                    <span>الشهادة: {prog.diploma}</span>
                                    <span>•</span>
                                    <span>المدة: {prog.duration}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedProgramId(prog.id);
                                    if (prog.modules.length > 0) {
                                      setSelectedModuleCode(prog.modules[0].code);
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all cursor-pointer ${
                                    isSelected 
                                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10" 
                                      : "bg-white/5 text-slate-300 hover:text-white border border-white/10"
                                  }`}
                                >
                                  {isSelected ? "البرنامج النشط" : "تنشيط البرنامج"}
                                </button>
                                
                                <button
                                  onClick={() => setExpandedProgId(isExpanded ? null : prog.id)}
                                  className="p-1.5 hover:bg-white/5 text-slate-300 hover:text-white rounded-lg border border-white/5 transition-colors cursor-pointer"
                                  title="عرض المقاييس"
                                >
                                  <BookOpenCheck className="w-4 h-4 text-indigo-400" />
                                </button>

                                {prog.isCustom && (
                                  <button
                                    onClick={() => handleDeleteProgram(prog.id)}
                                    className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                                    title="حذف البرنامج"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Card Expanded modules list */}
                            {isExpanded && (
                              <div className="p-4 border-t border-white/5 bg-[#030712]/50 space-y-3">
                                <h5 className="text-[11px] font-black text-amber-300 font-sans">
                                  قائمة الوحدات التعليمية والمقاييس المحددة ({prog.modules.length}):
                                </h5>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                  {prog.modules.map((mod) => (
                                    <div 
                                      key={mod.code} 
                                      className="p-3 bg-slate-900/60 rounded-lg border border-white/5 flex flex-col sm:flex-row-reverse sm:items-start justify-between gap-4 transition-all hover:bg-slate-900"
                                    >
                                      <div className="space-y-1 flex-1 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                          <span className="text-[10px] md:text-xs font-black text-indigo-300 font-mono">[{mod.code}]</span>
                                          <span className="text-[11px] md:text-sm font-bold text-slate-100">{mod.title}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-350 leading-relaxed font-sans">{mod.description}</p>
                                      </div>
                                      <div className="sm:text-left text-right flex sm:flex-col items-center justify-between sm:justify-start gap-2 shrink-0">
                                        <span className="text-[9px] bg-white/5 text-slate-400 p-1 px-2.5 rounded-md border border-white/10 font-mono">
                                          {mod.durationHours} ساعة
                                        </span>
                                        <button
                                          onClick={() => {
                                            setSelectedProgramId(prog.id);
                                            setSelectedModuleCode(mod.code);
                                            applyModuleToTools(mod, prog);
                                          }}
                                          className="bg-indigo-650 hover:bg-indigo-500 text-white font-extrabold text-[9px] py-1.5 px-2.5 rounded transition-colors cursor-pointer"
                                        >
                                          إرسال للمولد الذكي
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Left side: Add Custom Program Form (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/10 space-y-5">
                    <h3 className="text-sm font-black text-white flex items-center gap-2 border-b pb-3 border-white/10 justify-end">
                      <span>إضافة برنامج تكوين مخصص لمدرستك</span>
                      <Plus className="w-4 h-4 text-amber-500" />
                    </h3>

                    <div className="space-y-4 text-right">
                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">اسم تخصص البرنامج (مثال: تقني سامي شبكات)</label>
                        <input
                          type="text"
                          value={newProgName}
                          onChange={(e) => setNewProgName(e.target.value)}
                          placeholder="مثال: مستغل المعلوماتية أو تقني محاسبة"
                          className="w-full bg-[#030712]/50 border border-white/10 p-2.5 px-3 text-xs md:text-sm rounded-xl text-right text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">المستوى / الشهادة المستهدفة</label>
                          <input
                            type="text"
                            value={newProgDiploma}
                            onChange={(e) => setNewProgDiploma(e.target.value)}
                            placeholder="مثال: CMP أو TS أو عام"
                            className="w-full bg-[#030712]/50 border border-white/10 p-2 px-3 text-xs rounded-xl text-right text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-sans"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">الرمز الخاص به (Code)</label>
                          <input
                            type="text"
                            value={newProgCode}
                            onChange={(e) => setNewProgCode(e.target.value)}
                            placeholder="مثال: INT1202"
                            className="w-full bg-[#030712]/50 border border-white/10 p-2 px-3 text-xs rounded-xl text-center text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5 font-sans">المدة الكاملة وحجم التكوين (ساعة/فصل)</label>
                        <input
                          type="text"
                          value={newProgDuration}
                          onChange={(e) => setNewProgDuration(e.target.value)}
                          placeholder="مثال: 18 شهراً (1377 ساعة)"
                          className="w-full bg-[#030712]/50 border border-white/10 p-2.5 px-3 text-xs rounded-xl text-right text-slate-100 focus:outline-none focus:border-amber-500 transition-all font-sans"
                        />
                      </div>

                      {/* Modular integration Sub-form for Adding individual Modules */}
                      <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-4">
                        <div className="flex flex-row-reverse items-center justify-between pb-1 border-b border-white/5 text-[10px]">
                          <span className="text-amber-400 font-bold border border-amber-500/20 px-2 py-0.5 rounded">إضافة مقياس (Module)</span>
                          <span className="text-slate-400">بناء هيكل المادة التعليمية</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[10px] text-slate-400 block mb-1 font-sans">عدد الساعات</label>
                            <input
                              type="number"
                              value={newModuleHoursInput}
                              onChange={(e) => setNewModuleHoursInput(parseInt(e.target.value) || 30)}
                              className="w-full bg-slate-950 text-right p-1.5 text-xs rounded-lg text-slate-200 outline-none focus:border-amber-500 transition-all font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1 font-sans text-right">عنوان المقياس المقترح والمسمى</label>
                            <input
                              type="text"
                              value={newModuleTitleInput}
                              onChange={(e) => setNewModuleTitleInput(e.target.value)}
                              placeholder="عنوان المقياس..."
                              className="w-full bg-slate-950 text-right p-1.5 text-xs rounded-lg text-slate-200 outline-none focus:border-amber-500 transition-all font-sans"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[10px] text-slate-400 block mb-1 font-sans">رمز المقياس</label>
                            <input
                              type="text"
                              value={newModuleCodeInput}
                              onChange={(e) => setNewModuleCodeInput(e.target.value)}
                              placeholder="مثال: MQ1"
                              className="w-full bg-slate-950 text-center p-1.5 text-xs rounded-lg text-slate-200 outline-none focus:border-amber-500 transition-all font-mono"
                            />
                          </div>
                          <div className="col-span-2 text-right">
                            <label className="text-[10px] text-slate-400 block mb-1 font-sans text-right font-bold">الوصف / أهداف وبنية الكفاءة</label>
                            <input
                              type="text"
                              value={newModuleDescInput}
                              onChange={(e) => setNewModuleDescInput(e.target.value)}
                              placeholder="أهدف الكفاءة التفصيلية لهذا المقياس..."
                              className="w-full bg-slate-950 text-right p-1.5 text-xs rounded-lg text-slate-200 outline-none focus:border-amber-500 transition-all font-sans"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newModuleCodeInput || !newModuleTitleInput) return;
                            const mod: VocationalModule = {
                              code: newModuleCodeInput,
                              title: newModuleTitleInput,
                              description: newModuleDescInput || "مقياس بيداغوجي للتكوين والتعليم المهني المعتمد",
                              durationHours: newModuleHoursInput
                            };
                            setNewProgModulesList([...newProgModulesList, mod]);
                            setNewModuleCodeInput("");
                            setNewModuleTitleInput("");
                            setNewModuleDescInput("");
                            setNewModuleHoursInput(30);
                          }}
                          className="w-full bg-indigo-600/30 hover:bg-indigo-600/55 text-indigo-200 text-[10px] font-bold p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>تثبيت المقياس وإدراجه في هيكل البرنامج أدناه</span>
                        </button>
                      </div>

                      {/* Display added modules to save confidence */}
                      {newProgModulesList.length > 0 && (
                        <div className="space-y-1.5 bg-[#030712]/40 p-3 rounded-lg border border-white/5">
                          <p className="text-[10px] text-slate-400 font-bold border-b pb-1 border-white/5 font-sans">
                            تمت إضافة المقاييس التالية لهيكل البرنامج ({newProgModulesList.length}):
                          </p>
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {newProgModulesList.map((m, idx) => (
                              <span 
                                key={idx} 
                                className="text-[9px] bg-indigo-505/10 text-indigo-300 border border-indigo-500/20 py-1 px-2 rounded-md flex items-center gap-1 font-sans"
                              >
                                <span className="font-mono">({m.durationHours}س)</span>
                                <span>{m.title} [{m.code}]</span>
                                <button
                                  type="button"
                                  onClick={() => setNewProgModulesList(newProgModulesList.filter((_, i) => i !== idx))}
                                  className="text-red-400 hover:text-red-300 mr-1 cursor-pointer font-black"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (!newProgName || !newProgCode) {
                            setErrorMsg("من فضلك املأ اسم البرنامج ورمزه التعريفي على الأقل.");
                            return;
                          }
                          if (newProgModulesList.length === 0) {
                            setErrorMsg("يجب إضافة مقياس تعليمي واحد على الأقل للبرنامج الجديد.");
                            return;
                          }
                          const created: VocationalProgram = {
                            id: `custom_${Date.now()}`,
                            code: newProgCode,
                            name: newProgName,
                            diploma: newProgDiploma || "شهادة التكوين المهني",
                            duration: newProgDuration || "غير محددة",
                            modules: [...newProgModulesList],
                            isCustom: true
                          };
                          handleAddProgram(created);
                          
                          // Resets
                          setNewProgName("");
                          setNewProgCode("");
                          setNewProgDiploma("");
                          setNewProgDuration("");
                          setNewProgModulesList([]);
                          setErrorMsg(null);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-500/15 text-xs"
                      >
                        <Save className="w-4 h-4" />
                        <span>حفظ البرنامج وإدراجه في قاعدة المناهج المفتوحة</span>
                      </button>

                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 2: Teacher Saved Portfolio / Satchel */}
          {activeTab === "satchel" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-right"
            >
              <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl border border-white/10">
                <div className="flex items-center justify-between border-b pb-4 border-white/10">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 font-sans flex items-center gap-2">
                      حقيبة الأستاذ المحفوظة
                      <span className="text-sm font-normal text-slate-400">({savedItems.length})</span>
                      {session && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Cloud size={9} />
                          مزامنة سحابية
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {session
                        ? "أعمالك محفوظة في السحابة ومتاحة من أي جهاز"
                        : "محفوظة محلياً على جهازك"}
                    </p>
                  </div>
                  <FolderLock className="w-8 h-8 text-blue-400" />
                </div>

                {/* Zero state saved items */}
                {savedItems.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-950/60 border border-white/15 flex items-center justify-center text-slate-300 shadow-md">
                      <Save className="w-8 h-8 stroke-[1.2] text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">حقيبتك البيداغوجية فارغة حالياً</h4>
                      <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                        كلما قمت بتوليد خطة درس أو تقرير أداء، اضغط على زر "حفظ في حقيبتي" لتخزين النسخة المُعدّلة هنا واستدعائها في الفصول القادمة بسهولة تامة!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("tools")}
                      className="bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs hover:bg-indigo-500 cursor-pointer transition-all border border-indigo-500/20 active:scale-95"
                    >
                      اذهب للتوليد الآن
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {savedItems.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-slate-950/40 backdrop-blur-xs rounded-xl p-5 border border-white/10 hover:border-white/20 hover:shadow-lg transition-all flex flex-col justify-between gap-4 relative group"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {item.tool === "lesson_planner" && <span className="bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">خطة درس</span>}
                              {item.tool === "curriculum_planner" && <span className="bg-blue-500/15 text-blue-300 border border-blue-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">موزّع منهجي</span>}
                              {item.tool === "assessment_generator" && <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">تقييم</span>}
                              {item.tool === "performance_report" && <span className="bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">تقرير طلاب</span>}
                              {item.tool === "admin_copilot" && <span className="bg-rose-500/15 text-rose-300 border border-rose-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">مراسلة إدارية</span>}
                              <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteFromSatchel(item.id)}
                              className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer"
                              title="حذف من الحقيبة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h4 className="text-sm font-bold text-slate-100 mt-3 font-sans leading-snug">{item.title}</h4>
                          
                          {/* Clipped raw text preview */}
                          <p className="text-xs text-slate-450 line-clamp-3 leading-relaxed font-sans mt-2">
                            {item.content}
                          </p>
                        </div>

                        {/* Retrieve Action */}
                        <div className="border-t pt-3 border-white/10 flex flex-row-reverse items-center justify-between mt-2 gap-2">
                          <button
                            onClick={() => {
                              const safeTitle = item.title.replace(/\s+/g, "_");
                              const filename = `وثيقة_حقيبة_${safeTitle}.html`;
                              downloadHtmlDocument(filename, item.title, item.content, item.imageUrl || undefined);
                            }}
                            className="bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 font-black px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                            title="تحميل كوثيقة مدمجة فوراً"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تنزيل المخطط المستند</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTool(item.tool);
                              setOutputResult(item.content);
                              setEditableContent(item.content);
                              if (item.imageUrl) {
                                setOutputImageUrl(item.imageUrl);
                              } else {
                                setOutputImageUrl("");
                              }
                              setActiveTab("tools");
                              setErrorMsg(null);
                            }}
                            className="text-[11px] bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-100 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <span>فتح في المحرر</span>
                            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-indigo-300" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: Pedagogy Guide */}
          {activeTab === "guide" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl border border-white/10 space-y-6">
                <div className="border-b pb-5 border-white/10 text-center space-y-2">
                  <Award className="w-12 h-12 text-amber-500 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-100 font-sans">دليل تبني المقاربة بالكفاءات (APC) والتعلم المتمايز</h2>
                  <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
                    مرجع تربوي سريع للأستاذ المتميز متوافق مع نظم الإعداد والورقيات للمؤسسات التعليمية الرائدة
                  </p>
                </div>

                <div className="space-y-5 text-right">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-500 inline-block rounded"></span>
                    <span>ما هي مبررات المقاربة بالكفاءة (Competency-Based Approach)؟</span>
                  </h3>
                  <p className="text-xs md:text-sm text-slate-350 leading-relaxed font-sans">
                    المقاربة بالكفاءة تهدف لنقل مركز ثقل الحصة التدريسية من **تلقين المعرفة الجافة** إلى **تمكين الطالب من توظيف المعارف والمهارات والسلوكيات** لحل وضعيات مشكلة مركبة مستوحاة من واقع الحياة وتفاعلاتها اليومية.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="bg-[#030712]/40 p-4 rounded-xl border border-white/10">
                      <p className="text-xs font-bold text-slate-200">1. تخطيط الوضعيات المستهدفة</p>
                      <p className="text-xs text-slate-400 leading-normal mt-1.5">
                        دائماً ابنِ مفهوم الحصة التدريسية حول مشكلة حقيقية، مثل "لماذا تبدو الملعقة منكسرة؟" أو "كيف نحسب كمية الأسمنت لجدار غرفتك؟".
                      </p>
                    </div>
                    <div className="bg-[#030712]/40 p-4 rounded-xl border border-white/10">
                      <p className="text-xs font-bold text-slate-200">2. تبني التعليم المتمايز</p>
                      <p className="text-xs text-slate-400 leading-normal mt-1.5">
                        الطلاب لا يتشابهون في سرعة البناء؛ صمم أوراق عمل متدرجة بثلاث مستويات (سهل، متوسط، تحدي) لضمان عدم تهميش الممتاز ولا إحباط المتعثر.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 pt-4">
                    <span className="w-1.5 h-4 bg-indigo-500 inline-block rounded"></span>
                    <span>حلول إدارة الوقت وتفادي الإرهاق المهني</span>
                  </h3>
                  <div className="bg-indigo-500/10 border border-indigo-505/20 p-4 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-indigo-300">توصيات عملية من المستشارين التربويين للأستاذ الذكي:</p>
                    <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <li>• <strong>الأتمتة المدروسة:</strong> استعن بهذه المنصة لتوليد مسودات الخطط والتقارير بمقدار 2 دقيقة، ثم استثمر 5 دقائق في التعديل والمراجعة الفضلى عوضاً عن 3 ساعات من الكتابة اليدوية العقيمة.</li>
                      <li>• <strong>التوجيه الصامت:</strong> فوض بعض المهام مثل مسح السبورة، توزيع الكرايس، وتنظيم المجموعات لقادة الأفواج الصفية، فهذا يغرز فيهم المسؤولية ويريح جسد المعلم.</li>
                      <li>• <strong>التحرر من المثالية الإدارية:</strong> خطة الطوارئ تمنحك الثقة وتقلل استجابة التوتر النفسي في حالة انقطاع النور أو حدوث مواقف غير محسوبة.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "google_workspace" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 text-right"
            >
              {/* Google Setup Control Card */}
              <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl border border-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-550/10 rounded-full blur-3xl -z-10" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center bg-blue-500/20 text-blue-400 p-2 rounded-xl text-lg">🌐</span>
                      <h2 className="text-xl font-bold text-slate-100 font-sans">بوابة ربط Google Workspace الموحدة للأستاذ</h2>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-xl">
                      اربط أدواتك البيداغوجية والخطط الدراسية مباشرةً بـ 7 خدمات سحابية رئيسية من Google لتعديل وتسيير وتحضير المناهج وإخطار زملائك بالقسم بضغطة زر.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {gToken ? (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        اتصال نشط بـ Google Workspace API
                      </span>
                    ) : (
                      <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        غير متصل - مطلوب إدخال رمز التحقق بالأسفل
                      </span>
                    )}
                  </div>
                </div>

                {/* Save setup and Auth Input form */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                  <div className="md:col-span-8 space-y-2">
                    <label className="text-xs font-bold text-slate-300 block font-sans">
                      رمز تفويض Google (OAuth Access Token) <span className="text-red-400">*</span>
                    </label>
                    <p className="text-[11px] text-slate-400 leading-snug font-sans">
                      يلزم رمز تفويض مدعّم بالصلاحيات السحابية للتواصل الآمن مع Drive, Sheets, Slides, Calendar, Tasks, Google Chat و Forms.
                    </p>
                    <div className="relative">
                      <input
                        type="password"
                        value={gToken || ""}
                        onChange={(e) => setGToken(e.target.value)}
                        placeholder="أدخل رمز Access Token الذي يبدأ بـ ya29... للربط الفوري"
                        className="w-full bg-[#030712]/60 border border-white/10 p-3 px-4 text-xs rounded-xl text-left text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono tracking-wider placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 flex flex-row gap-2">
                    <button
                      onClick={handleSaveGoogleSetupLocal}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold p-3 px-5 rounded-xl flex-1 cursor-pointer transition-all active:scale-95 text-center shadow-lg shadow-blue-600/15 border border-blue-500/30"
                    >
                      حفظ وتفويض الاتصال
                    </button>
                    {gToken && (
                      <button
                        onClick={handleClearGoogleSetupLocal}
                        className="bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 p-3 rounded-xl cursor-pointer transition-all text-xs"
                        title="إلغاء الربط"
                      >
                        قطع الاتصال
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 p-3 px-4 bg-blue-500/5 rounded-xl border border-blue-500/10 text-xs text-sky-300 leading-relaxed max-w-3xl">
                  💡 <strong>إرشاد للأستاذ:</strong> يمكنك الحصول على رمز التحقق ومزاولة الصلاحيات عبر الضغط على "تسجيل الدخول" في نافذة المطورين بـ Google، أو استعمال المزاودة للتواصل مع بيئات مدرستك.
                </div>
              </div>

              {/* 7 Services Grid Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* SERVICE 1: GOOGLE DRIVE */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 01</span>
                      <span className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Drive 📂</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>تخزين المناهج على Google Drive</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      قم بحفظ المخطط البيداغوجي الحالي المولّد بالذكاء الاصطناعي مباشرة إلى حساب Google Drive الخاص بك كنسخة ويب تفاعلية HTML، جاهزة للمشاركة والقراءة من أي جهاز في أي وقت.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {driveFileUrl && (
                      <a
                        href={driveFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold font-sans hover:bg-slate-950 transition-colors"
                      >
                        🔗 فتح ملف المنهج المرفوع في Drive
                      </a>
                    )}
                    <button
                      onClick={handleDriveExport}
                      disabled={driveExportStatus === "loading"}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center flex items-center justify-center gap-1"
                    >
                      {driveExportStatus === "loading" ? "جاري الرفع والسير الـ..." : "تصدير المخطط البيداغوجي المفتوح لـ Drive"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 2: GOOGLE SHEETS */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-emerald-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 02</span>
                      <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Sheets 📊</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>تصدير الموزع المنهجي لـ Google Sheets</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      يقوم المحرك بتحويل هيكل الوحدة (السلوكية) الخاص بـ MQ1 إلى ملف إكسل تفاعلي على Google Sheets يتطابق تماماً مع معايير INFEP، مما يتيح للأستاذ طباعته أو إرفاقه ورقياً بالملف التقني.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {sheetUrl && (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/25 text-emerald-400 text-xs text-center font-bold font-sans hover:bg-slate-950 transition-colors"
                      >
                        🔗 فتح مجلد المجدول الناشئ Sheets
                      </a>
                    )}
                    <button
                      onClick={handleSheetsExport}
                      disabled={sheetExportStatus === "loading"}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center flex items-center justify-center gap-1 shadow-lg shadow-emerald-600/10"
                    >
                      {sheetExportStatus === "loading" ? "جاري تصدير الخلايا والمعطيات..." : "تصدير جدول توزيع مقياس MQ1 المعياري"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 3: GOOGLE CALENDAR */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 03</span>
                      <span className="bg-blue-500/15 text-blue-300 border border-blue-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Calendar 🗓️</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">جدولة الحصص والامتحانات في التقويم</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      صمم و جدول حصصك وأعمالك التطبيقية لمقياس MQ1 باليوم والساعة في تقويم Google لترسل دعوات حضور المتربصين تلقائياً.
                    </p>

                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">اسم الحصة / الموضوع</label>
                        <input
                          type="text"
                          value={calEventTitle}
                          onChange={(e) => setCalEventTitle(e.target.value)}
                          className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-right focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">التاريخ</label>
                          <input
                            type="date"
                            value={calEventDate}
                            onChange={(e) => setCalEventDate(e.target.value)}
                            className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-center font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">النهاية</label>
                            <input
                              type="text"
                              value={calEventEnd}
                              onChange={(e) => setCalEventEnd(e.target.value)}
                              className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-center font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">البدء</label>
                            <input
                              type="text"
                              value={calEventStart}
                              onChange={(e) => setCalEventStart(e.target.value)}
                              className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-center font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {calendarEventUrl && (
                      <a
                        href={calendarEventUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-950/60 p-2 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold font-sans hover:bg-slate-950 transition-colors"
                      >
                        🔗 فتح الحدث البيداغوجي في تقويم Google
                      </a>
                    )}
                    <button
                      onClick={handleCalendarExport}
                      disabled={calExportStatus === "loading"}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center"
                    >
                      {calExportStatus === "loading" ? "جاري جدولة الحصة الحالية..." : "جدولة الحصة بـ Google Calendar"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 4: GOOGLE SLIDES */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-yellow-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 04</span>
                      <span className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Slides 🎨</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>توليد عرض شرائح تقديمي (Google Slides)</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      انطلاقاً من خطة الدرس البيداغوجية، يتولى المحرك استخلاص النقاط المعرفية وسلسلة الأنشطة، لينشئ عرضاً تقديمياً جاهزاً على Google Slides لتعرضه لطلابك بالقسم.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {slidesUrl && (
                      <a
                        href={slidesUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold font-sans hover:bg-slate-950 transition-colors"
                      >
                        🔗 فتح العرض التقديمي في Google Slides
                      </a>
                    )}
                    <button
                      onClick={handleSlidesExport}
                      disabled={slidesExportStatus === "loading"}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center flex items-center justify-center"
                    >
                      {slidesExportStatus === "loading" ? "جاري توليد الشرائح البيداغوجية..." : "تحويل الدرس لشرائح Google Slides"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 5: GOOGLE TASKS */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-blue-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 05</span>
                      <span className="bg-sky-500/15 text-sky-300 border border-sky-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Tasks ✍️</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">مهام الأستاذ البيداغوجية اليومية</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      أنشئ مهام إعداد وتحضير واختبار لمقياس تجميع العتاد والبرمجة وصدرها إلى تطبيق Google Tasks لتنظيم وإتمام التكاليف البيداغوجية.
                    </p>

                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">اسم المهمة</label>
                        <input
                          type="text"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-right focus:outline-none focus:border-blue-500 font-sans"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">وصف وعناصر المهمة</label>
                        <textarea
                          rows={2}
                          value={taskNotes}
                          onChange={(e) => setTaskNotes(e.target.value)}
                          className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-right focus:outline-none focus:border-blue-500 font-sans resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={handleTaskExport}
                      disabled={taskExportStatus === "loading"}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center border border-white/10"
                    >
                      {taskExportStatus === "loading" ? "جاري تدوين التكليف..." : "إدارج المهمة بـ Google Tasks"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 6: GOOGLE CHAT */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-indigo-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 06</span>
                      <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Chat 💬</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">إشعار الزملاء وإدارة القسم (Google Chat)</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      أرسل إخطاراً بيداغوجياً فوري الحيوية لأعضاء القسم أو فريق البيداغوجيا بمركز التكوين المهني عبر Google Chat Webhook.
                    </p>

                    <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-2 font-mono">Chat Space Webhook URL</label>
                        <input
                          type="text"
                          value={chatWebhookUrl}
                          onChange={(e) => setChatWebhookUrl(e.target.value)}
                          placeholder="https://chat.googleapis.com/v1/spaces/..."
                          className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-left text-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">الرسالة المراد بثها</label>
                        <textarea
                          rows={2}
                          value={chatMessageText}
                          onChange={(e) => setChatMessageText(e.target.value)}
                          className="w-full bg-[#030712] border border-white/10 p-1.5 text-xs text-slate-200 rounded-lg text-right focus:outline-none focus:border-indigo-500 font-sans resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={handleChatExport}
                      disabled={chatExportStatus === "loading"}
                      className="w-full bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center border border-indigo-505/20 shadow-lg shadow-indigo-600/15"
                    >
                      {chatExportStatus === "loading" ? "جاري إطلاق الرسالة..." : "بث إشعار الـ بيداغوجيا بـ Google Chat"}
                    </button>
                  </div>
                </div>

                {/* SERVICE 7: GOOGLE FORMS */}
                <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-purple-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 font-mono">Service 07</span>
                      <span className="bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Forms 📝</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>تصميم اختبارات المتربصين (Google Forms)</span>
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      يقوم الصانع باستخراج أسئلة فرض كشف الكفاءة وتجميع العينات من خطة العمل وإنشائها تلقائياً كنموذج Google Form Quiz متفاعل مع خيارات متعددة وإجابات نموذجية.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {formsUrl && (
                      <a
                        href={formsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs text-center font-bold font-sans hover:bg-slate-950 transition-colors"
                      >
                        🔗 توزيع رابط الاختبار على الطلاب
                      </a>
                    )}
                    <button
                      onClick={handleFormExport}
                      disabled={formsExportStatus === "loading"}
                      className="w-full bg-purple-650 hover:bg-purple-600 text-white text-xs font-black py-2.5 px-4 rounded-xl cursor-pointer transition-all text-center border border-purple-500/20 shadow-lg shadow-purple-600/15"
                    >
                      {formsExportStatus === "loading" ? "جاري صياغة الأسئلة السلوكية..." : "توليد ونشر اختبار Google Forms Quiz"}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Aesthetic Footer Block */}
      <footer className="mt-20 border-t border-white/10 bg-slate-950/20 backdrop-blur-md py-8 px-4 text-center text-xs md:text-sm text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} الأستاذ الذكي - جميع الحقوق البيداغوجية والبرمجية محفوظة ومؤتمتة.</p>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>صُنع مع الكثير من</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>لدعم الأستاذ المتميز في رسالته وتوازنه المهني</span>
          </div>
        </div>
      </footer>

      </div>
      )}
    </div>
  );
}
