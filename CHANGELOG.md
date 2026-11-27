# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.2] - 2026-11-26

### Changed

- A saved name from an outdated generator (saved as text only by an older version of the site) is now greyed out and says "Not compatible: saved from an outdated generator. Copy and remove still work." Clicking it says "Name not compatible. This name was built with an older version of the generator and cannot be loaded into the current one. You can still copy and remove it."

- The Roll Name button has its 3D lighting back: the top bevel is lighter and fades darker toward the right, the bottom bevel is dark, and the corners step between them, so the ruby is no longer washed out.

- The browser tab icon and the home-screen icon have some depth: the top two faces of the die are a little lighter and the bottom faces a little darker, so the die no longer looks flat.

## [4.3.1] - 2026-11-26

### Changed

- The browser tab icon and the home-screen icon are now the same deep ruby red as the site and the Roll Name button; they were still the old brick red and crimson.

- Shield dwarves and gold dwarves each have their own section on the Etymology & Realmslore page, saying how their names differ instead of describing them together: Dwarves Deep prints a northern list of names and clans for shield dwarves and a southern list for gold dwarves with no name in both, shield dwarves get one phrase, and gold dwarves up to two. Generated names are unchanged.

- The Surface Elves section on the Etymology & Realmslore page now names the books checked for wood, sun and moon elf naming (Elves of Evermeet, The Complete Book of Elves, Races of Faerûn), says none sets these lineages apart (The Complete Book of Elves describes one fashion for all elves), says the generator therefore uses one shared pool with a slight weight toward the published names of the chosen lineage, and says wood elves have fewer published names than sun or moon elves. Generated names are unchanged.

### Fixed

- A name saved by an older version of the site, as text only, is no longer marked "Damaged". Its row says "Saved on the old site: Cannot be rebuilt here. Copy and remove still work.", and clicking it says the same. "Damaged" now means only a name this site saved that has since become unreadable.

## [4.3.0] - 2026-11-26

### Added

- When Copy or Save says its word, the name it was about flashes gold for a moment (about half a second): the name on the card, or the name in the History, Roll 10 More or Saved names row whose button was pressed. Pressing again flashes it again. With reduced motion on the name turns gold briefly without fading.
- A countdown line on the buttons that briefly turn into a word ("Copied", "Saved", "Unsaved", "Copied all"): a stretch of the button's border lights up in the "Saved" amber and runs once round it, taking exactly as long as the word stays. With reduced motion on there is no line; the word stays as before. Icon buttons now brighten their border and icon on hover instead of filling, so the line stays readable.
- A note above Expanded Variety says why names repeat when the chosen lineage has few published names: "Wild dwarves have a small set of published names, so repeats are normal. Turn on Expanded Variety for more variety." It shows only when the published names of the chosen gender number fewer than 100, so today only for wild dwarves, and it hides once Expanded Variety is on.
- Dwarf names. Pick "dwarf" in the species picker, then a lineage: shield, gold, wild or duergar. A dwarf name is a published first name (dwarves reuse names) and its clan, with the book it comes from; Expanded Variety also builds new first names from the dwarven name tables in Races of Stone (Dragon #281's for duergar), each part with its meaning. No book gives a meaning for a dwarf's published first name, clan, or a component cut from one, so those show no caption rather than "Meaning unknown". About one name in ten carries a name phrase ("the Younger", "son of" or "daul of", "blood of", or "of" a dwarf hold or realm such as "of Gauntlgrym" or "of the Deep Realm"; duergar "Than"), and the + button adds or removes one; gold dwarf names may carry two. Wild dwarves have no clan, and the page says why. Dwarf names are female or male, and are written underneath in Dethek runes (a Pixel Sagas font by Neale Davidson). Etymology & Realmslore has a new Dwarves section.
- Every name in Roll 10 More and History now has its own copy button, like a saved name's: it copies the name with what it is ("Aelar (male elf · moon elf)") and says "Copied". The buttons are in the name card's order: bookmark, copy, then the bin. The small "published" and "Ed Greenwood" labels beside names in these lists are gone; the name card still shows them.
- Every name in Roll 10 More and History now has its own bookmark: press it to save that name, press it again to unsave it, and it says "Saved" or "Unsaved" for two seconds, as the name card's bookmark does. While Saved names is full the bookmarks are greyed and pressing one says why, in that list.
- Each name in Roll 10 More can be removed with its bin icon. It stays in its row, faded and struck through, with "Removed · Undo". Removing never unsaves: a saved name removed from the list says "Still in Saved names." Copy all leaves removed names out, and hides once every name is removed. A line under the heading says the list is cleared when you leave the page or change a setting.
- A "Copy all" button in Saved names and another beside Roll 10 More copy every name in the list at once, one per line, and say "Copied all". If the browser refuses, the lines are shown in a box that scrolls, selected and ready for Ctrl+C.
- Every copy button now copies a name with what it is in parentheses ("Aelar (male elf · moon elf)"): the name card's Copy, a saved name's copy icon, and both Copy all buttons. More names and History show that line under each name too, as Saved names does. A saved name from an older version of the site, with nothing known about it, copies as the bare name.
- Each saved name now has a smaller line under it saying what it is, in the picker's words and order: "female elf · sun elf", "male elf · drow", "unisex elf · any lineage". A name removed with its bin icon shows "Cleared when you leave or refresh this page." there instead. A saved name from the previous site or an older version shows only the parts that are known, or no line at all.

### Changed

- Behind the scenes, mutation testing now reruns every test that timed out or crashed with a much longer limit before it reports, so a slow test no longer counts as a caught change. The monthly run fails when any file gains a change no test noticed, and lists every such change.
- Behind the scenes, removed the last mutation-testing exemption comment, which excused no change.
- Behind the scenes, the dwarf lineages no longer carry a description line nothing read, and a test now checks which lineage each lineage word the sources print (mountain, hill, gray, albino and the rest) stands for.
- Behind the scenes, new tests check 27 naming rules that no test noticed breaking: among them a locked dwarf name part keeping the built name, split parts only with Expanded Variety, no triple letters, one name phrase in ten, elf joins that would pile up four vowels or make "yy", drow judging the second long word, and each species' and lineage's stored and reported values. Names are made exactly as before.
- Behind the scenes, the stylesheet is organised in cascade layers (theme, page basics, components, utilities), so a rule no longer depends on where it sits in the file, and each screen-size rule now sits with its component. Spacing, borders and positions follow the reading direction (start and end rather than left and right). The page looks exactly as before.
- Behind the scenes, the page's drawing code is split by job: the sources panel, the lists of names (More names, History, Saved names) and the page's messages each have their own file, a list's buttons share one click listener instead of one each, and passing states (a confirming button, a glinting name, the Roll Name button's flash) are marked with attributes rather than classes. The app's code is split the same way: saved names, More names and History have their own file, the app no longer touches the page directly (a lint rule now keeps it so), and each + / - button's analytics value and screen-reader words are written once. The page looks and works exactly as before.
- Behind the scenes, each elf lineage (sun, moon, wood, drow, and the retired "any") is now described in one place, and every elf lineage, drow included, has its own copy of the one elf generator built from its description, as dwarves do. Names are made exactly as before: the same choices give the same names, picker lists and changes, and names saved by 4.1.5 and 4.2.0 behave as they did (apart from the fix below).
- The monthly mutation testing job may now run for up to 6 hours instead of 90 minutes: with dwarves the run takes about four times as long.
- Behind the scenes, the elf, drow and dwarf generators now share one copy of each naming check: the spelling limits, how the name tables are read and which entries each gender may use, how parts are recorded, and the shares of a roll. Names are made exactly as before: the same choices give the same names, picker lists and changes.
- The page title, search description and link previews now say the site makes elf and dwarf names (they said elf and drow), and the README describes how dwarf names are built. The dwarf name list now starts downloading as soon as the page opens, alongside the elf list, instead of after the page's scripts have run, so the first name is ready sooner on slow connections.
- The picture shown when the site is shared (link previews on social sites and chats) is now a capture of the current page, with the lineage picker, a name with its part meanings, lock and + controls, the Espruar line and the Roll Name button. It had been a drawing of the first version of the page.
- Acquisitions Incorporated (5e) is no longer a source: it is a comedy book outside the Realms' own naming, so its names (16 elf and drow names such as Rothburntonberryville, and 27 dwarf names) are gone, and no word is cut from them. Six drow names that appeared twice, once with and once without an apostrophe (Druu'giir, Hun'ett, Prid'eesoth, Shi'nayne, Teh'Kinrellz, T'sarran), now appear once, in the apostrophe spelling, credited to every book that prints either form.
- Pressing Roll, Save, Copy or Roll 10 More while the name lists are still loading now says "Cannot complete that action. Please wait until the name lists load to roll, save, or copy a name." (it said "Not yet."). Once the name card has given up, it says "Cannot complete that action. Lists failed to load; please refresh to try again." instead, since waiting no longer helps.
- The Roll Name gem is a deep, true ruby red, dark at its heart and saturated at its edges, with softly shaded facets and faint light along the edges of its top; the four little studs on its bronze setting are gone. It stands slightly raised in its setting. On hover its glow spreads out from the middle until the whole stone glows, and fades away evenly when the pointer leaves. Pressing it flashes, the glow spills out round the setting, and the stone sinks into its setting, losing the shadow under it. Held down, it stays dark and pressed in; let go, even with the pointer dragged off, and it springs back up with its light back at once. A broad, soft shimmer passes over it every 4 seconds, waiting 4 seconds after a roll so it does not look like part of the press. The spacebar and the keyboard play the flash and the glow. Tapping on a phone no longer shows a grey flash, and double-clicking or long-pressing no longer selects "Roll Name". With reduced motion on there is only a softer flash.
- Delete buttons, error messages, a damaged saved name, the Beta badge and the keyboard focus ring use a deep red from the same family as the gem, in both the dark and light themes.
- Roll 10 More and the cookie buttons brighten their border and text when you point at them, like the icon buttons; they no longer fill with bronze.
- The cookie banner is shorter and plainer: "With your OK, cookies help us track usage and catch errors. Learn more", with No on the left and OK on the right (Tab reaches them in that order). On phones it no longer covers the footer's links: it stays at the bottom of the screen while you scroll but sits below the footer at the end of the page. The privacy notice says it doesn't collect anything that identifies you, instead of "personal information", since it records general location. The privacy notice also says that accepting helps ensure everything is working as intended. It now has the same No and OK buttons beside Close, and they stay: the one you chose fills, and the dialog closes a moment later. Opening Privacy from the footer shows your choice and lets you change it (choosing No stops sending at once). Behind the privacy notice and the name picker the page is now darker and slightly blurred, and a click outside either one closes it.
- Lineages are named without the species, followed by the word "lineage": "I want to make a female elf of sun lineage." Saved and copied names say the same: "Aelar (male elf · moon lineage)". The elf "any lineage" choice is gone, so every name has a lineage; sun, moon and wood still draw on every surface elf name, leaning to their own. Names saved with "any lineage" still show, with "any" in the picker until another lineage is chosen. The species picker no longer shows "more coming soon", and the pickers' arrows sit closer to their words.
- The "neutral" gender is now called "unisex" wherever it is shown: the picker ("I want to make a unisex elf name"), a saved name's line ("unisex elf · any lineage") and the README. It still means what it did: the name is built only from parts that both female and male names use. Generated names, older saved names and the analytics value are unchanged.
- Messages no longer appear in a notice at the bottom of the screen that hid after a few seconds (and sat under the cookie banner on phones). Each message now shows where it belongs, in an amber box (a heads-up) or a red one (something went wrong), and stays until the next action there: under the name card's buttons for the name card (a roll that no name fits, now with the locks nudged; a choice that isn't available; a name the browser wouldn't save or copy), under Roll 10 More for its list, and inside a saved name's own row for that name (damaged, or a removal, Undo or copy the browser refused). A refused copy shows the name selected, ready for Ctrl+C. Blocked site storage is explained inside Saved names and History. Screen readers hear every message through one live region.
- Removing a saved name, with its bin icon or by unsaving it with the bookmark, leaves the name in its row, faded and struck through, with "Unsaved · Undo" that has no timer and is not lost when another message appears; Undo puts it back in its place. Saved names now uses wider columns (two on a desktop, one on a phone) so a long name never wraps beside its buttons.
- When the name lists don't load, the name card no longer goes blank with a notice that disappears. It shows a loader (ruby drops orbiting a core) and "Loading the name lists…", then once "The name lists didn't load. Retrying…", and tries again by itself after 2, 5, 10 and 30 seconds, or as soon as the connection comes back. After the last try it explains the fix (Ctrl+F5) with a Reload link. Meanwhile Roll Name, Save, Copy and Roll 10 More are greyed and dashed and say "Not yet" when pressed; saved names and history stay listed and can be copied. A quick load shows no loader at all.
- Copy and Save now say what they did on the button itself: Copy turns into a check and "Copied", and the bookmark says "Saved" or "Unsaved" at every press, then each goes back after two seconds. A saved name's copy button does the same. On a narrow screen the word appears just under its button instead.
- Saved names now warns before it fills: from 90 the count turns amber and saving says how many spaces are left ("Saved · 3 left"); at 100 the count reads "100 of 100 · full" in red, and the bookmark of an unsaved name is greyed, dashed and says "Full". Pressing it explains that the list is full (unsave a name to make room), with a link to Saved names, instead of failing; the bookmark comes back as soon as a name is removed. Undoing a removal can no longer take the list past 100: the Undo stays and says the list is full.
- With every part of a name locked, Roll Name (or the spacebar) no longer silently shows the same name or adds a new part: it keeps the name and says "Every part is locked. Unlock a part to roll a new name." in the amber box, with the locks nudged. Roll 10 More says the same under its button.
- A roll that fails with nothing locked now says "Couldn't make a name. Try rolling again." instead of blaming locks that aren't there. If the name lists load but the first roll fails, Copy and Save say "No name yet. Press Roll Name to make one." rather than asking you to wait for the lists. A copy that the browser answers only after you have rolled again no longer reports on the new name, and a refused copy for a saved name that another tab has just unsaved no longer stops with an error.
- The new motion (the loader, the erased row, the restore glow, the lock nudge, the confirmations) switches off for people who ask their system for less motion.
- Clearing History now asks first (Clear becomes Cancel and Delete), and afterwards "History cleared · Undo" stays under the list until you leave the page; Undo puts the cleared names back after any viewed since.
- The comment check (`npm run check:comments`) no longer compares each file's comment lines with a recorded count (`comment-ceiling.json` is gone), so adding or deleting a comment no longer needs an unrelated edit. It still fails on a comment over two lines or one naming a ticket, the maintainer or a private file. It now treats "owner" as a reference to the maintainer only in "project owner" or "repository maintainer", not in ordinary technical wording. Tooling only; the page is unchanged.
- The comment check now also fails on a private rule or decision ID (such as "D14" or "Q7") in a comment, and `check:comments` reads the strings and test titles in `js/` and `tests/` for tickets and private IDs. The dwarf comments and test titles that cited them now cite the book and page only.
- The "new species" test is renamed to what it proves: adding a lineage through the registry and display path. A note in the test lists what a real second species still needs (its data file passing `check:data`, the species selector asserted, a backward-compatible meaning for the saved record's `generatorType`). Tests only; no visible change.
- The version stamper and the release check now share one definition of a local script import, so an unstamped side-effect `import "./x.js"` or literal `import("./x.js")` can no longer ship without its `?v=` stamp (the stamper added stamps only to `from` imports, and the check re-ran the stamper, so it could not notice). Release tooling only; no visible change.
- The generator tests no longer use a helper that accepted 150 or 600 attempts as "300". Each asserts only the specified failure (an error, or null) for an impossible choice; the exact limit of 300 stays guarded by the shared retry test. Tests only; no visible change.
- The data check (`npm run check:data`) now confirms that each generator finds every name table it needs exactly once in its share of the data, and names a missing or duplicate table (for example a file with no drow house table passed before and then failed to start). No visible change.
- A part's kind, not the wording of its label, now decides whether a locked part fits a prefix or suffix slot, and which drow table a picker slot lists. No visible change; saved names are unchanged.
- Behind the scenes, the drow generator no longer holds a path that draws a sex when a name is asked for in no style the page offers (the page always names one), and the two copies of the helper that guards a click handler are one. Names are made exactly as before. A new test reads 80 names rolled by the released 4.1.5 and 4.2.0 code (28 drow each) and checks that each still loads in History and Saved names, draws as it was saved, and has working pickers.

### Fixed

- "BETA" in its badge is centred top to bottom; it sat a little low.
- The keyboard focus ring round Roll Name now sits just outside its bronze setting, where it shows clearly; it was drawn on the bronze and hard to see.
- A name-shape change (the + and - buttons) that fails now says "That change isn't available for this name." and keeps the name, as the picker choices do, instead of "That didn't work, so we kept your last name."
- With the site open in two tabs, saving or unsaving a name in one tab no longer drops keyboard focus in the other. A focused button in Saved names, Roll 10 More or History stays focused when the lists redraw. If its row has gone (the other tab unsaved that name), focus moves to the Saved names heading, so Tab does not start again from the top of the page.
- Pressing the spacebar while the name picker or the privacy notice is open no longer rolls a new name behind it. Before, the name under the picker changed and was added to History, and picking a choice then edited the old name and replaced the new roll. The spacebar now does what it does in the dialog (scrolls the list, or presses the focused button).
- On an elf name saved by version 4.1.5 or earlier, the picker on a first-name part now lists the choices a roll could use (1,175 for the prefix and 168 for the suffix of one such name) and changes the name as asked. Before, it opened with no choices, so the click did nothing. The name loads and is drawn as before.
- On a drow name saved by version 4.1.5 or earlier, the picker on a first-name part now lists the choices a roll could use and changes the name as asked. Before, it opened with no choices and sent an error report (with consent).
- Screen readers now hear "a published name" (or "a name used by Ed Greenwood") after a dwarf name whose first name is a published one, which is every dwarf name unless Expanded Variety builds a new first name. Before, only an elf name built to match a published one said so.
- Choosing a dwarf prefix or suffix in the picker now follows the same joining rule as a roll: the picker lists only choices that can join with a letter Races of Stone allows and that sounds right next to its neighbours, and the joining letter already in the name stays while it still fits (before, about one shield dwarf edit in six made a join a roll would never make, such as Proxaz becoming Proxaff). Elf names are unchanged.
- In a duergar name, the parent after "Than" is a father, so it is never a name recorded as female; the picker lists only male names, unisex names and names with no recorded sex.
- A dwarf's parent may now share the dwarf's own first name (dwarves reuse names), whether rolled, locked or chosen in the picker. Before, a rolled phrase left the bearer's name out but the picker offered it.
- In Name Meanings and Sources, the "Published name" line of a built dwarf first name that is also published now shows the first name only ("Ulifarn"), not the words after it ("Ulifarn Than Droon", "Obrak Joterhun, son of Throdin,").
- A saved name whose cut-up word kept a count of the names it was cut from but lost the names themselves (only possible if the browser's stored data was edited or damaged) is now listed in red as damaged, like any other name that cannot be shown, instead of looking loadable and failing on every click.
- The "repeats are normal" note no longer has a live region of its own, so a screen reader no longer reads it over the new name. It is now said once, through the page's one announcer, when a lineage or gender choice brings it up.

- If the page's own script can't load or start (a stale cached copy, a blocked request, a network error part-way through), the name card no longer says "Loading the name lists" forever. After 10 seconds it says "The page didn't load.", explains the fix (Ctrl+F5) and offers Reload. When the script does start, even slowly, this never appears.
- An unexpected error while using the name card no longer leaves it half-updated. If drawing the card, building its + and - buttons, changing the name's shape or offering the other kind of surname fails, the card keeps your last name and its locks and says so under the buttons ("That didn't work, so we kept your last name."). If that name can't be drawn again either, it rolls a new one and says so; if nothing can be drawn, the card says it stopped working and offers Reload. The page now switches to a new name only once it has been drawn.
- The same protection now covers the buttons in Roll 10 More, History and Saved names: a name row's bookmark, copy, remove and Undo, and History's Clear, Cancel, Delete and Undo. An unexpected error there keeps your last name and says so under the name card's buttons, instead of leaving the page unchecked.
- A name file that downloads but is in an older version (a stale cached copy) is now retried once, bypassing the cache, like a failed download. Before, it went straight to the "refresh with Ctrl+F5" notice with no name shown. If the retried copy is also wrong, the notice appears as before. The release's live-site check now also compares the served name data with the release file, so a current page over old data no longer passes.
- A component cut from more than five published names no longer shows its five names and their books as if they were all of them. The breakdown now says, for example, "cut from 18 names in 24 books; examples: ...", lists the books of the examples as "in the examples", and words the button to open the rest as examples. Names saved by earlier versions show the examples label without totals.
- The drow house list, under Published, now shows the book each house comes from (it showed nothing). A source that is Ed Greenwood's own book, such as The Border Kingdoms, now says "Ed Greenwood's own".
- With the site open in two tabs or windows, saving, removing or undoing a name in one no longer erases names saved in the other, or brings back a name removed there. Each tab's saved list also updates when the other changes it.
- Removing a saved name no longer says "Removed" with an Undo when the browser refused the change (storage full or turned off). The name stays in the list, the count stays, the error message stays, and focus stays on the Remove button so you can try again.

- Choosing a name from the Roll 10 More list now sets the lineage and gender controls to match that name and clears the locks of the name it replaces, as History and Saved names already did. Before, the next roll and the structure buttons used the settings of the name loaded earlier.

- A damaged saved or history record no longer stops the page from starting or a name from loading. Each record is checked on its own: a damaged history entry is skipped and the rest load; a damaged saved name stays in the list in red, and clicking it says it is damaged and can still be copied or removed.

- A name saved by 4.1.5 with a space just before the family name (every two-word elf name it saved) no longer fails to draw when shown from Saved names or History: the page threw an error and left the previous name's words on screen. A stored name that would still draw an empty word, such as one ending in a space, is now treated as damaged like any other (listed in red, not loaded).

- Sources for English family names now credit only the published names that really have that word. For example, the "oak" in Shadowoak no longer credits Cloak & Dagger and Undermountain: Halaster's Lost Apprentice, whose Greencloak and Turncloak end in "cloak", not "oak". The same fix stops those names, and Elvish names such as Starym, from steering which words each lineage favours.
- A drow name published with an apostrophe and also without one is now credited to the book that prints the spelling shown. Shi'nayne credits Lair Assault: Spiderkiller (4e) and Shinayne credits The Drow of the Underdark (2e); the same holds for L'rac / Lrac and Prid'eesoth / Prideesoth.
- Drow names built from the tables no longer include a common drow word that was written with an apostrophe in the glossary. The check now ignores apostrophes on both sides, so "Quellar" is refused like "Qu'ellar" (nine glossary words were never matched). The README now says the rule about house names beginning with L covers houses the generator builds; the published houses keep their printed spellings.
- The component picker now lists every component that fits the slot with the rest of the name kept, including the one shown. Before, it could leave out a choice that needed a different joining letter (for Leeskawinda, "ah", which gives Ahskawinda) and, on a feminine drow name, the masculine form a roll may use (the "nar" of Greynitra Nullnar). A feminine drow slot now lists both forms of each table entry.
- Choosing a component in the picker now changes only that component, using the same joining letter the list was checked with; it no longer re-rolls the name behind the scenes. Choosing the one already shown does nothing.
- When two table entries share a spelling (the elf suffix "ro", Summer, and "ro", Walker), the picker marks only the one in the name as current, and choosing the other shows its own meaning.

## [4.2.0] - 2026-11-22

### Fixed

- Names that came only from fan products or community-written content (Dungeon Masters Guild titles, Convention-Created Content) are no longer offered as published names (111 names). Wizards' own Adventurers League adventures and the RPGA's Living campaigns still count.
- Ed Greenwood's own book The Border Kingdoms is now a source, credited to him as the Realms' creator, like his forum answers.
- Every book is now credited by its published name and edition only, such as "Sea of Fallen Stars (2e)" or "Dungeon #157". The name data no longer carries file names, scan or copy labels, or version tags, and copies of the same book are credited as one.
- Elvish family names that happen to contain an English word, such as Starym, Mistrivvin and Merlistar, are no longer treated as English names: they show "Meaning unknown", no longer count towards the share of English family names (16 names), and are no longer given as examples of an English word ("star" as in Starym). A name now counts as English only when the whole name is made of English words. The same rule lets Expanded Variety cut about 25 more Elvish first names into components, such as Chandra and Elistar, and treats a few English names it missed, such as Snowmane, as English. The misprinted family name Nightwhispher is now shown as Nightwhisper.
- Names from the scan that binds Forgotten Realms accessories FR1 to FR16 are now credited to the book each page comes from, such as Hall of Heroes (1e) or Old Empires (2e), instead of "Forgotten Realms FR1-FR16" (20 names).

### Changed

- The intro now says names are built from official and licensed Forgotten Realms material; authors' answers and general D&D books are credited in the lore section. Search and link previews mention Realmslore and general D&D books.
- The intro line sits evenly between the title and the name card.
- The name breakdown now credits every book each part comes from, on a smaller line under that part: up to two books in full, otherwise the first and "and N more", which opens the rest. Books are listed by a fixed rule: official books before Ed Greenwood's own forum answers and books, then the source that gives the most names.
- A component cut from published names now says so ("cut from Aeril, Aquaril and 3 more names"), and the separate "Tables" row is gone: each table component credits its own books, also on names saved by earlier versions. The elf tables are credited to Races of the Wild (3.5e) and Dragon #251, and the drow tables to Dragon #267; magazines are named by issue.
- Each table meaning now sits over its own component, and a family name made of two English words shows them over the name, such as _evening-bow_.
- A family name made of two English words now gets a row per word in the breakdown, naming the published family names that word appears in and their books ("bow" as in Crystalbow, Slenderbow and Strongbow).
- Drow house components are labelled "House name prefix" and "House name suffix", like the elf family name rows.
- A joining letter's row credits its rule on the source line ("rule from Dragon #251"), like the other rows.
- Ed Greenwood's forum answers are credited as "Forum answer by Ed Greenwood (Realms creator)", also on names saved by earlier versions.
- A component cut from a published name, on a neutral name, now cites the first five names it comes from in alphabetical order.
- Many more published elf and drow names, from a full read of the source books (the name lists are roughly three times larger), each checked against the book's setting rules. Names that were misread from scans have been corrected or removed; plurals, index entries and names from other worlds (Greyhawk, Dark Sun, Eberron) or from Shakespeare are out; half-elves and the 1991-93 TSR trading cards are left out for now.
- A name printed in several styles (capitals, curly or straight apostrophes, accents) is now shown once, in the form most books print. Where books print a name both with and without an apostrophe, such as Druu'giir and Druugiir, both are kept.
- The lore section is now "Etymology & Realmslore". A new first note, "Sources and Canon", explains how the Forgotten Realms Wiki ranks sources, where Ed Greenwood's own word stands, and why names from his forum answers and his own books are labelled. "Elves of the Realms" is now "Elves (Tel’Quessir)".

### Maintenance

- Code comments are cut to the short reasons and rules someone changing the code needs (about 1,000 lines down to about 730), and a new check fails the build if a comment runs over two lines (except documentation of a public interface), names a ticket or the maintainer, or a file's comment count grows. The page works exactly as before.
- The name data file is about half the download it was: the openings and endings Expanded Variety cuts from published names are now worked out by the page when it loads instead of being shipped in the file. Names are built exactly as before.
- The name data check now also fails if a data file mentions a folder on the computer that builds it.
- Every elf lineage, drow included, now comes from one name data file, with each book listed once and every book a name appears in kept. The lineage list, its labels and each lineage's script come from one description in the code, so the page itself has no drow-specific code. Names saved or in the history from earlier versions still load.
- The elf and drow name generators and the name display were tidied inside, with names built exactly as before: shared helpers replace copied code, and each part of the display is drawn by its own function.
- The tests now notice any change to which names each lineage builds from, how the books' lineage words map to the lineages, and the order sources are credited in.

## [4.1.5] - 2026-10-31

### Fixed

- With Expanded Variety on, a drow name ending in an accented vowel (such as -rené or -lué) is now counted with the right number of syllables, so long female names are no more common than the long-name rule intends.

### Changed

- The page now asks for all of its scripts up front, so it can finish loading sooner.
- The "Privacy" and "Learn more" links are now buttons (they open the privacy notice). They look the same, and assistive technology announces them as buttons.

### Maintenance

- The code checks now enforce which parts of the code may depend on which, and validate the name data files on every run.
- Elf and drow name generators are now chosen in one place, which keeps adding another species simpler.
- Fewer parts of the code are excluded from mutation testing, and a check stops new exclusions creeping in.
- The stylesheet, release tooling and tests were tidied: repeated rules shared, unused code removed, and tests no longer reach into private code.

## [4.1.4] - 2026-10-30

### Fixed

- With Expanded Variety on, an elf name made only of components from published names no longer credits the Races of the Wild name tables in its breakdown, since none of its parts or meanings came from them.

## [4.1.3] - 2026-10-27

### Added

- Every component picker now says that only components that follow the naming rules and work with your locked components are shown, so a short list no longer looks like missing data.

### Fixed

- Rolling with a locked part no longer makes long (four-syllable) names more common than a roll with nothing locked, for elves and drow.
- The surname picker's title now matches the list shown: "Choose the family name" (or "house") on the Published tab, and "Choose the family name prefix" (or "house prefix") on the Constructed tab, instead of staying on the prefix wording.
- The Lore Gem (Selu’kiira) note now cites the correct page of Cormanthyr: Empire of the Elves (p. 153; it said p. 152).

### Maintenance

- The weekly Lighthouse check of espruar.com now fails on any drop in the accessibility score, which is 100 today; it allowed a drop to 90 before.
- Added automated checks over many repeatable rolls that every elf and drow name matches its parts, that locks hold, and that a + / − button is shown exactly when it works.
- The live-site check after a deploy now retries while the previous deployment is still being served, and a re-run of the deploy no longer fails on a duplicate artifact name.

## [4.1.2] - 2026-10-23

### Maintenance

- The test pipeline now checks for unused code and dependencies with Knip, alongside the existing duplication check.
- Added regression coverage to keep older saved names intact when saving another name.
- CI now uses the same complete check command available locally, enforces coverage floors, lints release tooling, and
  cancels superseded test runs instead of letting them hang or consume runner time.
- Page-flow tests now use repeatable random input, so the same behavior is exercised on every run.
- Standardized the generator's internal method names and structure-control identifiers for a more consistent API.

## [4.1.1] - 2026-10-23

### Fixed

- A surname built with a joining letter (such as Kerelar) now shows as one word. It was drawn as two, with two + buttons.
- Showing a name again from the history or your saved names no longer carries over the locks from the name on screen.
- The Privacy link works even when your browser blocks site storage.
- Saved names and history from older versions, or damaged in storage, no longer break the lists; anything that cannot be shown again is still listed.
- Drow components taken from published names (Expanded Variety) now show the books those names come from, as elf ones do.
- The Published and Constructed switch in the surname picker is now a pair of toggle buttons, so screen readers announce which list is shown and the keyboard works as expected.

### Changed

- Error reports sent to Google Analytics (only with your consent) now say only where an error happened and its type, never its message.

### Maintenance

- Development tools updated (ESLint 10, Vitest 5, jsdom 30, Prettier 3.9) and unused ones removed (pa11y, markdownlint, husky, lint-staged); `npm audit` now reports no vulnerabilities. None of these ship to visitors.
- The test pipeline runs on Node 24, fails on high or critical dependency advisories instead of ignoring them, and pins each GitHub Action to an exact commit.
- Dependabot opens one grouped update a week for npm packages and one for GitHub Actions, skipping releases less than a week old.
- A weekly Lighthouse check of espruar.com fails if the accessibility score drops below 90.
- The version script also updates `package-lock.json` and turns the changelog's [Unreleased] entry into the release; one current release guide (`.github/RELEASING.md`) replaces three outdated setup guides.
- The site is published from the approved website files only, through GitHub Pages' own deployment, and each deploy checks that every other repository file (package.json, tests, scripts) returns 404 on espruar.com.

## [4.1.0] - 2026-10-22

### Added

- Change a name's structure without rolling, for elves and drow. A small **+** or **-** beside the first name adds or removes its last suffix, another beside the surname does the same for a surname built from the tables (elves), and a dashed **+** between the names adds a compound name (a second given name), with a **-** to remove it. A button shows only when the changed name can be built with every part you have kept, and a locked part is never moved or removed.
- Surnames (and drow houses) now open with **Published** and **Constructed** tabs. Choose a published family name or house by name, or build one from a prefix you choose, without rolling and hoping.
- Two usage events, `name_structure_changed` and `surname_kind_changed` (see ANALYTICS.md).

### Changed

- Rolling with a locked component can now change the shape of the name (for example from a two-part to a three-part given name) as long as the locked component still fits. Before, a lock kept the shape fixed.
- Choosing a component in the part picker no longer adds an entry to the history; only rolling does.
- On desktop the site title is larger and as wide as the card, with the Beta badge beside it in capitals, and the intro text is wider.

## [4.0.7] - 2026-10-22

### Fixed

- With Expanded Variety on, a name could use letters that a name table already has, but without that entry's meaning, and the part picker listed the same letters twice (for example "nis", once as "Dawn" and once with no meaning). Those entries are now left out of the published-name components, for elves and drow.
- The "Name meanings and sources" heading no longer flickers to a different wording while rolling; it always reads the same.

### Changed

- On desktop the page is wider, and the name shrinks to fit its card, so a long last name no longer wraps and shifts the page. On narrow screens, such as phones, the last name always goes on its own line.
- More space between Roll Name and the "Written in" line.
- The lore section is now "Etymology & Lore". Elves of the Realms holds the notes that apply to all elves, with Surface elves, Drow, Espruar and a new "The Lore Gem (Selu’kiira)" note nested under it.

## [4.0.6] - 2026-10-22

### Fixed

- Version stamps (`?v=4.0.6`) are now in the site's own files, so they reach visitors. In 4.0.5 they were added only to a build folder the site isn't served from, so cached old files could still be mixed with new ones. The release check now fails if any stamp is missing or doesn't match the package version, and the version script writes them on each bump.
- The version script no longer puts the new changelog entry above the changelog's intro text.

### Added

- A notice when the browser is blocking site storage, so people know saved names, history and settings won't be kept.

### Changed

- The analytics banner goes back to its plain, descriptive names (cookie-banner), per the project's naming conventions. Brave and Firefox may still hide it with their own content blocking; nothing on the site depends on it.

## [4.0.5] - 2026-10-22

### Changed

- The page starts downloading its scripts and name lists straight away, so it loads faster on a first visit.
- Release builds add a version to every script, stylesheet and data link, so a browser with an older cached copy no longer mixes old and new files.
- If the name lists fail to load, the page retries once without the browser cache, and the error message now says to press Ctrl+F5 and has a Reload button.
- The Lato font is now hosted with the site instead of loaded from Google Fonts, which removes a delay before the page draws (notably in Firefox) and a request to a third party.
- The analytics banner is renamed so Brave and Firefox content blocking no longer hides it.

## [4.0.4] - 2026-10-22

### Fixed

- Elf names no longer join components into a doubled "y" (as in "Ri'cyythess"), which no published elf name has.

## [4.0.3] - 2026-10-22

### Added

- A preview image and title for links shared on Reddit, Discord, Facebook and X.
- A home-screen icon for phones, and search-engine files (robots.txt and a sitemap).

### Changed

- A clearer search description of what the generator does.
- The Roll Name gem is now cut like a cushion stone: a flat face ringed by bevelled facets.

## [4.0.2] - 2026-10-22

### Changed

- Links are now antique bronze to match the rest of the page.
- The site title is larger on phones.

## [4.0.1] - 2026-10-21

### Changed

- Roll Name is now a selu'kiira, the elven lore gem: a sheen of light passes over it while idle, and on hover it glows
  with motes of light rising off the stone.
- Elvish family names and drow houses with no published meaning now say "Meaning unknown".
- The footer is set apart as its own band, and links are easier to read in both light and dark mode.

## [4.0.0] - 2026-10-21

A ground-up rebuild of the generator, focused on elves and drow and grounded in the naming systems published for them.

### Added

- Surface-elf names built from the elven name tables in _Races of the Wild_ (first published in _Dragon_ #251), with
  the meaning of every component shown above each word.
- Family names from published Forgotten Realms families, including the translations the _Player's Handbook_ gives,
  plus new family names built from the same tables.
- Drow names from the _Dragon_ #267 tables with their published meanings, published Forgotten Realms houses, and the
  drow naming taboos from _The Drow of the Underdark_.
- A neutral option alongside female and male.
- Choose any component of a name from every option that fits, or lock it while the rest changes.
- Expanded Variety: mix in components taken from published Forgotten Realms names.
- Name meanings and sources for every name, Roll 10 More, history kept in your browser, saved names with Undo, and
  each name shown in the Espruar alphabet.
- A new look: one charcoal and red theme with a parchment light mode, Pixel Sagas fonts and a d20 site icon.

### Changed

- Dwarves, gnomes, halflings and orcs are not available in this version. Each is being reviewed against published
  sources before it returns; not every one is guaranteed to come back.
- Analytics (only with consent) now records which features are used, never the names themselves.

### Removed

- Name complexity and syllable controls, and per-species themes.

## [3.3.0] - 2025-12-12

### Added

- **History Section**: Added a new "History (Last 10 Names)" accordion section that displays the last 10 generated names, allowing users to click on any name to restore it as the current generated name
- **Spacebar Keybind**: Added spacebar keyboard shortcut to generate a new name (works when not focused on form inputs)
- **Desktop Helper Text**: Added "Click or Press Spacebar" helper text under the Generate Name button on desktop (hidden on mobile)

### Changed

- **Gnome Name Randomization**: Enhanced anti-repeat logic for Gnomish name generation to prevent immediate repetition of personal names, clan names, and nicknames
- **Mobile Name Display**: Fixed name overflow on mobile devices - names now wrap properly instead of running off the screen
- **Mobile UI**: Hidden title sword icons on mobile devices for cleaner mobile experience

### Fixed

- **Mobile Overflow**: Fixed issue where long names would overflow horizontally on mobile devices
- **Gnome Repetition**: Addressed repetition issues in Gnome name generation with improved anti-repeat tracking

## [3.2.2] - 2025-12-12

### Fixed

- **High Elf Name Generation**: Fixed issue where Drow-tagged components (including famous characters like Drizzt and Jarlaxle) were appearing in High Elf, Sun Elf, Moon Elf, and Wood Elf names
- **Famous Character Names**: Famous character names (like Drizzt, Jarlaxle) are now used as complete names when selected in simple mode, preventing awkward combinations
- **Famous Name Frequency**: Reduced frequency of famous character names appearing for non-Drow Elven subraces (95% bias against selection)

## [3.2.1] - 2025-12-12

### Fixed

- Version number correction in index.html

## [3.2.0] - 2025-12-12 - "The Name Generator Level-Update"

### Added

- **Massive Component Expansion**: Added 531 new components across all generators (+133% overall)
    - **Elven Components**: Added 65 new components including Drow houses (Do'Urden, Baenre, Agrach Dyrr), famous character names (Drizzt, Jarlaxle, Coran, etc.), and expanded Drow-specific components
    - **Dwarven Names**: Added famous Dwarf characters (Bruenor, Pwent, Gundren, etc.) from BG2, BG3, and Salvatore novels; expanded clan names
    - **Gnomish Names**: Added 57 personal names from Volo's Guide & Mordenkainen's Tome; expanded clan names from 5 to 33 (+560%); expanded nicknames from 5 to 49 (+880%)
    - **Halfling Names**: Added 58 personal names from Mordenkainen's Tome; expanded family names from 10 to 63 (+530%); expanded nicknames from 10 to 65 (+550%)
    - **Orc Names**: Added 24 personal names from Volo's Guide; added 12 clan names; expanded epithets from 30 to 82 (+173%)

- **Pattern-Based Naming Systems**: Implemented pattern-based name generation for Gnomes, Halflings, and Orcs
    - All pattern-based names clearly marked with "(pattern-based)" in meanings
    - Official sources properly attributed
    - Follows official D&D naming conventions

- **Drow Generation Improvements**: Major formula enhancements
    - Root repetition prevention (max 2 occurrences per name)
    - Adjusted component selection weighting for Drow-specific components
    - Neutral fallback for Drow selection
    - Adaptive minimum syllables (4-6 for Drow females)
    - Simple-mode guard (prevents prefix.root === suffix.root)
    - Famous component guard (prevents too many famous+famous combinations)
    - Lore accuracy: Prevented Drow from using Moon Elf components

### Changed

- **Component Quality**: All pattern-based names now clearly marked; official sources properly attributed
- **Source String Formatting**: Removed .md extensions, combined duplicate sources, improved readability
- **Display Improvements**: Fixed double parentheses in component breakdowns
- **Name Generation Logic**:
    - Gnome clan names now use single components (not combined) to prevent overly long names
    - Halfling/Gnome personal names prevent combining two complete names
    - Proper capitalization for clan/family names

### Fixed

- **Long Name Issue**: Prevented combining complete names (e.g., "Qualnusderukoskai" → "Qualnus" or "Derukoskai")
- **Double Parentheses**: Fixed breakdown display showing "(pattern-based)" instead of "((pattern-based))"
- **Source Deduplication**: Fixed duplicate source strings in generated name meanings
- **Clan Name Capitalization**: Fixed lowercase clan names (e.g., "crystalwhistle" → "Crystalwhistle")

### Updated

- Test suite for all generator improvements
- Documentation with comprehensive improvement metrics
- All JSON data files cleaned and structured appropriately

## [3.1.5] - 2025-12-07

### Patch

- Consolidated desktop tabs into a single stack, fixed their anchor to the container, and adjusted z-index to sit behind content; narrowed secondary tabs while keeping left alignment.
- Tweaked desktop tab offset for precise alignment and consistent small-tab borders (including Mail).
- Mobile “More” menu now overlays above the nav bar instead of pushing it upward.
- Prevented ALFA badge flicker by keeping it in-DOM with visibility toggling.

## [3.1.3] - 2025-12-07

### Patch

- Added contact “Mail” tab and modal with mailto and zero-backend note.
- Clarified ALFA/BETA tooltips, help cursors, and favorites icon/label alignment.
- Updated disclaimer and MIT license popover styling/copyright language.
- Fixed Gnomish component breakdown so personal/nickname/clan render separately.
- Softened popover backgrounds and refined small-tab styling.

## [3.1.0] - 2025-12-07

### Added

- **Gnomish (Gnim) Generator (ALFA)**: Personal + clan + optional nickname; rock/forest/deep subraces; copper/green theme and icons.
- **Halfling (Hin) Generator (ALFA)**: Personal + family + optional nickname; Lightfoot/Strongheart, Stout, Ghostwise; dagger theme.
- **Orc Generator (ALFA)**: Personal + epithet (no surname); Mountain/Gray/Half-Orc/Orog flavoring; vibrant orc-green theme.
- **Data & Loaders**: Gnomish, Halfling, Orc JSON pools and loaders (`loadGnomishGeneratorData`, `loadHalflingGeneratorData`, `loadOrcGeneratorData`).
- **Tests**: Unit coverage for all three new generators; integration updates to load and switch Gnomish/Halfling/Orc tabs.

### Changed

- **UI/UX**: Mobile bottom nav is full-width with “More” overflow; Orc controls simplified (shared pool); Orcish kindred lore refreshed with examples.
- **Favorites & Badges**: Filters/icons for Gnomish, Halfling, Orc; badges show ALFA for new species.
- **Metadata**: Descriptions now highlight Espruar depth and multi-species support.

### Fixed

- Mobile nav height/position regressions after adding new tabs.

## [3.0.2] - 2025-12-04

### Changed

- **Updated Dwarven Clan Name Algorithm** - Clan names can now mix English words and Dethek components (e.g., "Stonegrim", "Bronguard", "Hammerdel")
- **Added Potential Combination Numbers** - Updated dropdown labels to show combination counts:
    - Elven Complexity: Auto (Over 5M), Simple (Over 260K), Complex (Over 10B)
    - Dwarven Name Type: Full Name (Over 29M), First Name (Almost 3k), Clan Name (Almost 10k)

## [3.0.1] - 2025-12-04

### Fixed

- **Meta Tags for Social Sharing** - Updated Open Graph and Twitter Card meta tags to include Dwarven generator
- **SEO Metadata** - All meta descriptions now mention both Elven and Dwarven naming systems

### Added

- **Domain-Based Defaults** - dethek.com (or dethek subdomain) automatically defaults to Dwarven tab
- **URL Parameter Support** - `?generator=dwarven` or `?tab=dwarven` to force generator type

## [3.0.0] - 2025-12-04 - "Dwarf Update"

### Added

- **Dwarven Name Generator (Beta)** - Complete Dethek naming system implementation
    - Support for Gold Dwarves, Shield Dwarves, and Duergar subraces
    - First name, clan name, and full name generation
    - Gender-specific name generation (Male/Female/Neutral)
    - Dwarven phonetic rules with consonant cluster smoothing
- **Unified Generator Architecture** - Single codebase managing both Elven and Dwarven generators
- **Tab System** - Seamless switching between generators
    - Desktop: Vertical tabs on right side of container
    - Mobile: iOS-style floating bottom navigation bar
- **Enhanced Favorites System**
    - Generator type badges (⚔️ Elven / ⚒️ Dwarven) for visual identification
    - Filter buttons (All / Elven / Dwarven) for easy navigation
    - Unified storage supporting both generator types
    - Automatic migration from legacy separate storage
- **Dwarven Educational Content** - Complete lore section with 4 accordions:
    - Dwarven Races of Faerûn (including obscure subraces)
    - Understanding Dwarven Names
    - Dwarven Pronunciation Guide
    - A Brief History of the Khazad (with timeline)
- **External Link Indicators** - U+29C9 (⧉) icons on Ko-fi and GitHub tabs
- **Test Logging System** - Automatic tracking of test updates and runs
- **Remember Last Generator** - LocalStorage preference for default tab
- **Domain-Based Defaults** - dethek.com automatically defaults to Dwarven tab
- **URL Parameter Support** - `?generator=dwarven` or `?tab=dwarven` to force generator type

### Changed

- **Site Renamed** - "Elven Name Generator" → "Faerûn Name Generator"
- **Theme Simplification** - Removed Sun Elf, Wood Elf, and Drow themes
    - Single Moon Elf theme for Elven generator
    - Dedicated Dwarven theme (gold/steel palette)
- **Educational Content Reorganization**
    - "Elven Races of Faerûn" moved to first position
    - Elven history section restructured to match Dwarven format
    - Both histories now include detailed timelines
- **Mobile Responsive Design** - Complete overhaul
    - Fixed bottom navigation bar (iOS-style)
    - Proper tab spacing and alignment
    - Beta badge repositioned for mobile
    - Generate button margins adjusted
- **Accessibility Improvements**
    - Comprehensive ARIA attributes throughout
    - Filter buttons with `aria-pressed` states
    - Accordion `aria-controls` linking
    - Tab icons marked as decorative
    - External links indicate "Opens in new window"
- **Dwarven Phonetic Rules** - Prevents unpronounceable consonant clusters
    - Triple consonant reduction (e.g., "Auddd" → "Audd")
    - Harsh cluster smoothing (preserves valid "unn" patterns)
- **Footer Links** - Ko-fi and GitHub tabs added to navigation

### Fixed

- Tab positioning and z-index issues
- Active tab visual states on mobile
- Dwarven settings showing Elven controls
- Generate button icon updates for Dwarven subraces
- Favorites filter functionality
- Toast notification positioning (moved up after theme button removal)

### Updated

- Test suite for unified architecture
- FavoritesManager tests for generator type tagging
- Accessibility tests for new ARIA attributes
- Documentation and copy throughout site

## [2.7.3] - 2025-12-03

### Added

- Accessibility tests for ARIA attributes and screen reader support
- Hover effect on generator accordions (brightens/darkens background based on theme)

### Changed

- Improved TTS phonetic pronunciation for multiple names (Queesastra, Ah-rahn-ee-ehl, Ayl-ih-rah-dorr, Tanenfelle, Corastra, Zhaunanidorei, Valastra, Myreathala, Vaelellathir, Anariel, Alador, Menalathar, Quessamith, Liatana)
- Sun Elf theme accordion hover effect now darkens instead of brightens (better contrast on light background)

## [2.7.2] - 2025-12-03

### Changed

- Various minor updates and fixes

## [2.0.0] - 2025-01-XX

### Added

- Complete refactor with modular ES6 architecture
- Wood Elf support
- Drow support (Beta)
- Complex Mode implementation (3+ component names)
- Light/Dark theme system
- Phonetic pronunciation display
- Favorites system with localStorage
- Testing framework (Vitest)
- Automated versioning system

### Changed

- Migrated from single-file to modular architecture
- Improved code organization and maintainability
- Enhanced name generation algorithm

---

## Version Numbering Guide

- **Major (X.0.0)**: Complete refactors, major architectural changes
    - Example: v1 → v2 (complete refactor)
- **Minor (x.X.0)**: Major feature additions
    - Example: Adding phonetic voice reader, new subrace support
- **Patch (x.x.X)**: Bug fixes, minor enhancements, small updates
    - Example: UI tweaks, performance improvements, small fixes
