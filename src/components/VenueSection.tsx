import { Play } from "lucide-react";

const VenueSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="section-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4 block">
            The Venue
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            A'DAM <span className="gold-text">Lookout</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Experience Amsterdam from 100 meters high. A'DAM Lookout offers breathtaking 360° views of the city, 
            making it the perfect backdrop for an unforgettable celebration.
          </p>
        </div>

        {/* Video container */}
        <div className="relative max-w-4xl mx-auto">
          <div className="glass-card p-2 md:p-3 group">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
              {/* YouTube embed */}
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/cFtccQXCGdA?rel=0&modestbranding=1&autoplay=1&mute=1&loop=1&playlist=cFtccQXCGdA"
                title="A'DAM Lookout Amsterdam"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Decorative glow */}
          <div className="absolute -inset-4 bg-primary/5 rounded-2xl blur-2xl -z-10" />
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
          {[
            { number: "100m", label: "Above ground" },
            { number: "360°", label: "Panoramic views" },
            { number: "18th", label: "Floor" },
            { number: "✨", label: "Iconic venue" },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="font-display text-3xl md:text-4xl gold-text font-bold mb-1">
                {item.number}
              </div>
              <div className="text-muted-foreground text-sm">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VenueSection;
