import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { PlanInfo } from './api'
import { resetWhen, useI18n } from './i18n'
import { usePlan } from './plan'

function PlanCard({
  name,
  perDay,
  current,
  children,
}: {
  name: string
  perDay: number
  current: boolean
  children?: ReactNode
}) {
  const { t } = useI18n()
  const p = t.premium
  return (
    <section className={`plan-card${current ? ' is-current' : ''}`} aria-label={p.planAria(name)}>
      <div className="plan-card-head">
        <h2 className="plan-name">{name}</h2>
        {current && <span className="plan-badge">{p.yourPlan}</span>}
      </div>
      <ul className="plan-features">
        <li>
          <Check aria-hidden="true" size={18} />
          <strong>{perDay === 0 ? p.noLimit : p.perDay(perDay)}</strong>
        </li>
        {p.shared.map((f) => (
          <li key={f}>
            <Check aria-hidden="true" size={18} />
            {f}
          </li>
        ))}
      </ul>
      {children}
    </section>
  )
}

function Today({ plan }: { plan: PlanInfo }) {
  const { t, locale } = useI18n()
  if (plan.remainingToday === null) return <p className="section-lede">{t.premium.noDailyLimit}</p>
  return (
    <p className="section-lede">
      {t.premium.today(plan.usedToday, plan.promptsPerDay, resetWhen(plan.resetsAt, t, locale))}
    </p>
  )
}

export function Premium({ onSignedOut }: { onSignedOut: () => void }) {
  const plan = usePlan(onSignedOut)
  const { t } = useI18n()
  const p = t.premium

  return (
    <main className="page premium">
      <h1 className="page-title">{p.title}</h1>
      <p className="section-lede">{p.lede}</p>
      {plan && <Today plan={plan} />}

      {plan === null ? (
        <div className="plan-grid grid-loading" aria-busy="true" />
      ) : (
        <div className="plan-grid">
          <PlanCard name={p.free} perDay={plan.freePromptsPerDay} current={plan.plan === 'FREE'} />
          <PlanCard name={p.premium} perDay={plan.premiumPromptsPerDay} current={plan.plan === 'PREMIUM'}>
            {plan.plan === 'FREE' && (
              <div className="plan-cta">
                <button type="button" className="primary wide" disabled={!plan.upgradeAvailable}>
                  {plan.upgradeAvailable ? p.upgrade : p.soon}
                </button>
                {!plan.upgradeAvailable && <p className="plan-note">{p.paymentsClosed}</p>}
              </div>
            )}
          </PlanCard>
        </div>
      )}
    </main>
  )
}
