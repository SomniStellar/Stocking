# UI Spec
## Dashboard
Purpose:
- Show portfolio summary and benchmark comparison on one page.

Current layout:
- Top summary cards: Portfolio Value, Invested Cost, Unrealized P/L, Return
- Portfolio Value and Invested Cost cards do not show helper captions
- Top summary cards use fixed-width cards and wrap only between `1x4` and `2x2`
- Benchmark comparison section
- Period toggle: `YTD`, `3Y`, `5Y`
- First comparison card: `Portfolio`
- Comparison benchmark cards
- Benchmark comparison chart area below the benchmark cards
- `Add Benchmark` action in the section title area
- Inline custom benchmark delete action
- Validation and fallback status caption when needed

Rules:
- The global topbar does not show a persistent spreadsheet connection status chip.
- Desktop top summary uses a single row of 4 cards when width is sufficient.
- Mid-width top summary wraps to exactly `2 x 2`.
- Top summary cards use a fixed width of `280px`.
- Top summary uses shared fixed-grid tokens from the common card layer.
- Desktop benchmark comparison uses fixed-width cards of `280px`.
- Benchmark comparison wraps by width as `4 -> 3 -> 2 -> 1` columns.
- Benchmark comparison uses shared fixed-grid tokens from the common card layer.
- Narrow widths must reduce the column count before horizontal scrolling appears.
- Comparison cards use a 3x2 grid.
- Row 1 column 1 holds the title.
- Row 1 column 2 remains empty unless title sizing requires visual merge.
- `Portfolio` card uses this structure.
  - Row 1: `Portfolio` | empty
  - Row 2: empty | return
  - Row 3: empty | unrealized profit amount
- Benchmark cards use this structure.
  - Row 1: benchmark name | empty
  - Row 2: empty | benchmark return
  - Row 3: low-priority delta label `vs Port.` | benchmark return minus portfolio return in `%p`
- The delta value is color-emphasized by sign.
- Clicking the benchmark card toggles active or inactive state.
- Inactive state keeps the card visible but removes strong color and reduces opacity.
- Benchmark cards can be reordered by drag-and-drop.
- `Portfolio` stays fixed and does not participate in drag-and-drop.
- Portfolio and benchmark accent colors are selected from a fixed palette.
- `Add Benchmark` opens from the section title area next to `Benchmarks`.
- The open quick add UI stays inline in the title row as `Ticker input + Save + Cancel`.
- The ticker input uses compact width sized for real ticker symbols, not a full form width.
- Benchmark cards keep top-right inline utility actions for palette selection and reorder.
- Custom benchmark cards additionally keep inline delete in the same utility area.
- The benchmark comparison chart belongs directly below the benchmark card section.
- The benchmark comparison chart uses the same width rule as the benchmark card grid, so both blocks align on the same centered fixed-width track.
- The period toggle switches the whole benchmark comparison chart range.
- The chart does not treat `YTD`, `3Y`, `5Y` as simultaneous X-axis points.
- Hover values in the chart represent the selected range's current point value.
- On initial live load, cards may appear before the chart finishes its background series sync.
- Benchmark card enable or disable interaction should feel immediate, even if background sync still updates chart data afterward.
- A separate top-sector portfolio profit chart is not part of the current required layout.
- A separate top-sector portfolio profit chart may be added later after series-based data is available.

## Holdings
Purpose:
- Review, edit, and reorder holdings and see portfolio summary in the same card system.

Current layout:
- Top sector: centered `Portfolio` card and `Add Holding` card only
- Low sector: holding cards only
- Tag filter in the section header

Rules:
- All cards use the same fixed size.
- Holdings uses shared fixed-grid tokens from the common card layer.
- All holdings cards use 2 rows by 3 columns.
- Holdings is split into two sectors and both sectors use the same width.
- The number of cards shown on one row depends on the fixed card width.
- Top sector contains only the `Portfolio` card and the `Add Holding` card.
- Low sector contains only holding cards.
- `Portfolio` card uses this structure.
  - Row 1 column 1: `Portfolio`
  - Row 1 column 2: `Value`
  - Row 1 column 3: 3-row `P/L` block with label, profit amount, return
  - Row 2 column 1: `Holdings`
  - Row 2 column 2: `Invested`
  - Row 2 column 3: internal 3-row by 2-column period block for `YTD`, `3Y`, `5Y`
- `Add Holding` card is an input form and each occupied cell uses 2 rows: label and input/control.
  - Row 1 column 1: `Ticker`
  - Row 1 column 2: one-line `Total Price` <-> `Avg Price` clickable toggle. Price input accepts up to 2 decimal places.
  - Row 1 column 3: `Add` <-> `Reduce` segmented control, no extra label
  - Row 2 column 1: `Quantity`. Quantity input accepts up to 4 decimal places.
  - Row 2 column 2: `Tags`, case-insensitive
  - Row 2 column 3: `Save` action, no extra label
- The `Add` and `Reduce` labels are short on purpose so the control stays within the card width.
- The holdings input card adjusts the current position state and does not represent full transaction history editing.
- Switching `Total Price` and `Avg Price` in holding edit should not change the effective total only because the display rounds values.
- Holding card uses this structure.
  - Row 1 column 1: 2-row `Name`, `Ticker`
  - Row 1 column 2: 3-row `Price / Avg`, `Price`, `Avg`
  - Row 1 column 3: 3-row `P/L`, profit amount, return
  - Row 2 column 1: `Quantity`. Quantity input accepts up to 4 decimal places.
  - Row 2 column 2: 3-row `Value / Inv.`, `Value`, `Invested`
  - Row 2 column 3: internal 3-row by 2-column period block for `YTD`, `3Y`, `5Y`
- Tags are case-insensitive.
- Average Price / Total Price toggle must remain visibly clickable.

## Settings
Purpose:
- Account and spreadsheet actions only.

Rules:
- Benchmark management does not live in Settings.
- Settings uses a single centered stack.
- Settings keeps only account status, sign-in or sign-out, sheet creation or connection, sheet sync, sheet rebuild, open sheet, and disconnect sheet actions.
- Settings does not show internal sheet row counts in the default UI.
- Spreadsheet quick actions are presented as one horizontal action row on desktop and may wrap only on narrower widths.

## Current UI Follow-up
- `DashboardComparisonChart` lazy or deferred mount is an optional optimization and is currently on hold.
- Fallback wording work is not a current blocker and remains on hold.

## Login
Purpose:
- Simple sign-in entry and connection status check.

Rules:
- Use a centered minimal layout.
