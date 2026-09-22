const fs = require("fs");
const path = require("path");

const root = __dirname;
const htmlPath = path.join(root, "blood_donation_system_report.html");
const pdfPath = path.join(root, "blood_donation_system_report.pdf");

const html = fs.readFileSync(htmlPath, "utf8");

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value) {
  return decodeEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(h1|h2|h3|p|li|tr|div|section|ol|ul|table)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<t[dh][^>]*>/gi, "  ")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
  );
}

function normalizeLines(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const sections = [...html.matchAll(/<section\b[\s\S]*?<\/section>/gi)].map((match) => match[0]);
const pages = [];

for (const section of sections) {
  const lines = normalizeLines(stripTags(section));
  if (lines.length > 0) pages.push(lines);
}

const pageWidth = 595.28;
const pageHeight = 841.89;
const marginLeft = 54;
const marginTop = 64;
const marginBottom = 54;
const normalSize = 11;
const headingSize = 15;
const titleSize = 18;
const lineGap = 5;
const maxWidth = 88;

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLine(line, limit = maxWidth) {
  if (line.length <= limit) return [line];
  const words = line.split(" ");
  const wrapped = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) wrapped.push(current);
  return wrapped;
}

function classify(line, index) {
  if (index === 0 || /^Chapter \d+/i.test(line)) return "title";
  if (/^\d+\.\d+/.test(line) || /^(Appendix|References|Certificate|Declaration|Acknowledgement|Abstract|Table of Contents)\b/i.test(line)) {
    return "heading";
  }
  return "normal";
}

function makeTextCommands(sourceLines) {
  const commands = [];
  let y = pageHeight - marginTop;
  let page = [];

  function pushPage() {
    if (page.length > 0) {
      commands.push(page);
      page = [];
    }
    y = pageHeight - marginTop;
  }

  sourceLines.forEach((line, index) => {
    const type = classify(line, index);
    const fontSize = type === "title" ? titleSize : type === "heading" ? headingSize : normalSize;
    const leading = fontSize + lineGap;
    const wrapped = wrapLine(line, type === "title" ? 58 : type === "heading" ? 76 : maxWidth);

    if (y - (wrapped.length * leading) < marginBottom) pushPage();
    if (type !== "normal" && page.length > 0) y -= 6;

    wrapped.forEach((part, partIndex) => {
      const x = type === "title"
        ? (pageWidth - (part.length * fontSize * 0.48)) / 2
        : marginLeft;
      const font = type === "normal" ? "F1" : "F2";
      page.push(`BT /${font} ${fontSize} Tf ${Math.max(marginLeft, x).toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(part)}) Tj ET`);
      y -= leading;
      if (partIndex === wrapped.length - 1 && type !== "normal") y -= 3;
    });
  });

  pushPage();
  return commands;
}

const allPdfPages = [];
pages.forEach((lines) => {
  const generated = makeTextCommands(lines);
  allPdfPages.push(...generated);
});

const objects = [];
function addObject(body) {
  objects.push(body);
  return objects.length;
}

const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObject("");
const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
const pageIds = [];

for (const pageCommands of allPdfPages) {
  const stream = pageCommands.join("\n");
  const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  pageIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [0];
objects.forEach((body, index) => {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefOffset = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

fs.writeFileSync(pdfPath, pdf, "binary");
console.log(`Created ${pdfPath} with ${pageIds.length} pages.`);
