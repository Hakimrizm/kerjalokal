import type { JobSeekerCvData } from "./data";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;
const CONTENT_WIDTH = RIGHT - LEFT;

function cleanText(value: string | null | undefined): string {
  return (value || "")
    .replace(/\r?\n/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdf(value: string): string {
  return cleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxCharacters: number): string[] {
  const words = cleanText(value).split(" ").filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!line) {
      if (word.length > maxCharacters) {
        for (let index = 0; index < word.length; index += maxCharacters) {
          lines.push(word.slice(index, index + maxCharacters));
        }
      } else {
        line = word;
      }
      continue;
    }

    if (`${line} ${word}`.length <= maxCharacters) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      if (word.length > maxCharacters) {
        for (let index = 0; index < word.length; index += maxCharacters) {
          lines.push(word.slice(index, index + maxCharacters));
        }
        line = "";
      } else {
        line = word;
      }
    }
  }

  if (line) lines.push(line);
  return lines;
}

function formatMonth(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date);
}

function formatYear(value: number | null | undefined): string {
  return value ? String(value) : "";
}

export function buildJobSeekerCvPdf(data: JobSeekerCvData): Uint8Array {
  const pages: string[][] = [[]];
  let pageIndex = 0;
  let y = 790;

  const commands = () => pages[pageIndex];
  const ensureSpace = (height: number) => {
    if (y - height < 58) {
      pageIndex += 1;
      pages.push([]);
      y = 790;
    }
  };

  const drawText = (
    value: string,
    size = 9.5,
    bold = false,
    options: { indent?: number; after?: number; color?: string } = {},
  ) => {
    const indent = options.indent || 0;
    const maxCharacters = Math.max(24, Math.floor((CONTENT_WIDTH - indent) / (size * 0.52)));
    const lines = wrapText(value, maxCharacters);
    const lineHeight = size * 1.42;

    for (const line of lines) {
      ensureSpace(lineHeight);
      const color = options.color || "0.16 0.22 0.27";
      commands().push(
        `BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${LEFT + indent} ${y.toFixed(2)} Td (${escapePdf(line)}) Tj ET`,
      );
      y -= lineHeight;
    }
    y -= options.after ?? 3;
  };

  const drawRule = () => {
    ensureSpace(9);
    commands().push(`q 0.78 G 0.65 w ${LEFT} ${y.toFixed(2)} m ${RIGHT} ${y.toFixed(2)} l S Q`);
    y -= 10;
  };

  const section = (title: string) => {
    ensureSpace(34);
    y -= 4;
    drawText(title.toUpperCase(), 10.5, true, { after: 3, color: "0.16 0.22 0.27" });
    drawRule();
  };

  const name = cleanText(data.fullName) || "Pencari Kerja";
  drawText(name, 23, true, { after: 2, color: "0.12 0.18 0.23" });
  if (data.desiredPosition) {
    drawText(data.desiredPosition, 11, true, { after: 7, color: "0.30 0.38 0.43" });
  } else {
    y -= 5;
  }

  const contact = [
    data.email,
    data.phone,
    data.location,
    data.linkedinUrl,
    data.portfolioUrl,
  ].filter(Boolean).join(" | ");
  if (contact) drawText(contact, 8.5, false, { after: 8, color: "0.32 0.38 0.42" });
  drawRule();

  if (data.summary) {
    section("Profil Profesional");
    drawText(data.summary, 9.3, false, { after: 5 });
  }

  if (data.experiences.length) {
    section("Pengalaman Kerja");
    for (const item of data.experiences) {
      drawText(item.position, 10, true, { after: 1 });
      const companyLine = [item.company, item.location, item.employment_type]
        .filter(Boolean).join(" | ");
      if (companyLine) drawText(companyLine, 9, false, { after: 1, color: "0.30 0.38 0.43" });
      const start = formatMonth(item.start_date);
      const end = item.is_current ? "Sekarang" : formatMonth(item.end_date);
      const period = [start, end].filter(Boolean).join(" - ");
      if (period) drawText(period, 8.5, false, { after: 2, color: "0.42 0.47 0.50" });
      if (item.description) drawText(item.description, 9, false, { indent: 8, after: 6 });
      else y -= 4;
    }
  }

  if (data.education.length) {
    section("Pendidikan");
    for (const item of data.education) {
      drawText(item.institution, 10, true, { after: 1 });
      const detail = [item.education_level, item.major].filter(Boolean).join(" | ");
      if (detail) drawText(detail, 9, false, { after: 1, color: "0.30 0.38 0.43" });
      const start = formatYear(item.start_year);
      const end = item.is_current ? "Sekarang" : formatYear(item.end_year);
      const period = [start, end].filter(Boolean).join(" - ");
      if (period) drawText(period, 8.5, false, { after: 2, color: "0.42 0.47 0.50" });
      if (item.description) drawText(item.description, 9, false, { indent: 8, after: 5 });
      else y -= 3;
    }
  }

  if (data.skills.length) {
    section("Keahlian");
    drawText(data.skills.join(", "), 9.3, false, { after: 5 });
  }

  if (data.certificates.length) {
    section("Sertifikasi dan Pelatihan");
    for (const item of data.certificates) {
      drawText(item.certificate_name, 9.8, true, { after: 1 });
      const detail = [item.issuer, formatMonth(item.issue_date)].filter(Boolean).join(" | ");
      if (detail) drawText(detail, 8.8, false, { after: 1, color: "0.30 0.38 0.43" });
      if (item.credential_url) drawText(item.credential_url, 8.5, false, { indent: 8, after: 2 });
      if (item.description) drawText(item.description, 8.8, false, { indent: 8, after: 4 });
    }
  }

  if (data.languages.length) {
    section("Bahasa");
    drawText(data.languages.join(", "), 9.3, false, { after: 5 });
  }

  if (pages.length === 1 && pages[0].length <= 4) {
    drawText("Lengkapi bagian profil, pengalaman, pendidikan, atau keahlian untuk membuat CV lebih informatif.", 9, false);
  }

  // Simple page number footer; no decorative elements that interfere with ATS parsing.
  pages.forEach((pageCommands, index) => {
    pageCommands.push(
      `BT 0.50 0.55 0.58 rg /F1 8 Tf ${RIGHT - 38} 30 Td (${index + 1}) Tj ET`,
    );
  });

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject("");
  const pagesId = addObject("");
  const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  for (const pageCommands of pages) {
    const stream = pageCommands.join("\n");
    const streamLength = new TextEncoder().encode(stream).length;
    const contentId = addObject(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}
