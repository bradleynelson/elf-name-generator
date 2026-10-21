// Random selection shared by the generators. `random` returns a number in [0, 1) like Math.random; tests pass a
// seeded function for repeatable results.

export function selectRandom(items, random = Math.random) {
    return items.length ? items[Math.floor(random() * items.length)] : null;
}

export function selectWeighted(items, weightOf, random = Math.random) {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    let roll = random() * total;
    for (const item of items) {
        roll -= weightOf(item);
        if (roll < 0) return item;
    }
    return items.length ? items[items.length - 1] : null;
}

/** Remembers the last few names so they are not repeated; a repeat is allowed when nothing else is possible. */
export class RecentNames {
    constructor(size = 5) {
        this.size = size;
        this.names = [];
    }

    has(name) {
        return this.names.includes(name);
    }

    add(name) {
        this.names.push(name);
        if (this.names.length > this.size) this.names.shift();
    }
}
