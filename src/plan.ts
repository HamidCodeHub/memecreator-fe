import { useCallback, useEffect, useState } from 'react'
import { ApiError, fetchPlan, PLAN_CHANGED, type PlanInfo } from './api'

/** The signed-in person's plan and today's prompts; refreshed whenever a set is made or the limit is hit. */
export function usePlan(onSignedOut: () => void): PlanInfo | null {
  const [plan, setPlan] = useState<PlanInfo | null>(null)

  const load = useCallback(() => {
    fetchPlan()
      .then(setPlan)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) onSignedOut()
        // otherwise keep what we had: the server still enforces the limit
      })
  }, [onSignedOut])

  useEffect(() => {
    load()
    window.addEventListener(PLAN_CHANGED, load)
    return () => window.removeEventListener(PLAN_CHANGED, load)
  }, [load])

  return plan
}

export function planChanged() {
  window.dispatchEvent(new Event(PLAN_CHANGED))
}
