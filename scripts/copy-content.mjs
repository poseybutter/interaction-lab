import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "content");
const DEST = path.join(ROOT, "dist", "content");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (ent) => {
      const from = path.join(srcDir, ent.name);
      const to = path.join(destDir, ent.name);
      if (ent.isDirectory()) return copyDir(from, to);
      if (ent.isFile()) return fs.copyFile(from, to);
    })
  );
}

async function main() {
  if (!(await exists(SRC))) {
    console.log("[copy-content] content 폴더가 없어 스킵합니다.");
    return;
  }

  await fs.rm(DEST, { recursive: true, force: true });
  await copyDir(SRC, DEST);
  console.log("[copy-content] dist/content 복사 완료");
}

main().catch((err) => {
  console.error("[copy-content] 실패:", err);
  process.exit(1);
});

