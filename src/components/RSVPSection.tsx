import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Send, Check, Users } from "lucide-react";
import { toast } from "sonner";

interface Guest {
  id: string;
  name: string;
  phone: string;
}

const RSVPSection = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const addGuest = () => {
    setGuests([...guests, { id: crypto.randomUUID(), name: "", phone: "" }]);
  };

  const removeGuest = (id: string) => {
    setGuests(guests.filter((g) => g.id !== id));
  };

  const updateGuest = (id: string, field: "name" | "phone", value: string) => {
    setGuests(
      guests.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Please fill in your name and phone number");
      return;
    }

    // Validate guest info if any guests added
    const invalidGuests = guests.filter(g => !g.name.trim() || !g.phone.trim());
    if (invalidGuests.length > 0) {
      toast.error("Please fill in all guest information");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("RSVP submitted successfully! 🎉");
  };

  if (isSubmitted) {
    return (
      <section id="rsvp" className="py-24 relative">
        <div className="section-container">
          <div className="glass-card max-w-xl mx-auto p-12 text-center">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-3xl font-bold mb-4">
              See You There!
            </h3>
            <p className="text-muted-foreground">
              Thank you for your RSVP, {fullName}! We can't wait to celebrate with you
              {guests.length > 0 && ` and your ${guests.length} guest${guests.length > 1 ? 's' : ''}`}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className="py-24 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="section-container relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4 block">
            Will You Join Us?
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="gold-text">RSVP</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Let us know you're coming and if you're bringing any guests.
          </p>
        </div>

        {/* RSVP Form */}
        <form onSubmit={handleSubmit} className="glass-card max-w-xl mx-auto p-8 md:p-10">
          <div className="space-y-6">
            {/* Main attendee */}
            <div className="space-y-4">
              <h3 className="font-display text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Your Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+31 6 12345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Additional guests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold">
                  Additional Guests
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGuest}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Guest
                </Button>
              </div>

              {guests.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Coming solo? That's great! Click "Add Guest" if you'd like to bring someone.
                </p>
              )}

              {guests.map((guest, index) => (
                <div
                  key={guest.id}
                  className="p-4 bg-secondary/30 rounded-lg space-y-3 relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Guest {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGuest(guest.id)}
                      className="text-destructive hover:text-destructive/80 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Guest's full name"
                      value={guest.name}
                      onChange={(e) => updateGuest(guest.id, "name", e.target.value)}
                      className="bg-secondary/50 border-border focus:border-primary"
                    />
                    <Input
                      type="tel"
                      placeholder="Guest's phone number"
                      value={guest.phone}
                      onChange={(e) => updateGuest(guest.id, "phone", e.target.value)}
                      className="bg-secondary/50 border-border focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gold-gradient text-primary-foreground font-semibold py-6 text-lg hover:opacity-90 transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Submit RSVP
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RSVPSection;
