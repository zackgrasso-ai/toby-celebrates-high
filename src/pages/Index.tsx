import HeroSection from "@/components/HeroSection";
import VenueSection from "@/components/VenueSection";
import RSVPSection from "@/components/RSVPSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <VenueSection />
      <RSVPSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
