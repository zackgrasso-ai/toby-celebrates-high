import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Send, Check, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getGoogleCalendarUrl, downloadICSFile, downloadAppleCalendar } from "@/lib/calendar";
import { validatePhoneNumber, formatPhoneNumber, getPhoneErrorMessage } from "@/lib/phoneValidation";

interface Guest {
  id: string;
  name: string;
  phone: string;
}

const RSVPSection = () => {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
    if (field === "phone") {
      // Format phone number for guests too
      const formatted = formatPhoneNumber(value);
      setGuests(
        guests.map((g) => (g.id === id ? { ...g, [field]: formatted } : g))
      );
    } else {
      setGuests(
        guests.map((g) => (g.id === id ? { ...g, [field]: value } : g))
      );
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhone(formatted);
    
    // Validate in real-time
    if (formatted.trim()) {
      const error = getPhoneErrorMessage(formatted);
      setPhoneError(error);
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Please fill in your name and phone number");
      return;
    }

    // Validate phone number
    const phoneErrorMsg = getPhoneErrorMessage(phone);
    if (phoneErrorMsg) {
      setPhoneError(phoneErrorMsg);
      toast.error(phoneErrorMsg);
      return;
    }

    // Validate guest info if any guests added
    const invalidGuests = guests.filter(g => {
      if (!g.name.trim() || !g.phone.trim()) return true;
      const guestPhoneError = getPhoneErrorMessage(g.phone);
      return !!guestPhoneError;
    });
    
    if (invalidGuests.length > 0) {
      toast.error("Please fill in all guest information with valid phone numbers");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Insert main RSVP record
      const { data: rsvpData, error: rsvpError } = await supabase
        .from("rsvps")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .select()
        .single();

      if (rsvpError) {
        throw rsvpError;
      }

      // Insert guests if any
      if (guests.length > 0 && rsvpData) {
        const guestRecords = guests.map((guest) => ({
          rsvp_id: rsvpData.id,
          name: guest.name.trim(),
          phone: guest.phone.trim(),
        }));

        const { error: guestsError } = await supabase
          .from("rsvp_guests")
          .insert(guestRecords);

        if (guestsError) {
          // If guest insert fails, we could optionally delete the main RSVP
          // For now, we'll just show an error but keep the main RSVP
          throw new Error(
            `RSVP saved but failed to save guests: ${guestsError.message}`
          );
        }
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("RSVP submitted successfully! 🎉");
    } catch (error) {
      console.error("Error submitting RSVP:", error);
      setIsSubmitting(false);
      toast.error(
        error instanceof Error
          ? `Failed to submit RSVP: ${error.message}`
          : "Failed to submit RSVP. Please try again."
      );
    }
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
            <p className="text-muted-foreground mb-6">
              Thank you for your RSVP, {fullName}! We can't wait to celebrate with you
              {guests.length > 0 && ` and your ${guests.length} guest${guests.length > 1 ? 's' : ''}`}.
            </p>
            
            {/* Add to Calendar Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-gold-gradient text-primary-foreground border-primary/50 hover:opacity-90 transition-all"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Calendar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem
                  onClick={() => {
                    window.open(getGoogleCalendarUrl(), "_blank");
                  }}
                  className="cursor-pointer"
                >
                  <span>Google Calendar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    downloadAppleCalendar();
                    toast.success("Calendar file downloaded! Open it to add to Apple Calendar.");
                  }}
                  className="cursor-pointer"
                >
                  <span>Apple Calendar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    downloadICSFile();
                    toast.success("Calendar file downloaded!");
                  }}
                  className="cursor-pointer"
                >
                  <span>Download ICS File</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`bg-secondary/50 border-border focus:border-primary ${
                    phoneError ? "border-destructive focus:border-destructive" : ""
                  }`}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? "phone-error" : undefined}
                />
                {phoneError && (
                  <p id="phone-error" className="text-sm text-destructive">
                    {phoneError}
                  </p>
                )}
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
                    <div className="space-y-1">
                      <Input
                        type="tel"
                        placeholder="Guest's phone number"
                        value={guest.phone}
                        onChange={(e) => updateGuest(guest.id, "phone", e.target.value)}
                        className={`bg-secondary/50 border-border focus:border-primary ${
                          guest.phone.trim() && getPhoneErrorMessage(guest.phone)
                            ? "border-destructive focus:border-destructive"
                            : ""
                        }`}
                      />
                      {guest.phone.trim() && getPhoneErrorMessage(guest.phone) && (
                        <p className="text-xs text-destructive">
                          {getPhoneErrorMessage(guest.phone)}
                        </p>
                      )}
                    </div>
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
