/**
 * Helper to download text content as a file.
 */
export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "text/plain;charset=utf-8" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function convertMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";
  
  // Split content by lines
  const lines = markdown.split("\n");
  let html = "";
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let inTable = false;
  let tableHeaderParsed = false;
  
  const closeListIfNeeded = () => {
    if (inList && listType) {
      html += `</${listType}>\n`;
      inList = false;
      listType = null;
    }
  };

  const closeTableIfNeeded = () => {
    if (inTable) {
      html += "</tbody></table></div>\n";
      inTable = false;
      tableHeaderParsed = false;
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const origLine = lines[idx];
    const line = origLine.trim();

    // Check for Table rows
    // Standard markdown table row starts with | and ends with |
    if (line.startsWith("|") && line.endsWith("|")) {
      closeListIfNeeded();
      
      // Split row values
      const cols = line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      
      // Skip divider rows like |---|---|
      const isDivider = cols.every(c => c.match(/^:?-+:?$/));
      if (isDivider) {
        continue;
      }

      if (!inTable) {
        html += `<div style="overflow-x:auto; margin: 1.5rem 0;"><table class="pedagogical-table" style="width:100%; border-collapse:collapse; text-align:right; border: 1px solid #cbd5e1; font-size: 0.9rem;">\n`;
        inTable = true;
      }

      if (!tableHeaderParsed) {
        html += "  <thead style=\"background-color:#f1f5f9; font-weight:bold;\"><tr>\n";
        cols.forEach(col => {
          html += `    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; direction: rtl;">${formatInlineStyles(col)}</th>\n`;
        });
        html += "  </tr></thead>\n";
        html += "  <tbody>\n";
        tableHeaderParsed = true;
      } else {
        html += "  <tr>\n";
        cols.forEach(col => {
          html += `    <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; direction: rtl;">${formatInlineStyles(col)}</td>\n`;
        });
        html += "  </tr>\n";
      }
      continue;
    } else {
      closeTableIfNeeded();
    }

    // Headers
    if (line.startsWith("# ")) {
      closeListIfNeeded();
      html += `<h1 style="color:#0f172a; margin-top:2rem; margin-bottom:1rem; border-bottom:2px solid #e2e8f0; padding-bottom:0.5rem; font-size:1.6rem; font-weight:800; direction:rtl;">${formatInlineStyles(line.substring(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith("## ")) {
      closeListIfNeeded();
      html += `<h2 style="color:#1e293b; margin-top:1.8rem; margin-bottom:0.8rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.3rem; font-size:1.3rem; font-weight:700; direction:rtl;">${formatInlineStyles(line.substring(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith("### ")) {
      closeListIfNeeded();
      html += `<h3 style="color:#334155; margin-top:1.5rem; margin-bottom:0.6rem; font-size:1.1rem; font-weight:700; direction:rtl;">${formatInlineStyles(line.substring(4))}</h3>\n`;
      continue;
    }

    // Unordered List (- or *)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList || listType !== "ul") {
        closeListIfNeeded();
        html += `<ul style="list-style-type:square; padding-right:2rem; margin:1rem 0; direction:rtl; text-align:right;">\n`;
        inList = true;
        listType = "ul";
      }
      html += `  <li style="margin-bottom:0.4rem; color:#334155;">${formatInlineStyles(line.substring(2))}</li>\n`;
      continue;
    }

    // Ordered List (digits like 1. )
    const numberedMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numberedMatch) {
      if (!inList || listType !== "ol") {
        closeListIfNeeded();
        html += `<ol style="list-style-type:decimal; padding-right:2rem; margin:1rem 0; direction:rtl; text-align:right;">\n`;
        inList = true;
        listType = "ol";
      }
      html += `  <li style="margin-bottom:0.4rem; color:#334155;">${formatInlineStyles(numberedMatch[2])}</li>\n`;
      continue;
    }

    // Empty lines
    if (!line) {
      if (inList) {
        closeListIfNeeded();
      }
      html += `<div style="height: 0.5rem;"></div>\n`;
      continue;
    }

    // Regular paragraphs
    closeListIfNeeded();
    html += `<p style="line-height:1.7; margin-bottom:1rem; color:#1e293b; text-align:justify; direction:rtl; font-size:0.95rem;">${formatInlineStyles(line)}</p>\n`;
  }

  // Final clean up
  closeListIfNeeded();
  closeTableIfNeeded();

  return html;
}

function formatInlineStyles(text: string): string {
  let content = text;
  
  // Bold **text**
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a; font-weight:700;">$1</strong>');
  
  // Italic *text*
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code `text`
  content = content.replace(/`(.*?)`/g, '<code style="background-color:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.85rem; color:#b45309;">$1</code>');
  
  return content;
}

export function downloadHtmlDocument(filename: string, title: string, markdown: string, imageUrl?: string) {
  const htmlContent = convertMarkdownToHtml(markdown);
  
  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    
    body {
      font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #ffffff;
      color: #1e293b;
      line-height: 1.6;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .official-header {
      border: 2px double #334155;
      padding: 20px;
      margin-bottom: 30px;
      text-align: center;
      background-color: #fafaf9;
      border-radius: 12px;
    }
    
    .republic-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }
    
    .ministry-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    
    .institute-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #475569;
    }
    
    .document-body {
      background: #ffffff;
      padding: 10px;
    }
    
    .diagram-container {
      margin: 35px 0;
      text-align: center;
      background-color: #f8fafc;
      border: 2px dashed #3b82f6;
      padding: 25px;
      border-radius: 16px;
      page-break-inside: avoid;
    }
    
    .diagram-image {
      max-width: 100%;
      height: auto;
      max-height: 550px;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.15), 0 8px 10px -6px rgba(59, 130, 246, 0.15);
      border: 2px solid #3b82f6;
      background-color: #ffffff;
    }
    
    .diagram-caption {
      font-size: 0.9rem;
      color: #1e3a8a;
      margin-top: 14px;
      font-weight: 700;
      font-family: 'Cairo', sans-serif;
    }

    .diagram-subcaption {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 4px;
    }
    
    .pedagogical-table {
      margin: 25px 0;
      border-collapse: collapse;
      width: 100%;
      page-break-inside: auto;
    }
    
    .pedagogical-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    .pedagogical-table th {
      background-color: #2563eb !important;
      color: #ffffff !important;
      font-weight: 700;
      border: 1px solid #94a3b8;
      padding: 12px;
      font-size: 0.95rem;
      text-align: right;
    }
    
    .pedagogical-table td {
      border: 1px solid #cbd5e1;
      padding: 10px;
      font-size: 0.9rem;
      text-align: right;
    }
    
    .pedagogical-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .signature-section {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      page-break-inside: avoid;
      direction: rtl;
    }

    .signature-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      background-color: #fafaf9;
    }

    .signature-title {
      font-weight: 700;
      font-size: 0.95rem;
      color: #334155;
      margin-bottom: 35px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .signature-line {
      font-size: 0.85rem;
      color: #94a3b8;
    }
    
    .page-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 60px;
      padding-top: 15px;
      text-align: center;
      font-size: 0.8rem;
      color: #64748b;
    }
    
    @media print {
      body {
        padding: 0;
        font-size: 12pt;
      }
      .official-header {
        border-color: #000;
        background-color: #fff !important;
      }
      .diagram-container {
        border: 2px solid #000;
        background-color: #fff !important;
        page-break-inside: avoid;
      }
      .diagram-image {
        border-color: #000;
        box-shadow: none !important;
      }
      .pedagogical-table th {
        background-color: #e2e8f0 !important;
        color: #000000 !important;
        border-color: #000;
      }
      .pedagogical-table td {
        border-color: #000;
      }
      .signature-card {
        background-color: #fff !important;
        border-color: #000;
      }
      .page-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: 1px solid #000;
      }
    }
  </style>
</head>
<body>
  
  <div class="official-header">
    <div class="republic-title">الجمهورية الجزائرية الديمقراطية الشعبية</div>
    <div class="ministry-title">وزارة التكوين والتعليم المهنيين</div>
    <div class="institute-title">المعهـــد الوطـــني للتكـويـــن والتعليــم المهنيــين (INFEP)</div>
  </div>

  <div class="document-body">
    ${htmlContent}
    
    ${imageUrl ? `
    <div class="diagram-container">
      <img src="${imageUrl}" class="diagram-image" alt="المخطط التعليمي المولد بالذكاء الاصطناعي" />
      <div class="diagram-caption">🎨 المخطط التوضيحي البيداغوجي المرفق (توليد الذكاء الاصطناعي للهندسة الفنية)</div>
      <div class="diagram-subcaption">معتمد بأسلوب المقاربة بالكفاءات لدعم الممارسات التطبيقية بالورشات والقاعات التقنية ونمذجة المعطيات التفاعلية.</div>
    </div>
    ` : ''}
  </div>

  <div class="signature-section">
    <div class="signature-card">
      <div class="signature-title">إمضاء وختم مكوّن / أستاذ المادة</div>
      <div class="signature-line">التوقيع: ............................</div>
    </div>
    <div class="signature-card">
      <div class="signature-title">رأي وإمضاء المفتش أو المدير البيداغوجي</div>
      <div class="signature-line">التوقيع والختم: ............................</div>
    </div>
  </div>

  <div class="page-footer">
    تم التوليد والتنسيق بواسطة منصة الأستاذ المحترف للتكوين بأسلوب المقاربة بالكفاءات (APC) © 2026
  </div>

</body>
</html>`;

  const element = document.createElement("a");
  const file = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}


export async function downloadDocxDocument(filename: string, title: string, markdown: string, imageUrl?: string) {
  const htmlContent = convertMarkdownToHtml(markdown);
  
  // This uses a robust, widely compatible MS Word HTML representation. 
  // It ensures the browser generates a download that Word and other editors open immediately in Page view with RTL layouts.
  const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: 21cm 29.7cm; /* A4 size */
      margin: 2.5cm 2.5cm 2.5cm 2.5cm;
    }
    body {
      font-family: 'Arial', 'Segoe UI', sans-serif;
      direction: rtl;
      unicode-bidi: embed;
      line-height: 1.5;
      color: #1e293b;
    }
    .official-header {
      border: 3px double #334155;
      padding: 15px;
      margin-bottom: 25px;
      text-align: center;
      background-color: #fafaf9;
    }
    .republic-title {
      font-size: 14pt;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 5px;
    }
    .ministry-title {
      font-size: 12pt;
      font-weight: bold;
      color: #334155;
      margin-bottom: 5px;
    }
    .institute-title {
      font-size: 11pt;
      color: #475569;
    }
    h1, h2, h3, h4 {
      font-family: 'Arial', sans-serif;
      font-weight: bold;
      color: #1e3a8a;
      margin-top: 15pt;
      margin-bottom: 8pt;
    }
    h1 { font-size: 18pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; }
    h2 { font-size: 14pt; }
    h3 { font-size: 12pt; }
    
    p, li {
      font-size: 11pt;
      margin-bottom: 6pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15pt;
      margin-bottom: 15pt;
    }
    th {
      background-color: #2563eb;
      color: #ffffff;
      font-weight: bold;
      border: 1px solid #cbd5e1;
      padding: 8pt;
      font-size: 11pt;
      text-align: right;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 7pt;
      font-size: 10.5pt;
      text-align: right;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .diagram-container {
      margin: 25pt 0;
      text-align: center;
      border: 2px dashed #3b82f6;
      padding: 15pt;
      background-color: #f8fafc;
    }
    .diagram-image {
      max-width: 100%;
      height: auto;
    }
    .diagram-caption {
      font-size: 10pt;
      color: #1e3a8a;
      font-weight: bold;
      margin-top: 10pt;
    }
    .diagram-subcaption {
      font-size: 8.5pt;
      color: #64748b;
    }
    
    .signature-section {
      margin-top: 40pt;
      width: 100%;
    }
    .signature-table {
      width: 100%;
      border-collapse: collapse;
    }
    .signature-table td {
      border: 1px solid #e2e8f0;
      width: 50%;
      padding: 15pt;
      text-align: center;
      background-color: #fafaf9;
    }
    .signature-title {
      font-weight: bold;
      font-size: 11pt;
      color: #334155;
      margin-bottom: 45pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4pt;
    }
    
    .page-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 40pt;
      padding-top: 10pt;
      text-align: center;
      font-size: 9pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="official-header">
    <div class="republic-title">الجمهورية الجزائرية الديمقراطية الشعبية</div>
    <div class="ministry-title">وزارة التكوين والتعليم المهنيين</div>
    <div class="institute-title">المعهـــد الوطـــني للتكـويـــن والتعليــم المهنيــين (INFEP)</div>
  </div>

  <div class="document-body">
    ${htmlContent}
    
    ${imageUrl ? `
    <div class="diagram-container">
      <img src="${imageUrl}" class="diagram-image" alt="المخطط التعليمي" />
      <div class="diagram-caption">🎨 المخطط التوضيحي البيداغوجي المرفق (توليد الذكاء الاصطناعي للهندسة الفنية)</div>
      <div class="diagram-subcaption">معتمد بأسلوب المقاربة بالكفاءات لدعم الممارسات التطبيقية بالورشات والقاعات التقنية ونمذجة المعطيات التفاعلية.</div>
    </div>
    ` : ''}
  </div>

  <div class="signature-section">
    <table class="signature-table">
      <tr>
        <td>
          <div class="signature-title">إمضاء وختم مكوّن / أستاذ المادة</div>
          <div>التوقيع: ............................</div>
        </td>
        <td>
          <div class="signature-title">رأي وإمضاء المفتش أو المدير البيداغوجي</div>
          <div>التوقيع والختم: ............................</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="page-footer">
    تم التوليد والتنسيق بواسطة منصة الأستاذ المحترف للتكوين بأسلوب المقاربة بالكفاءات (APC) © 2026
  </div>
</body>
</html>`;

  try {
    const response = await fetch("/api/export-docx", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        html: wordHtml,
        title: title
      })
    });

    if (!response.ok) {
      throw new Error("Server-side docx build failed or is missing layout.");
    }

    const blob = await response.blob();
    const element = document.createElement("a");
    const url = URL.createObjectURL(blob);
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("Server dynamic docx generator failed/is offline, invoking browser standard fallback container.", err);
    const blob = new Blob([wordHtml], { type: "application/msword;charset=utf-8" });
    const element = document.createElement("a");
    const url = URL.createObjectURL(blob);
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }
}


export function downloadPdfDocument(title: string, markdown: string, imageUrl?: string) {
  const htmlContent = convertMarkdownToHtml(markdown);
  
  const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    
    body {
      font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
      color: #1e293b;
      line-height: 1.6;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .official-header {
      border: 2px double #334155;
      padding: 15px;
      margin-bottom: 25px;
      text-align: center;
      background-color: #fafaf9;
      border-radius: 12px;
    }
    
    .republic-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    
    .ministry-title {
      font-size: 1rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
    }
    
    .institute-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #475569;
    }
    
    .document-body {
      background: #ffffff;
      padding: 10px;
    }
    
    .diagram-container {
      margin: 30px 0;
      text-align: center;
      background-color: #f8fafc;
      border: 2px dashed #3b82f6;
      padding: 20px;
      border-radius: 14px;
      page-break-inside: avoid;
    }
    
    .diagram-image {
      max-width: 100%;
      height: auto;
      max-height: 450px;
      border-radius: 10px;
      border: 2px solid #3b82f6;
      background-color: #ffffff;
    }
    
    .diagram-caption {
      font-size: 0.85rem;
      color: #1e3a8a;
      margin-top: 10px;
      font-weight: 700;
    }

    .diagram-subcaption {
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 4px;
    }
    
    .pedagogical-table {
      margin: 20px 0;
      border-collapse: collapse;
      width: 100%;
      page-break-inside: auto;
    }
    
    .pedagogical-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    .pedagogical-table th {
      background-color: #2563eb !important;
      color: #ffffff !important;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 10px;
      font-size: 0.9rem;
      text-align: right;
    }
    
    .pedagogical-table td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      font-size: 0.85rem;
      text-align: right;
    }
    
    .pedagogical-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .signature-section {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      page-break-inside: avoid;
      direction: rtl;
    }

    .signature-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      background-color: #fafaf9;
    }

    .signature-title {
      font-weight: 700;
      font-size: 0.9rem;
      color: #334155;
      margin-bottom: 30px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .signature-line {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    
    .page-footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 50px;
      padding-top: 12px;
      text-align: center;
      font-size: 0.75rem;
      color: #64748b;
    }
    
    @media print {
      body {
        padding: 0;
        font-size: 11pt;
      }
      .official-header {
        border-color: #000;
        background-color: #fff !important;
      }
      .pedagogical-table th {
        background-color: #e2e8f0 !important;
        color: #000000 !important;
        border-color: #000;
      }
      .pedagogical-table td {
        border-color: #000;
      }
      .signature-card {
        background-color: #fff !important;
        border-color: #000;
      }
    }
  </style>
</head>
<body>
  <div class="official-header">
    <div class="republic-title">الجمهورية الجزائرية الديمقراطية الشعبية</div>
    <div class="ministry-title">وزارة التكوين والتعليم المهنيين</div>
    <div class="institute-title">المعهـــد الوطـــني للتكـويـــن والتعليــم المهنيــين (INFEP)</div>
  </div>

  <div class="document-body">
    ${htmlContent}
    ${imageUrl ? `
    <div class="diagram-container">
      <img src="${imageUrl}" class="diagram-image" alt="المخطط التعليمي المولد بالذكاء الاصطناعي" />
      <div class="diagram-caption">🎨 المخطط التوضيحي البيداغوجي المرفق (توليد الذكاء الاصطناعي للهندسة الفنية)</div>
      <div class="diagram-subcaption">معتمد بأسلوب المقاربة بالكفاءات لدعم الممارسات التطبيقية بالورشات والقاعات التقنية ونمذجة المعطيات التفاعلية.</div>
    </div>
    ` : ''}
  </div>

  <div class="signature-section">
    <div class="signature-card">
      <div class="signature-title">إمضاء وختم مكوّن / أستاذ المادة</div>
      <div class="signature-line">التوقيع: ............................</div>
    </div>
    <div class="signature-card">
      <div class="signature-title">رأي وإمضاء المفتش أو المدير البيداغوجي</div>
      <div class="signature-line">التوقيع والختم: ............................</div>
    </div>
  </div>

  <div class="page-footer">
    تم التوليد والتنسيق بواسطة منصة الأستاذ المحترف للتكوين بأسلوب المقاربة بالكفاءات (APC) © 2026
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(fullHtml);
    doc.close();
    
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("PDF Print failed:", err);
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 800);
  }
}


/**
 * Copy text safely to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.error("Clipboard write error:", e);
    }
  }
  
  // Fallback
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (error) {
    console.error("Fallback copy failed", error);
    document.body.removeChild(textArea);
    return false;
  }
}

/**
 * List of elegant teacher wellness and pedagogical encouragement tips
 */
export const TEACHER_WELLNESS_TIPS = [
  {
    title: "🧘 توازن الحياة والعمل",
    desc: "أستاذنا الفاضل، صحتك النفسية هامة جداً لنجاح حصتك. خصص 15 دقيقة يومية بعد الدوام للاسترخاء التام دون مراجعة أي أوراق تربوية."
  },
  {
    title: "☕ استراحة فنجان القهوة",
    desc: "لا تجعل الحصة المتكررة تشغلك عن شرب الماء والجلوس المريح. تذكر أن المعلم الهادئ يولد طالباً متفاعلاً ومبدعاً."
  },
  {
    title: "⏱️ قاعدة العشرين دقيقة",
    desc: "دع الطلاب يقودون النقاش في الحصة لمدة 20 دقيقة، هذا يخفف الضغط على حبالك الصوتية ويفعّل المقاربة بالكفاءة والتعلّم النشط تلقائياً."
  },
  {
    title: "🌟 ثمرة رسالتك النبيلة",
    desc: "الأثر الذي تتركه في عقول وقلوب زهور فصولك يدوم لأجيال. كن فخوراً بدقائق عطائك وصبرك الجميل اليوم."
  },
  {
    title: "🛡️ ذكاء تنظيمي",
    desc: "احتفظ بنسخ رقمية لجميع مراسلاتك واستدعاءات أولياء الأمور لتجنب تكرار الصياغات اليدوية وحماية وقتك الشخصي."
  }
];

export const PEDAGOGICAL_APC_PILLARS = [
  {
    id: "cognitive",
    title: "التفكيك المعرفي",
    desc: "تفكيك الأهداف الصعبة لخطوات ناعمة تمنع الطالب من الشعور بالعجز المبكر."
  },
  {
    id: "socratic",
    title: "الاستدلال السقراطي",
    desc: "طرح أسئلة توجيهية بدل الإجابات الملقنة لتنشيط مهارات التحليل العصبية."
  },
  {
    id: "differentiation",
    title: "التمايز والشمول",
    desc: "بناء مسارات بديلة لمراعاة الفروق الفردية وذوي تحديات الاستيعاب الأكاديمي."
  },
  {
    id: "friction",
    title: "إدارة طوارئ الحوادث",
    desc: "مكافحة انهيار التجهيزات بتوقع بدائل واقعية فجة تمنع الفوضى بذكاء صامت."
  }
];
