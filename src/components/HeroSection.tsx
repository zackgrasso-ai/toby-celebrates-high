import { Sparkles, MapPin, Calendar, Clock } from "lucide-react";
import amsterdamSkyline from "@/assets/amsterdam-skyline.jpg";
import CountdownTimer from "./CountdownTimer";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background images */}
      <div className="absolute inset-0">
        <img 
          src={amsterdamSkyline} 
          alt="Amsterdam skyline at night" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
      
      <div className="relative z-10 section-container text-center py-20">
        {/* Pre-title */}
        <div className="animate-fade-up flex items-center justify-center gap-2 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-primary uppercase tracking-[0.3em] text-sm font-medium">
            You're Invited
          </span>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>

        {/* Main title */}
        <h1 className="animate-fade-up font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-6 gold-glow">
          <span className="text-foreground">Toby's</span>
          <br />
          <span className="gold-text">22nd Birthday</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-12 font-light leading-relaxed" style={{ animationDelay: "0.2s" }}>
          Join us for an unforgettable evening of celebration, stunning views, and great company at Amsterdam's most iconic rooftop venue.
        </p>

        {/* Event details cards */}
        <div className="animate-fade-up grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12" style={{ animationDelay: "0.4s" }}>
          <div className="glass-card p-6 group hover:border-primary/50 transition-all duration-300">
            <Calendar className="w-6 h-6 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-foreground font-medium">February 21st, 2025</p>
            <p className="text-muted-foreground text-sm">Friday Evening</p>
          </div>
          
          <div className="glass-card p-6 group hover:border-primary/50 transition-all duration-300">
            <MapPin className="w-6 h-6 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-foreground font-medium">A'DAM Lookout</p>
            <p className="text-muted-foreground text-sm">18th Floor, Adam Tower</p>
          </div>
          
          <div className="glass-card p-6 group hover:border-primary/50 transition-all duration-300">
            <Clock className="w-6 h-6 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <p className="text-foreground font-medium">21:00 - 03:00</p>
            <p className="text-muted-foreground text-sm">Party all night</p>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="animate-fade-up mb-12" style={{ animationDelay: "0.5s" }}>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-4">Countdown to the celebration</p>
          <CountdownTimer />
        </div>

        {/* CTA Button */}
        <a 
          href="#rsvp" 
          className="animate-fade-up inline-flex items-center gap-2 bg-gold-gradient text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-primary/25"
          style={{ animationDelay: "0.7s" }}
        >
          RSVP Now
          <Sparkles className="w-5 h-5" />
        </a>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse-slow">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
