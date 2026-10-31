// Reads the page and the data files from the project folder, as the browser would fetch them.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readProjectFile = (path) => readFileSync(join(process.cwd(), path), "utf-8");

export const readPage = () => readProjectFile("index.html");
export const readJson = (path) => JSON.parse(readProjectFile(path));
