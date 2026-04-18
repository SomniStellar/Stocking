# UI Spec
## Dashboard
Purpose:
- Show portfolio summary and benchmark comparison on one page.

Current layout:
- Top summary cards: Portfolio Value, Invested Cost, Unrealized P/L, Return
- Portfolio Value and Invested Cost cards do not show helper captions
- Top summary cards use fixed-width cards and wrap only between `1x4` and `2x2`
- Benchmark comparison section
- Period toggle: `YTD`, `1Y`, `3Y`, `5Y`
- First comparison card: `Portfolio`
- Comparison benchmark cards
- `Add Benchmark` action in the section title area
- Inline custom benchmark edit panel
- Validation and fallback status caption when needed

Rules:
- Keep only `[Dev/Test]` copy that is needed for test or preview verification.
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
  - Row 3: low-priority delta label `vs Port.` | portfolio minus benchmark return in `%p`
- The delta value is color-emphasized by sign.
- Clicking the benchmark card toggles active or inactive state.
- Inactive state keeps the card visible but removes strong color and reduces opacity.
- `Add Benchmark` opens from the section title area next to `Benchmark Comparison`.
- The open quick add UI stays inline in the title row as `Ticker input + Save + Cancel`.
- The ticker input uses compact width sized for real ticker symbols, not a full form width.
- The future graph area belongs directly below the benchmark card section.

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
  - Row 1 column 2: `Total Price` <-> `Avg Price` clickable toggle. Price input accepts up to 2 decimal places.
  - Row 1 column 3: `Buy` <-> `Sell` segmented control, no extra label
  - Row 2 column 1: `Quantity`. Quantity input accepts up to 4 decimal places.
  - Row 2 column 2: `Tags`, case-insensitive
  - Row 2 column 3: `Save` action, no extra label
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
- Account, spreadsheet connection, and app-level actions only.

Rules:
- Benchmark management does not live in Settings.
- Settings keeps a simple 2-column section grid that collapses to 1 column on narrow widths.

## Watchlists
Purpose:
- Keep favorites and idea rows on one page and edit them from a compact form.

Current layout:
- Section header actions: `Add watchlist`, optional `Close input`, tag filter
- Inline form with compact 2-column field grid
- Grouped card list by primary tag
- Each card uses common entity card header and compact metric grid patterns

Rules:
- Watchlists does not keep a page-specific CSS file.
- Form grid and compact metric/card header patterns come from shared control/card layers.
- Card structure is still provisional and may later align more closely with Holdings.
- Empty state remains a simple guidance message until the page layout is expanded further.

## Login
Purpose:
- Simple sign-in entry and connection status check.

Rules:
- Use a centered minimal layout.
- Keep only development or test copy that is required and prefix it with `[Dev/Test]`.
