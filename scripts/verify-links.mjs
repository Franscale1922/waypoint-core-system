import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const articlesDir = path.join(__dirname, "..", "content", "articles");

let hasErrors = false;

function extractRelatedSlugs(content) {
  const match = content.match(/relatedSlugs:\s*\[(.*?)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.replace(/['"]/g, "").trim())
    .filter(Boolean);
}

function verifyLinks() {
  console.log("Starting Markdown link verification...");
  
  const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith(".md"));
  const validSlugs = new Set(files.map((f) => f.replace(".md", "")));

  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    
    // Quick and dirty regex extraction to avoid heavy module loading in CI
    const relatedSlugs = extractRelatedSlugs(content);

    for (const slug of relatedSlugs) {
      if (!validSlugs.has(slug)) {
        console.error(`❌ Broken link detected in ${file}: related slug '${slug}' does not correspond to a valid Markdown file.`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error("\n❌ Link verification failed. Please fix broken relatedSlugs before deploying.");
    process.exit(1);
  } else {
    console.log(`✅ All relatedSlugs verified successfully across ${files.length} articles.`);
  }
}

verifyLinks();
