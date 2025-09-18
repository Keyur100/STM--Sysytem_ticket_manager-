


import fs from "fs";
import path from "path";

function listFiles(dir, prefix = "") {
  const files = fs.readdirSync(dir);
  let result = "";
  for (const file of files) {
    if (["node_modules", ".git", "dist", "build"].includes(file)) continue;

    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);

    result += prefix + "├── " + file + "\n";
    if (stats.isDirectory()) {
      result += listFiles(fullPath, prefix + "│   ");
    }
  }
  return result;
}

const frontend = "./support-frontend";
const backend = "./support-backend";

let output = "## Project Structure\n\n";
output += "### Frontend\n```\nfrontend\n" + listFiles(frontend) + "```\n\n";
output += "### Backend\n```\nbackend\n" + listFiles(backend) + "```\n";

fs.writeFileSync("FOLDER_STRUCTURE.md", output);
console.log("✅ FOLDER_STRUCTURE.md generated!");
