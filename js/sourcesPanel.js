// The name card's sources panel: where each part of the name comes from, with its books.
import {
    capitalize,
    formatPartLabel,
    hasKnownMeaning,
    isSlotComponent,
    KIND,
    METHOD,
    SECTION
} from "./core/nameStructure.js?v=4.3.0";
import { getLineage } from "./core/species.js?v=4.3.0";
import { CITED_NAMES } from "./core/splitComponents.js?v=4.3.0";
import { $, button, element } from "./dom.js?v=4.3.0";

/** A book's title as credited: Ed Greenwood's own sources say so. */
export const formatSourceTitle = ({ title, authority }) =>
    authority === "creator" && !title.includes("Ed Greenwood") ? `${title} (Ed Greenwood's own)` : title;

const plural = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

export function renderSources(result) {
    // a species whose published names carry no meanings says so, so an empty meaning is not taken for a fault
    const { meaningsNote } = getLineage(result.subrace)?.species ?? {};
    const note = meaningsNote && !result.parts.some(hasKnownMeaning) ? [element("p", "panel-note", meaningsNote)] : [];
    $("nameSources").replaceChildren(...note, ...formatSourceRows(result).map(renderRow));
}

function renderRow(row) {
    const node = element("div", "name-sources-row");
    const value = element("div", "name-sources-value");
    const text = element("p", "name-sources-text", row.text);
    if (row.names) renderCutFrom(text, row);
    if (row.asIn) text.append(" as in ", ...renderList(row.asIn, (name) => name, NAME_LIST));
    if (row.note) text.append(`. ${row.note}`);
    value.append(text);
    if (row.sources?.length) value.append(renderSourceLine(row.sources, row.meaningFrom, row.sample));
    if (row.from) value.append(element("p", "name-sources-from", row.from));
    if (row.ruleFrom) {
        const line = element("p", "name-sources-from", "rule from ");
        line.append(element("cite", null, row.ruleFrom));
        value.append(line);
    }
    node.append(element("span", "name-sources-label", row.label), value);
    return node;
}

function renderCutFrom(text, { names, sample }) {
    if (!sample) return text.append(" cut from ", ...renderList(names, (name) => name, NAME_LIST));
    const totals =
        sample.names === undefined ? "names" : `${plural(sample.names, "name")} in ${plural(sample.books, "book")}`;
    text.append(` cut from ${totals}; examples: `, ...renderList(names, (name) => name, EXAMPLE_LIST));
}

function renderSourceLine(sources, meaningFrom, sample) {
    const line = element("p", "name-sources-from");
    const books = element("span", "name-sources-books");
    if (sample) books.append("in the examples: ");
    books.append(...renderList(sources, (source) => element("cite", null, formatSourceTitle(source)), SOURCE_LIST));
    line.append(books);
    if (meaningFrom) line.append(" · meaning from ", element("cite", null, meaningFrom));
    return line;
}

const NAME_LIST = { shown: 2, separator: ", ", last: " and ", noun: " names" };
const EXAMPLE_LIST = { ...NAME_LIST, noun: " examples" };
const SOURCE_LIST = { shown: 1, separator: "; ", last: "; ", noun: "" };

// everything shows when only one more would be hidden, so there is never an "and 1 more"
function renderList(items, show, { shown: limit, separator, last, noun }) {
    const shown = items.length <= limit + 1 ? items.length : limit;
    const rest = items.slice(shown);
    const first = items.slice(0, shown).flatMap((item, n) => {
        if (!n) return [show(item)];
        return [!rest.length && n === shown - 1 ? last : separator, show(item)];
    });
    if (!rest.length) return first;
    const more = element("span", "name-sources-rest");
    more.hidden = true;
    more.append(...rest.flatMap((item) => [separator, show(item)]));
    const count = `and ${rest.length} more${noun}`;
    const toggle = button("name-sources-more", count, null, () => {
        const isOpen = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.textContent = isOpen ? "show fewer" : count;
        more.hidden = !isOpen;
    });
    toggle.setAttribute("aria-expanded", "false");
    toggle.title = more.textContent.slice(separator.length);
    return [...first, more, toggle];
}

function formatSourceRows(result) {
    const rows = result.parts.flatMap(formatPartRows);
    if (result.published) {
        // the first name's parts give its length at the start of the name (an elf compound name is two words)
        const firstName = result.parts.filter((p) => p.section === SECTION.GIVEN).map((p) => p.text);
        const personal = result.name.slice(0, firstName.join("").length);
        rows.unshift({ label: "Published name", text: personal, sources: result.published.sources });
    }
    return rows.filter(Boolean);
}

const keepTogether = (text) => text.replaceAll(" ", " ");

// a split component cites only some of its names; records saved before `fromTotal` say so by citing the most
function formatSample({ from, fromTotal, sourcesTotal }) {
    const isSample = fromTotal === undefined ? from?.length >= CITED_NAMES : fromTotal > from.length;
    return isSample ? { names: fromTotal, books: sourcesTotal } : undefined;
}

const AFFIXED = { [KIND.PREFIX]: (text) => `${text}-`, [KIND.SUFFIX]: (text) => `-${text}` };

const ROWS_BY_METHOD = {
    [METHOD.SPLIT]: (part, label, shown) => ({
        label,
        text: shown,
        names: part.from,
        sources: part.sources,
        sample: formatSample(part)
    }),
    [METHOD.PUBLISHED]: (part, label) => {
        const text = part.meaningSource ? `${part.text} means "${part.meaning}"` : part.text;
        const meaningFrom = part.meaningSource !== part.sources[0]?.title ? part.meaningSource : undefined;
        return { label, text, note: part.note, sources: part.sources, meaningFrom };
    },
    [METHOD.COMPOSED]: formatComposedRows
};

/** A part's row (one per word for a composed family name), or null for an apostrophe or a space. */
function formatPartRows(part) {
    const label = capitalize(formatPartLabel(part));
    const shown = AFFIXED[part.kind]?.(part.text) ?? part.text;
    const byMethod = ROWS_BY_METHOD[part.method];
    if (byMethod) return byMethod(part, label, shown);
    if (part.role === "joining letter") {
        const text = `-${part.text}- added so the components join smoothly`;
        return { label: "Joining letter", text, ruleFrom: part.basis };
    }
    return isSlotComponent(part) ? { label, text: `${shown} means "${part.meaning}"`, sources: part.sources } : null;
}

function formatComposedRows(part, label) {
    const [first, second] = part.words.map((word) => word.text.toLowerCase());
    if (part.words[0].names) {
        return part.words.map((word, n) => ({
            label: `${keepTogether(label)}, ${keepTogether(`${n ? "second" : "first"} word`)}`,
            text: `"${n ? second : first}"`,
            asIn: word.names,
            sources: word.sources
        }));
    }
    // names saved by earlier versions say only where the words come from, or nothing
    const from = part.wordsFrom && `words from ${part.wordsFrom}`;
    return { label, text: `${part.text}: "${first}" and "${second}"`, from };
}
