import LandingArchitecture from '@/components/landing/LandingArchitecture'
import LandingCta from '@/components/landing/LandingCta'
import LandingHero from '@/components/landing/LandingHero'
import LandingHowItWorks from '@/components/landing/LandingHowItWorks'
import LandingNav from '@/components/landing/LandingNav'
import LandingQuickStart from '@/components/landing/LandingQuickStart'
import LandingSdkReference from '@/components/landing/LandingSdkReference'
import LandingX402 from '@/components/landing/LandingX402'

export default function LandingPageClient() {
  return (
    <div className="min-h-screen text-white">
      <LandingNav />
      <LandingHero />
      <LandingHowItWorks />
      <LandingQuickStart />
      <LandingSdkReference />
      <LandingArchitecture />
      <LandingX402 />
      <LandingCta />
    </div>
  )
}
