export interface RCEntitlement {
  expires_date: string | null
  product_identifier: string
}

export interface RCSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RCEntitlement>
    subscriptions: Record<string, { expires_date: string | null }>
  }
}

export async function getRCSubscriber(appUserId: string): Promise<RCSubscriberResponse> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.REVENUECAT_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      // Sem cache — precisamos do estado atual
      cache: "no-store",
    }
  )
  if (!res.ok) {
    throw new Error(`RevenueCat API error: ${res.status}`)
  }
  return res.json() as Promise<RCSubscriberResponse>
}

export function hasActiveEntitlement(
  data: RCSubscriberResponse,
  entitlement = "premium"
): boolean {
  const ent = data.subscriber.entitlements[entitlement]
  if (!ent) return false
  if (ent.expires_date === null) return true // vitalício
  return new Date(ent.expires_date) > new Date()
}
