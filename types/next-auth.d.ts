import "next-auth"
import { SubscriptionStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      subscriptionStatus: SubscriptionStatus
      subscriptionPeriodEnd: Date | null
      trialStart: Date | null
    }
  }

  interface User {
    subscriptionStatus: SubscriptionStatus
    subscriptionPeriodEnd: Date | null
    trialStart: Date | null
  }
}
