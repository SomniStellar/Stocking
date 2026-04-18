import { type FormEvent, useMemo, useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import { buildWatchlistRows } from '../data/sheetData'
import { useGoogleWorkspace } from '../features/google/GoogleWorkspaceContext'
import { getGroupLabel, getPrimaryTag, getTagOptions, matchesTagFilter, parseTags } from '../lib/tags'
import type { WatchlistDraft, WatchlistRow } from '../types/domain'
import '../styles/watchlists.css'

const INITIAL_DRAFT: WatchlistDraft = {
  ticker: '',
  name: '',
  listType: 'FAVORITE',
  targetPrice: 0,
  virtualQty: 0,
  virtualEntryPrice: 0,
  tags: '',
}

function buildWatchlistDraft(row: WatchlistRow): WatchlistDraft {
  return {
    ticker: row.ticker,
    name: row.ticker,
    listType: row.listType === 'IDEA' ? 'IDEA' : 'FAVORITE',
    targetPrice: row.targetPrice,
    virtualQty: row.virtualQty,
    virtualEntryPrice: row.virtualEntryPrice,
    tags: row.tags,
  }
}

export function WatchlistsPage() {
  const { addWatchlist, busyState, deleteWatchlist, errorMessage, snapshot, spreadsheet, updateWatchlist } = useGoogleWorkspace()
  const rows = buildWatchlistRows(snapshot)
  const [draft, setDraft] = useState<WatchlistDraft>(INITIAL_DRAFT)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeTag, setActiveTag] = useState('all')
  const [editingRowNumber, setEditingRowNumber] = useState<number | null>(null)

  const tagOptions = useMemo(() => getTagOptions(rows.map((item) => item.tags)), [rows])
  const filteredRows = useMemo(
    () => rows.filter((item) => matchesTagFilter(item.tags, activeTag)),
    [activeTag, rows],
  )
  const groupedRows = useMemo(() => {
    const grouped = new Map<string, WatchlistRow[]>()

    filteredRows.forEach((item) => {
      const key = getPrimaryTag(item.tags)
      const current = grouped.get(key) ?? []
      current.push(item)
      grouped.set(key, current)
    })

    return [...grouped.entries()]
  }, [filteredRows])

  function openCreateForm() {
    setEditingRowNumber(null)
    setDraft(INITIAL_DRAFT)
    setFormMessage(null)
    setShowForm(true)
  }

  function openEditForm(row: WatchlistRow) {
    setEditingRowNumber(row.rowNumber)
    setDraft(buildWatchlistDraft(row))
    setFormMessage(null)
    setShowForm(true)
  }

  function closeForm() {
    setEditingRowNumber(null)
    setDraft(INITIAL_DRAFT)
    setFormMessage(null)
    setShowForm(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormMessage(null)

    const normalizedTicker = draft.ticker.trim().toUpperCase()
    if (!normalizedTicker) {
      setFormMessage('Ticker is required.')
      return
    }

    if (draft.listType === 'FAVORITE' && draft.targetPrice <= 0) {
      setFormMessage('Target price must be greater than 0 for FAVORITE rows.')
      return
    }

    if (draft.listType === 'IDEA' && (draft.virtualQty <= 0 || draft.virtualEntryPrice <= 0)) {
      setFormMessage('Virtual quantity and entry price must be greater than 0 for IDEA rows.')
      return
    }

    const normalizedDraft = {
      ...draft,
      ticker: normalizedTicker,
      name: normalizedTicker,
    }

    const saved = editingRowNumber
      ? await updateWatchlist(editingRowNumber, normalizedDraft)
      : await addWatchlist(normalizedDraft)

    if (!saved) {
      return
    }

    setDraft(INITIAL_DRAFT)
    setEditingRowNumber(null)
    setFormMessage(editingRowNumber ? `${normalizedTicker} watchlist row was updated.` : 'Watchlist row saved.')
    setShowForm(false)
  }

  async function handleDelete(rowNumber: number, ticker: string) {
    setFormMessage(null)
    const deleted = await deleteWatchlist(rowNumber)
    if (deleted) {
      setFormMessage(`${ticker} watchlist row was removed.`)
    }
  }

  return (
    <div className="page-stack">
      <SectionCard title="Watchlists" description="Favorites and idea portfolios are unified in one sheet with list types.">
        <div className="stack-block">
          <div className="section-toolbar">
            <div className="button-row">
              <button className="primary-button" type="button" onClick={openCreateForm}>
                Add watchlist
              </button>
              {showForm ? (
                <button className="secondary-button" type="button" onClick={closeForm}>
                  Close input
                </button>
              ) : null}
            </div>

            <label className="field-inline" htmlFor="watchlist-tag-filter">
              <span>Tag filter</span>
              <select id="watchlist-tag-filter" className="text-input" value={activeTag} onChange={(event) => setActiveTag(event.target.value)}>
                <option value="all">All tags</option>
                {tagOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {showForm ? (
            <form className="stack-block trade-form-panel" onSubmit={handleSubmit}>
              <div className="form-heading">
                <strong>{editingRowNumber ? 'Edit watchlist row' : 'Add watchlist row'}</strong>
                <span>{editingRowNumber ? 'Update the selected watchlist card.' : 'Create a new favorite or idea card.'}</span>
              </div>

              {!spreadsheet ? (
                <div className="message-box message-box-neutral">
                  Create or connect a spreadsheet in Settings before saving watchlists.
                </div>
              ) : null}

              <div className="form-grid form-grid-compact">
                <label className="field-block" htmlFor="watchlist-type">
                  <span>Type</span>
                  <select id="watchlist-type" className="text-input" value={draft.listType} onChange={(event) => setDraft((current) => ({ ...current, listType: event.target.value as 'FAVORITE' | 'IDEA' }))}>
                    <option value="FAVORITE">FAVORITE</option>
                    <option value="IDEA">IDEA</option>
                  </select>
                </label>

                <label className="field-block" htmlFor="watchlist-ticker">
                  <span>Ticker</span>
                  <input id="watchlist-ticker" className="text-input" value={draft.ticker} onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))} placeholder="AAPL" />
                </label>

                <label className="field-block" htmlFor="watchlist-target-price">
                  <span>Target price</span>
                  <input id="watchlist-target-price" className="text-input" type="number" min="0" step="0.0001" value={draft.targetPrice || ''} onChange={(event) => setDraft((current) => ({ ...current, targetPrice: Number(event.target.value) || 0 }))} placeholder="220.00" />
                </label>

                <label className="field-block" htmlFor="watchlist-virtual-qty">
                  <span>Virtual qty</span>
                  <input id="watchlist-virtual-qty" className="text-input" type="number" min="0" step="0.0001" value={draft.virtualQty || ''} onChange={(event) => setDraft((current) => ({ ...current, virtualQty: Number(event.target.value) || 0 }))} placeholder="5" />
                </label>

                <label className="field-block" htmlFor="watchlist-entry-price">
                  <span>Virtual entry</span>
                  <input id="watchlist-entry-price" className="text-input" type="number" min="0" step="0.0001" value={draft.virtualEntryPrice || ''} onChange={(event) => setDraft((current) => ({ ...current, virtualEntryPrice: Number(event.target.value) || 0 }))} placeholder="185.00" />
                </label>
              </div>

              <label className="field-block" htmlFor="watchlist-tags">
                <span>Tags</span>
                <input id="watchlist-tags" className="text-input" value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="growth, core" />
              </label>

              <div className="button-row">
                <button className="primary-button" type="submit" disabled={!spreadsheet || busyState !== 'idle'}>
                  {busyState === 'writing' ? (editingRowNumber ? 'Updating watchlist...' : 'Saving watchlist...') : (editingRowNumber ? 'Update watchlist' : 'Save watchlist')}
                </button>
              </div>

              <div className={`message-box ${errorMessage ? 'message-box-error' : 'message-box-neutral'}`}>
                {errorMessage ?? formMessage ?? 'Ticker is required. Name is always saved as the ticker.'}
              </div>
            </form>
          ) : null}

          {filteredRows.length === 0 ? (
            <div className="empty-note">No watchlist rows yet. Add rows to the Watchlists tab.</div>
          ) : (
            groupedRows.map(([groupKey, items]) => (
              <div key={groupKey} className="group-stack">
                <div className="group-heading">
                  <strong>{getGroupLabel(groupKey)}</strong>
                  <span>{items.length} item(s)</span>
                </div>
                <div className="entity-card-grid" data-group={groupKey}>
                  {items.map((item) => (
                    <article key={`${item.rowNumber}-${item.ticker}-${item.name}`} className="entity-card" data-item-id={`${item.rowNumber}`}>
                      <div className="entity-card-head">
                        <div>
                          <h4>{item.ticker}</h4>
                          <p>{item.name}</p>
                        </div>
                        <div className="tag-chip-row">
                          <span className="tag-chip">{item.listType || 'FAVORITE'}</span>
                          {parseTags(item.tags).map((tag) => (
                            <span key={tag} className="tag-chip">{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div className="metric-grid metric-grid-compact">
                        <div className="metric-card"><span>Prev Close</span><strong>${item.closeyest.toFixed(2)}</strong></div>
                        <div className="metric-card"><span>{item.listType === 'IDEA' ? 'Virtual Entry' : 'Target Price'}</span><strong>{item.listType === 'IDEA' ? `$${item.virtualEntryPrice.toFixed(2)}` : `$${item.targetPrice.toFixed(2)}`}</strong></div>
                        {item.listType === 'IDEA' ? <div className="metric-card"><span>Virtual Qty</span><strong>{item.virtualQty.toFixed(2)}</strong></div> : <div className="metric-card"><span>Gap</span><strong>{item.targetPrice > 0 && item.closeyest > 0 ? `${(((item.targetPrice - item.closeyest) / item.closeyest) * 100).toFixed(2)}%` : '-'}</strong></div>}
                      </div>

                      <div className="card-actions">
                        <button className="secondary-button" type="button" onClick={() => openEditForm(item)} disabled={busyState !== 'idle'}>
                          Edit
                        </button>
                        <button className="secondary-button" type="button" onClick={() => { void handleDelete(item.rowNumber, item.ticker) }} disabled={busyState !== 'idle'}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  )
}
