import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import type { PlanInfo } from './api'
import { promptsWord, resetTime, usePlan } from './plan'

function promptsLine(perDay: number): string {
  return perDay === 0 ? 'No daily limit on prompts' : `${perDay} ${promptsWord(perDay)} a day`
}

const SHARED = ['6 memes per prompt', 'Your own photos as templates', 'Edit the words, favorites, sharing']

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
  return (
    <section className={`plan-card${current ? ' is-current' : ''}`} aria-label={`${name} plan`}>
      <div className="plan-card-head">
        <h2 className="plan-name">{name}</h2>
        {current && <span className="plan-badge">Your plan</span>}
      </div>
      <ul className="plan-features">
        <li>
          <Check aria-hidden="true" size={18} />
          <strong>{promptsLine(perDay)}</strong>
        </li>
        {SHARED.map((f) => (
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
  if (plan.remainingToday === null) return <p className="section-lede">You have no daily limit.</p>
  return (
    <p className="section-lede">
      Today you’ve used {plan.usedToday} of your {plan.promptsPerDay} {promptsWord(plan.promptsPerDay)}. They
      come back at {resetTime(plan.resetsAt)}.
    </p>
  )
}

export function Premium({ onSignedOut }: { onSignedOut: () => void }) {
  const plan = usePlan(onSignedOut)

  return (
    <main className="page premium">
      <h1 className="page-title">Premium</h1>
      <p className="section-lede">
        Premium gives you more prompts every day. It isn’t on sale yet: Memes for Laughs is in alpha testing with a
        small group of friends.
      </p>
      {plan && <Today plan={plan} />}

      {plan === null ? (
        <div className="plan-grid grid-loading" aria-busy="true" />
      ) : (
        <div className="plan-grid">
          <PlanCard name="Free" perDay={plan.freePromptsPerDay} current={plan.plan === 'FREE'} />
          <PlanCard name="Premium" perDay={plan.premiumPromptsPerDay} current={plan.plan === 'PREMIUM'}>
            {plan.plan === 'FREE' && (
              <div className="plan-cta">
                <button type="button" className="primary wide" disabled={!plan.upgradeAvailable}>
                  {plan.upgradeAvailable ? 'Upgrade to Premium' : 'Coming soon'}
                </button>
                {!plan.upgradeAvailable && <p className="plan-note">Payments aren’t open yet.</p>}
              </div>
            )}
          </PlanCard>
        </div>
      )}
    </main>
  )
}
