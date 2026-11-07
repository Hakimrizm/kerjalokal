import { deflateSync, inflateSync } from "node:zlib";
import type { JobSeekerCvData } from "./data";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;
const CONTENT_WIDTH = RIGHT - LEFT;

type PreparedImage = {
  width: number;
  height: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  compressedHex: string;
  alphaHex?: string;
  alphaWidth?: number;
  alphaHeight?: number;
  jpeg: boolean;
};

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

function bytesToHex(bytes: Uint8Array): string {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += bytes[index].toString(16).padStart(2, "0");
  }
  return result.toUpperCase();
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (startOfFrameMarkers.has(marker)) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += segmentLength;
  }
  return null;
}

function paethPredictor(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodePng(bytes: Uint8Array): PreparedImage | null {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value)) return null;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = 0;
  const idatChunks: Uint8Array[] = [];

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const chunkLength = readUint32(bytes, offset);
    const chunkType = String.fromCharCode(
      bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7],
    );
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (dataEnd + 4 > bytes.length) return null;

    if (chunkType === "IHDR") {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlace = bytes[dataStart + 12];
    } else if (chunkType === "IDAT") {
      idatChunks.push(bytes.slice(dataStart, dataEnd));
    } else if (chunkType === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }

  const channelsByColorType: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByColorType[colorType];
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || !channels || !idatChunks.length) {
    return null;
  }

  const compressedLength = idatChunks.reduce((total, chunk) => total + chunk.length, 0);
  const compressed = new Uint8Array(compressedLength);
  let compressedOffset = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  }

  let decoded: Uint8Array;
  try {
    decoded = new Uint8Array(inflateSync(compressed));
  } catch {
    return null;
  }

  const rowLength = width * channels;
  const expectedLength = height * (rowLength + 1);
  if (decoded.length < expectedLength) return null;

  const pixels = new Uint8Array(height * rowLength);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = decoded[sourceOffset];
    sourceOffset += 1;
    const rowOffset = row * rowLength;

    for (let column = 0; column < rowLength; column += 1) {
      const raw = decoded[sourceOffset + column];
      const left = column >= channels ? pixels[rowOffset + column - channels] : 0;
      const above = row > 0 ? pixels[rowOffset - rowLength + column] : 0;
      const upperLeft = row > 0 && column >= channels
        ? pixels[rowOffset - rowLength + column - channels]
        : 0;

      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paethPredictor(left, above, upperLeft);
      else if (filter !== 0) return null;

      pixels[rowOffset + column] = (raw + predictor) & 0xff;
    }
    sourceOffset += rowLength;
  }

  const hasAlpha = colorType === 4 || colorType === 6;
  const outputChannels = colorType === 0 || colorType === 4 ? 1 : 3;
  const colorBytes = new Uint8Array(width * height * outputChannels);
  const alphaBytes = hasAlpha ? new Uint8Array(width * height) : undefined;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const sourceIndex = pixel * channels;
    const targetIndex = pixel * outputChannels;
    if (colorType === 0) {
      colorBytes[targetIndex] = pixels[sourceIndex];
    } else if (colorType === 2) {
      colorBytes[targetIndex] = pixels[sourceIndex];
      colorBytes[targetIndex + 1] = pixels[sourceIndex + 1];
      colorBytes[targetIndex + 2] = pixels[sourceIndex + 2];
    } else if (colorType === 4) {
      colorBytes[targetIndex] = pixels[sourceIndex];
      alphaBytes![pixel] = pixels[sourceIndex + 1];
    } else {
      colorBytes[targetIndex] = pixels[sourceIndex];
      colorBytes[targetIndex + 1] = pixels[sourceIndex + 1];
      colorBytes[targetIndex + 2] = pixels[sourceIndex + 2];
      alphaBytes![pixel] = pixels[sourceIndex + 3];
    }
  }

  return {
    width,
    height,
    colorSpace: outputChannels === 1 ? "DeviceGray" : "DeviceRGB",
    compressedHex: bytesToHex(new Uint8Array(deflateSync(colorBytes))),
    alphaHex: alphaBytes ? bytesToHex(new Uint8Array(deflateSync(alphaBytes))) : undefined,
    alphaWidth: alphaBytes ? width : undefined,
    alphaHeight: alphaBytes ? height : undefined,
    jpeg: false,
  };
}

function prepareImage(bytes?: Uint8Array | null, contentType?: string | null): PreparedImage | null {
  if (!bytes?.length) return null;
  const type = (contentType || "").toLowerCase().split(";")[0].trim();

  if (type === "image/jpeg" || type === "image/jpg" || (!type && bytes[0] === 0xff && bytes[1] === 0xd8)) {
    const dimensions = jpegDimensions(bytes);
    if (!dimensions) return null;
    return {
      ...dimensions,
      colorSpace: "DeviceRGB",
      compressedHex: bytesToHex(bytes),
      jpeg: true,
    };
  }

  if (type === "image/png" || (!type && bytes[0] === 137 && bytes[1] === 80)) {
    return decodePng(bytes);
  }

  return null;
}

export function buildJobSeekerCvPdf(
  data: JobSeekerCvData,
  photoBytes?: Uint8Array | null,
  photoContentType?: string | null,
): Uint8Array {
  const image = prepareImage(photoBytes, photoContentType);
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
    options: { indent?: number; after?: number; color?: string; maxWidth?: number } = {},
  ) => {
    const indent = options.indent || 0;
    const availableWidth = options.maxWidth ?? (CONTENT_WIDTH - indent);
    const maxCharacters = Math.max(24, Math.floor(availableWidth / (size * 0.52)));
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

  let headerWidth = CONTENT_WIDTH;
  if (image) {
    const boxWidth = 64;
    const boxHeight = 82;
    const scale = Math.min(boxWidth / image.width, boxHeight / image.height);
    const displayWidth = image.width * scale;
    const displayHeight = image.height * scale;
    const displayX = RIGHT - boxWidth + (boxWidth - displayWidth) / 2;
    const displayY = PAGE_HEIGHT - 48 - boxHeight + (boxHeight - displayHeight) / 2;
    commands().push(
      `q ${displayWidth.toFixed(2)} 0 0 ${displayHeight.toFixed(2)} ${displayX.toFixed(2)} ${displayY.toFixed(2)} cm /Im1 Do Q`,
    );
    commands().push(
      `q 0.78 G 0.6 w ${RIGHT - boxWidth} ${PAGE_HEIGHT - 48 - boxHeight} ${boxWidth} ${boxHeight} re S Q`,
    );
    headerWidth = CONTENT_WIDTH - boxWidth - 14;
  }

  const name = cleanText(data.fullName) || "Pencari Kerja";
  drawText(name, 23, true, { after: 2, color: "0.12 0.18 0.23", maxWidth: headerWidth });
  if (data.desiredPosition) {
    drawText(data.desiredPosition, 11, true, { after: 7, color: "0.30 0.38 0.43", maxWidth: headerWidth });
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
  if (contact) drawText(contact, 8.5, false, { after: 8, color: "0.32 0.38 0.42", maxWidth: headerWidth });
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

  if (pages.length === 1 && pages[0].length <= (image ? 6 : 4)) {
    drawText("Lengkapi bagian profil, pengalaman, pendidikan, atau keahlian untuk membuat CV lebih informatif.", 9, false);
  }

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

  let imageObjectId: number | null = null;
  if (image) {
    let softMaskId: number | null = null;
    if (image.alphaHex) {
      const alphaStream = `${image.alphaHex}>`;
      softMaskId = addObject(
        `<< /Type /XObject /Subtype /Image /Width ${image.alphaWidth} /Height ${image.alphaHeight} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${alphaStream.length} >>\nstream\n${alphaStream}\nendstream`,
      );
    }

    const imageStream = image.jpeg ? `${image.compressedHex}>` : `${image.compressedHex}>`;
    const filter = image.jpeg
      ? "[/ASCIIHexDecode /DCTDecode]"
      : "[/ASCIIHexDecode /FlateDecode]";
    const softMask = softMaskId ? ` /SMask ${softMaskId} 0 R` : "";
    imageObjectId = addObject(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter ${filter}${softMask} /Length ${imageStream.length} >>\nstream\n${imageStream}\nendstream`,
    );
  }

  const pageIds: number[] = [];
  for (const pageCommands of pages) {
    const stream = pageCommands.join("\n");
    const streamLength = new TextEncoder().encode(stream).length;
    const contentId = addObject(`<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`);
    const xObjectResource = imageObjectId ? ` /XObject << /Im1 ${imageObjectId} 0 R >>` : "";
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >>${xObjectResource} >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  const encoder = new TextEncoder();

  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}
