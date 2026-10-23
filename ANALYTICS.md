# Usage analytics (GA4)

The site uses Google Analytics 4 through gtag.js (Measurement ID `G-8T9GFW6PVK`). All of it lives in
`js/analytics.js`; `js/app.js` calls `track(event, params)` at the points where a visitor does something.

## When anything is sent

- **Consent:** gtag.js loads only after the visitor presses Accept on the cookie banner (stored as
  `analytics_consent` in their browser). Before that, or after Decline, nothing is sent and nothing is queued.
- **Production only:** gtag.js loads only on `espruar.com` and `www.espruar.com`. Local development, the dev
  repository and automated tests never send data to the property.
- **Debugging:** add `?analytics_debug` to the URL. On production, events are flagged for GA4 DebugView
  (`debug_mode`). Anywhere else, events are written to the browser console instead of being sent.
- **Failures:** if gtag.js is blocked or throws, the call is ignored; the generator keeps working.
- **Never sent:** generated names, any part of a name (prefixes, suffixes, family names), saved names, or anything a
  visitor types. Every parameter value is a fixed, lowercase value from the lists below.

The automatic `page_view` from `gtag("config")` is the only page view; no others are sent.

## Events

| Event                      | Sent when                                                                                                                                        | Parameters (besides the common ones)                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `name_generated`           | The visitor rolls: Roll Name, the spacebar, or Roll 10 More. Not sent for the name shown on page load, or when a setting change shows a new name | `roll_type`, `name_count`, `trigger`                                                           |
| `name_copied`              | A copy to the clipboard succeeds (not just the click)                                                                                            | `copy_source`                                                                                  |
| `name_saved`               | The bookmark adds the current name to saved names                                                                                                | —                                                                                              |
| `component_picker_opened`  | The visitor opens the options list for a component                                                                                               | `component_position`, `component_type`                                                         |
| `component_selected`       | The visitor picks an option and the new name is shown                                                                                            | `component_position`, `component_type`, `component_origin`                                     |
| `component_lock_changed`   | The visitor locks or unlocks a component                                                                                                         | `component_position`, `component_type`, `locked`                                               |
| `name_structure_changed`   | The visitor presses a + or - beside the first name, the compound name or the surname                                                             | `structure_control`, `structure_value`                                                         |
| `surname_kind_changed`     | The visitor switches a surname (or drow house) to the other kind in its picker: Published or Constructed                                         | `surname_kind`                                                                                 |
| `expanded_variety_changed` | The visitor turns Expanded Variety on or off                                                                                                     | `setting_value`                                                                                |
| `name_sources_opened`      | The visitor opens "Name meanings and sources" (not on close)                                                                                     | —                                                                                              |
| `name_setting_changed`     | The visitor changes gender or lineage                                                                                                            | `setting_name`, `setting_value`                                                                |
| `exception`                | An error reaches the page (GA4's standard event)                                                                                                 | `description` (area and error type, such as `generator_typeerror`; never the message), `fatal` |

`species_changed` is not sent yet: elf is the only species that can be chosen. Add it when a second species is
selectable.

### Common parameters (on every usage event)

| Parameter          | Values                                           |
| ------------------ | ------------------------------------------------ |
| `species`          | `elf`                                            |
| `generation_mode`  | `standard`, `expanded` (Expanded Variety on)     |
| `character_gender` | `neutral`, `female`, `male`                      |
| `lineage`          | `any`, `sun_elf`, `moon_elf`, `wood_elf`, `drow` |

Settings are read when the event is sent, so a setting change carries the new value.

### Event parameters

| Parameter            | Values                                                            | Meaning                                                                    |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `roll_type`          | `single`, `list`                                                  | One name, or the Roll 10 More list                                         |
| `name_count`         | number                                                            | Names produced by the roll (1, or up to 10 for a list)                     |
| `trigger`            | `button`, `spacebar`                                              | How the roll was asked for                                                 |
| `copy_source`        | `current`, `saved`                                                | The name card, or a saved name                                             |
| `component_position` | `first_name`, `family_name`                                       | Drow houses count as `family_name`                                         |
| `component_type`     | `prefix`, `suffix`, `whole`                                       | `whole` is a family name chosen as one piece                               |
| `component_origin`   | `table`, `split`, `published`, `common_words`                     | Where the chosen option comes from                                         |
| `structure_control`  | `first_name_length`, `surname_length`, `compound_name`            | Which button was pressed                                                   |
| `structure_value`    | `on`, `off`                                                       | The change made: a suffix or compound name added is `on`, removed is `off` |
| `surname_kind`       | `published`, `constructed`                                        | The kind of surname the visitor switched to                                |
| `locked`             | `on`, `off`                                                       | The lock's new state                                                       |
| `setting_name`       | `gender`, `lineage`                                               | Which setting changed                                                      |
| `setting_value`      | gender or lineage values above; `on` / `off` for Expanded Variety | The new value                                                              |

## GA4 setup still needed (manual, in the GA4 admin)

1. **Custom dimensions** (Admin → Custom definitions → Create custom dimension, scope **Event**), one per parameter:
   `species`, `generation_mode`, `character_gender`, `lineage`, `roll_type`, `trigger`, `copy_source`,
   `component_position`, `component_type`, `component_origin`, `locked`, `setting_name`, `setting_value`,
   `structure_control`, `structure_value`, `surname_kind` (the last three arrived with version 4.1.0; register them after
   that release).
   Data appears only from the day each one is registered.
2. **Custom metric:** `name_count` (scope Event, unit Standard), for names per user.
3. **Key event:** `name_copied` is marked as a key event (done 2026-10-23); copying is the clearest sign a name was
   useful.
4. **Verify:** open the production site with `?analytics_debug`, accept the cookie banner, and watch Admin →
   DebugView while rolling, copying, locking and picking. Each action should show exactly one event.

## Answering the reporting questions

| Question                                  | How                                                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Unique users who generate or copy      | Reports → Engagement → Events: Total users for `name_generated` and `name_copied`                                                                                                              |
| 2. Names per active user                  | Sum of `name_count` (custom metric) ÷ Active users; or Event count per user for `name_generated`                                                                                               |
| 3. Share who open pickers, select or lock | Total users for `component_picker_opened`, `component_selected`, `component_lock_changed` ÷ Active users                                                                                       |
| 4. Share who turn on Expanded Variety     | Users with `expanded_variety_changed` where `setting_value` = `on`, ÷ Active users                                                                                                             |
| 5. Interest in sources and meanings       | Users and event count for `name_sources_opened`                                                                                                                                                |
| 6. Popular species, lineages, settings    | Any event broken down by `species`, `lineage`, `character_gender`, `generation_mode`                                                                                                           |
| 7. Do customizers copy more?              | Explore → Free form or Segment overlap: a user segment "did `component_selected` or `component_lock_changed`" against the rest, compared on users with `name_copied` (or event count per user) |

No custom user IDs are used; these all rely on GA4's own user and event counts.
