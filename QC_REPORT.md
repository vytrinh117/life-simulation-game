# QC Report — v6.2

## Problems found in v6.1
1. `World & history` exposed independent trip planning at every age, including toddlers.
2. People cards exposed `Message` even without a usable/owned phone.
3. Random events could generate a `New message` before the phone milestone.
4. Family panel displayed romance controls to young children.
5. Kindergarten reused formal school club/contest/study UI.
6. Primary school used GPA/class rank like older school levels.
7. `Growing Up` and `My Money` were visible in navigation but their renderer functions were missing.
8. `renderPanel()` referenced legacy Weather/Needs renderers that were also missing.
9. v6.1 Need actions updated self-feeding/potty/bathing on `development` instead of `development.skills`.
10. Teen/child outside actions described permission but did not consistently enforce it.
11. Investment UI was visible at 16–17 even though the action rejected it until 18.

## v6.2 resolution
- Added centralized age/action gates for phone, work, investing, romance, cooking and child selling.
- Reworked travel into caregiver outing → permission → supervised planning → independent travel.
- Rebuilt age-aware People, Family, School, Daily Life, World/History and Career panels.
- Restored missing panel functions.
- Fixed developmental-skill persistence.
- Added age-aware school activity/contest pools.
- Added static QC checks during packaging.

## Validation performed
- JavaScript parser check with `node --check`.
- Required panel renderer existence check.
- Required age-rule helper existence check.
- Static referenced DOM ID audit (excluding intentionally dynamic stall form inputs).
- ZIP integrity test.
- GitHub Pages workflow presence check.
