import { LandingAuthProvider } from '@/components/landing/LandingAuthContext';
import { LandingAuthModal } from '@/components/landing/LandingAuthModal';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { WhySection } from '@/components/landing/WhySection';
import { PlansSection } from '@/components/landing/PlansSection';
import { LevelsSection } from '@/components/landing/LevelsSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ReferralProgramSection } from '@/components/landing/ReferralProgramSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { CtaFooter } from '@/components/landing/CtaFooter';

export default function LandingPage() {
  return (
    <LandingAuthProvider>
      <main className="bg-[#080C0A]">
        <LandingNav />
        <HeroSection />
        <WhySection />
        <PlansSection />
        <LevelsSection />
        <HowItWorksSection />
        <ReferralProgramSection />
        <FaqSection />
        <CtaFooter />
      </main>
      <LandingAuthModal />
    </LandingAuthProvider>
  );
}
