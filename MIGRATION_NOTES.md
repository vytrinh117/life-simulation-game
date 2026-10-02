# Save Migration Notes

## v6.x → v7

The game first looks for the v7 autosave key and then checks legacy Life Simulator keys. A loaded legacy save is migrated in memory and saved back as v7.

Migration adds safe defaults for:
- simulation `clock` (date + minute),
- calendar and pending decisions,
- event cooldowns and notifications,
- emotional state and milestones,
- structured inventory items,
- parent-managed savings,
- richer NPC fields,
- phone app unlocks,
- richer career/health/social fields,
- school teachers/homework/exam calendar dates.

Legacy possession arrays and weather-gear counters are converted to structured inventory records. Legacy school `Considering` contest entries are converted to actionable `Open` entries with v7 decision/event dates. Existing people, relationships, money, needs, school scores, phone ownership and history are retained wherever the old data is usable.

The original legacy browser key is not silently deleted during migration. Restart/New Life removes only known Life Simulator keys after confirmation.
