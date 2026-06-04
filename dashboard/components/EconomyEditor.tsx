'use client';

import { Card, Row, StatRow, NumInput, TextField, RoleSelect, uid } from './settingsKit';
import type { EconomySettings, ShopItem } from '@/lib/settings';

export function EconomyEditor({ value, onChange }: { value: EconomySettings; onChange: (e: EconomySettings) => void }) {
  const set = (patch: Partial<EconomySettings>) => onChange({ ...value, ...patch });
  const dy = value.daily;
  const wk = value.work;

  return (
    <div className="space-y-5">
      <Card title="Currency" desc="Name and starting balance for your server's economy.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Currency name" value={value.currencyName} maxLength={24} onChange={(currencyName) => set({ currencyName })} />
          <TextField label="Symbol / emoji" value={value.currencySymbol} maxLength={8} onChange={(currencySymbol) => set({ currencySymbol })} />
        </div>
        <StatRow>
          <span className="text-mist">Starting balance</span>
          <NumInput value={value.startingBalance} min={0} max={1_000_000_000} width="w-28" onChange={(startingBalance) => set({ startingBalance })} />
        </StatRow>
      </Card>

      <Card title="Earning">
        <Row label="Daily reward" hint="Members claim a reward once per day." checked={dy.enabled} onChange={(enabled) => set({ daily: { ...dy, enabled } })}>
          <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
            <span>Reward</span>
            <NumInput value={dy.amount} min={0} max={1_000_000} width="w-24" onChange={(amount) => set({ daily: { ...dy, amount } })} />
            <span>+ streak bonus</span>
            <NumInput value={dy.streakBonus} min={0} max={1_000_000} width="w-24" onChange={(streakBonus) => set({ daily: { ...dy, streakBonus } })} />
            <span>per day</span>
          </div>
        </Row>
        <Row label="Work command" hint="Members earn a random amount on a cooldown." checked={wk.enabled} onChange={(enabled) => set({ work: { ...wk, enabled } })}>
          <div className="flex flex-wrap items-center gap-2 text-sm text-mist-muted">
            <span>Earn</span>
            <NumInput value={wk.min} min={0} max={1_000_000} width="w-24" onChange={(min) => set({ work: { ...wk, min } })} />
            <span>to</span>
            <NumInput value={wk.max} min={0} max={1_000_000} width="w-24" onChange={(max) => set({ work: { ...wk, max } })} />
            <span>every</span>
            <NumInput value={wk.cooldownSec} min={0} max={86_400} width="w-24" onChange={(cooldownSec) => set({ work: { ...wk, cooldownSec } })} />
            <span>seconds</span>
          </div>
        </Row>
      </Card>

      <Card title="Features">
        <Row label="Gambling" hint="Coinflip and slots commands." checked={value.gambling} onChange={(gambling) => set({ gambling })} />
        <Row label="Leaderboard" hint="Public richest-members ranking." checked={value.leaderboard} onChange={(leaderboard) => set({ leaderboard })} />
      </Card>

      <Card title="Shop" desc="Items members can buy with currency. Attach a role to sell role rewards.">
        <ShopEditor value={value.shop} onChange={(shop) => set({ shop })} />
      </Card>
    </div>
  );
}

function ShopEditor({ value, onChange }: { value: ShopItem[]; onChange: (s: ShopItem[]) => void }) {
  const add = () => onChange([...value, { id: uid(), name: '', price: 100, roleId: '', description: '' }]);
  const patch = (id: string, p: Partial<ShopItem>) => onChange(value.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));

  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-xs text-mist-muted">No items yet.</p>}
      {value.map((s) => (
        <div key={s.id} className="rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input min-w-[10rem] flex-1 py-1 text-sm"
              value={s.name}
              maxLength={60}
              placeholder="Item name"
              onChange={(e) => patch(s.id, { name: e.target.value })}
            />
            <span className="flex items-center gap-1.5 text-sm text-mist-muted">
              <span>Price</span>
              <NumInput value={s.price} min={0} max={1_000_000_000} width="w-28" onChange={(price) => patch(s.id, { price })} />
            </span>
            <button type="button" onClick={() => remove(s.id)} className="text-mist-faint hover:text-red-300">
              Remove
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              className="input flex-1 py-1 text-sm"
              value={s.description}
              maxLength={200}
              placeholder="Description (optional)"
              onChange={(e) => patch(s.id, { description: e.target.value })}
            />
            <div className="w-52">
              <RoleSelect value={s.roleId} onChange={(roleId) => patch(s.id, { roleId })} placeholder="No role reward" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + Add item
      </button>
    </div>
  );
}
