/**
 * Compares per-file counts with a ceiling (both `{ file: count }`) that only moves down: a file above its ceiling
 * fails, and so does one below it, so the ceiling is lowered in the commit that makes it possible.
 * @param {{ noun: string, ceilingFile: string, overAdvice: string }} wording
 * @returns {string[]} one problem per file that does not match; empty when all match
 */
export function ceilingProblems(counts, ceiling, { noun, ceilingFile, overAdvice }) {
    const problems = [];
    for (const file of [...new Set([...Object.keys(counts), ...Object.keys(ceiling)])].sort()) {
        const found = counts[file] ?? 0;
        const allowed = ceiling[file] ?? 0;
        if (found > allowed) {
            problems.push(`${file}: ${found} ${noun}, ceiling ${allowed}. ${overAdvice}`);
        } else if (found < allowed) {
            problems.push(
                `${file}: ${found} ${noun}, ceiling ${allowed}. Lower the ceiling to ${found} in ${ceilingFile} (it only moves down).`
            );
        }
    }
    return problems;
}
