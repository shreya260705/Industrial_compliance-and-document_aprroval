import React from 'react';
import { LandingHeader } from '../components/landing/LandingHeader';
import { HeroSection } from '../components/landing/HeroSection';
import { StatsSection } from '../components/landing/StatsSection';
import { NationalCoverageSection } from '../components/landing/NationalCoverageSection';
import { PlatformCapabilitiesSection } from '../components/landing/PlatformCapabilitiesSection';
import { IndustrialSectorsSection } from '../components/landing/IndustrialSectorsSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { AuthorityTiersSection } from '../components/landing/AuthorityTiersSection';
import { EnterpriseShowcaseSection } from '../components/landing/EnterpriseShowcaseSection';
import { SchemesShowcaseSection } from '../components/landing/SchemesShowcaseSection';
import { TrustDisclaimerSection } from '../components/landing/TrustDisclaimerSection';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream text-brand-charcoal selection:bg-brand-sage/30">
      {/* 1. Header with Prototype Banner and Navigation */}
      <LandingHeader />

      {/* Main Public Experience */}
      <main className="flex-1">
        {/* 2. Impressive Two-Column Hero with India Industrial Map */}
        <HeroSection />

        {/* 3. Truthful Data-Backed Platform Statistics */}
        <StatsSection />

        {/* 4. Interactive National Coverage (28 States & 8 UTs) */}
        <NationalCoverageSection />

        {/* 5. Core Platform Capabilities (8 Cards) */}
        <PlatformCapabilitiesSection />

        {/* 6. Industrial Sectors Grid (8 Sectors) */}
        <IndustrialSectorsSection />

        {/* 7. How BizPermit Works (5-Step Lifecycle Journey) */}
        <HowItWorksSection />

        {/* 8. Central, State & Local Three-Tier Authority Structure */}
        <AuthorityTiersSection />

        {/* 9. Multi-Location Enterprise Case Study (Horizon AutoTech) */}
        <EnterpriseShowcaseSection />

        {/* 10. Government Schemes & Financial Incentives Engine */}
        <SchemesShowcaseSection />

        {/* 11. Statutory Integrity, Data Classification & Legal Disclaimer */}
        <TrustDisclaimerSection />
      </main>

      {/* 12. Professional National Industrial Compliance Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
