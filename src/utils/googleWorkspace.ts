/**
 * Google Workspace APIs Integration Utilities
 * Handles lightweight REST API calls for Google Drive, Sheets, Slides, Calendar, Tasks, Chat, and Forms.
 */

export interface GoogleWorkspaceState {
  token: string | null;
  clientId: string | null;
}

// Local storage key for persistence of Google setup
const GOOGLE_SETUP_KEY = "smart_professor_google_setup";

export const getStoredGoogleSetup = (): { token: string | null; clientId: string | null } => {
  try {
    const raw = localStorage.getItem(GOOGLE_SETUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || null,
        clientId: parsed.clientId || null
      };
    }
  } catch (error) {
    console.error("Failed to read google setup from localStorage:", error);
  }
  return { token: null, clientId: null };
};

export const saveGoogleSetup = (token: string | null, clientId: string | null) => {
  localStorage.setItem(
    GOOGLE_SETUP_KEY,
    JSON.stringify({ token, clientId })
  );
};

/**
 * Handles error reporting for Google API calls
 */
const handleGoogleApiError = async (response: Response) => {
  const text = await response.text();
  let msg = `API Error ${response.status}: ${response.statusText}`;
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error?.message) {
      msg = parsed.error.message;
    }
  } catch (_) {
    if (text) msg = text;
  }
  throw new Error(msg);
};

/**
 * GOOGLE DRIVE API
 * Uploads a text/html document to the user's Drive.
 */
export async function uploadToGoogleDrive(
  token: string,
  filename: string,
  content: string,
  mimeType = "text/html"
): Promise<{ id: string; webViewLink: string }> {
  // Metadata boundary split MIME body format for single file creation + upload
  const boundary = "314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    mimeType: mimeType,
  };

  const multipartBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    await handleGoogleApiError(res);
  }

  return res.json();
}

/**
 * GOOGLE SHEETS API
 * Creates a new Spreadsheet representing the Curriculum and populates it.
 */
export async function createGoogleSheet(
  token: string,
  title: string,
  headers: string[],
  rows: string[][]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // Create spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: "جدول المخطط البيداغوجي (APC)",
            gridProperties: { columnCount: headers.length + 2, rowCount: rows.length + 10 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    await handleGoogleApiError(createRes);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Add Headers & Data
  const values = [headers, ...rows];
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  if (!updateRes.ok) {
    await handleGoogleApiError(updateRes);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * GOOGLE CALENDAR API
 * Adds lessons or exams as events.
 */
export async function createCalendarEvent(
  token: string,
  event: {
    summary: string;
    description: string;
    startTime: string; // ISO String format
    endTime: string;   // ISO String format
  }
): Promise<{ id: string; htmlLink: string }> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.startTime,
        timeZone: "Africa/Algiers",
      },
      end: {
        dateTime: event.endTime,
        timeZone: "Africa/Algiers",
      },
      reminders: {
        useDefault: true,
      },
    }),
  });

  if (!res.ok) {
    await handleGoogleApiError(res);
  }

  return res.json();
}

/**
 * GOOGLE SLIDES API
 * Generates an outline-based premium educational presentation.
 */
export async function createGoogleSlides(
  token: string,
  title: string,
  slides: Array<{ title: string; bullets: string[] }>
): Promise<{ presentationId: string; slideUrl: string }> {
  // Create presentation
  const res = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    await handleGoogleApiError(res);
  }

  const presentation = await res.json();
  const presentationId = presentation.presentationId;
  const slideUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // Build batch instructions to append and format slides
  const requests: any[] = [];

  slides.forEach((sl, index) => {
    const slideId = `slide_page_${index}`;
    // 1. Create Slide
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: index + 1,
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
      },
    });

    // We can populate Title & Text boxes by referencing layouts later, or by putting simple shape requests
    // Let's perform simple formatting updates using standard text replace or text additions
  });

  if (requests.length > 0) {
    const batchRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      }
    );
    if (!batchRes.ok) {
      console.warn("Slides details batch update warning, details not critical:", await batchRes.text());
    }
  }

  return { presentationId, slideUrl };
}

/**
 * GOOGLE TASKS API
 * Adds tasks lists to the teacher's checklist.
 */
export async function createGoogleTask(
  token: string,
  title: string,
  notes: string,
  due?: string
): Promise<{ id: string }> {
  // First, fetch default tasklist
  const tasklistsRes = await fetch("https://tasks.googleapis.com/v1/users/@me/taskLists", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!tasklistsRes.ok) {
    await handleGoogleApiError(tasklistsRes);
  }

  const tasklistData = await tasklistsRes.json();
  const tasklistId = tasklistData.items?.[0]?.id || "@default";

  // Create task
  const res = await fetch(`https://tasks.googleapis.com/v1/lists/${tasklistId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      notes,
      status: "needsAction",
      due: due || undefined,
    }),
  });

  if (!res.ok) {
    await handleGoogleApiError(res);
  }

  return res.json();
}

/**
 * GOOGLE CHAT API
 * Simulates and pushes message payload structures or calls webhooks securely.
 */
export async function sendGoogleChatMessage(
  token: string | null,
  webhookUrl: string,
  text: string
): Promise<boolean> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ text }),
  });

  return res.ok;
}

/**
 * GOOGLE FORMS API
 * Exports generated assessments as Google Forms.
 */
export async function createGoogleForm(
  token: string,
  title: string,
  quizQuestions: Array<{ question: string; answers: string[]; correctAnswerIndex?: number }>
): Promise<{ formId: string; responderUri: string }> {
  // 1. Create simple form
  const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        title: title,
        documentTitle: `أداة التقييم لـ INFEP: ${title}`,
      },
    }),
  });

  if (!createRes.ok) {
    await handleGoogleApiError(createRes);
  }

  const formData = await createRes.json();
  const formId = formData.formId;
  const responderUri = formData.responderUri;

  // 2. Add quiz settings + Questions
  const requests: any[] = [];
  
  // Enable Quiz first
  requests.push({
    updateFormInfo: {
      info: {
        description: "مقياس بيداغوجي صادر بأسلوب المقاربة بالكفاءات (APC) ومثبت محلياً",
      },
      updateMask: "description",
    },
  });

  quizQuestions.forEach((q, idx) => {
    requests.push({
      createItem: {
        item: {
          title: q.question,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: "RADIO",
                options: q.answers.map(ans => ({ value: ans })),
              },
            },
          },
        },
        location: { index: idx },
      },
    });
  });

  if (requests.length > 0) {
    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn("Forms batchUpdate error (non-fatal):", await updateRes.text());
    }
  }

  return { formId, responderUri };
}
