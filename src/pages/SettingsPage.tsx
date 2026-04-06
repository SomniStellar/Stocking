import { SectionCard } from '../components/SectionCard'

export function SettingsPage() {
  return (
    <div className="page-stack settings-grid">
      <SectionCard title="Spreadsheet Connection" description="Reserved for Google login and sheet binding flow." actionLabel="Reconnect">
        <ul className="check-list">
          <li>Template validation against `Stocks`, `Holdings`, `Favorites`, `Ideas`, `Monitor`</li>
          <li>Google account connection state</li>
          <li>Connected sheet identifier and status</li>
        </ul>
      </SectionCard>

      <SectionCard title="Project Notes" description="Implementation guidance carried from the design docs.">
        <ul className="check-list">
          <li>US stocks only</li>
          <li>Previous close as the price baseline</li>
          <li>No external market API</li>
          <li>Dividend features deferred</li>
        </ul>
      </SectionCard>
    </div>
  )
}
