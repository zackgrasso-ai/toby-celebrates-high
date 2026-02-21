import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { RSVP, RSVPGuest } from "@/types/database";
import { toast } from "sonner";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
import { 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Phone,
  RefreshCw,
  UserPlus,
  MessageSquarePlus,
  CheckSquare,
  Square,
  Send
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rsvps, setRsvps] = useState<(RSVP & { guests: RSVPGuest[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingGuest, setUpdatingGuest] = useState<string | null>(null);
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showPhoneNumbersDialog, setShowPhoneNumbersDialog] = useState(false);
  const [phoneNumbersList, setPhoneNumbersList] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [delayBetweenMessages, setDelayBetweenMessages] = useState<number>(15);

  const fetchRSVPs = async () => {
    setLoading(true);
    try {
      // Fetch all RSVPs with their guests
      const { data: rsvpsData, error: rsvpsError } = await supabase
        .from("rsvps")
        .select("*")
        .order("created_at", { ascending: false });

      if (rsvpsError) throw rsvpsError;

      // Fetch all guests
      const { data: guestsData, error: guestsError } = await supabase
        .from("rsvp_guests")
        .select("*");

      if (guestsError) throw guestsError;

      // Combine RSVPs with their guests
      const rsvpsWithGuests = rsvpsData.map((rsvp) => ({
        ...rsvp,
        guests: guestsData.filter((guest) => guest.rsvp_id === rsvp.id),
      }));

      setRsvps(rsvpsWithGuests);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      toast.error("Failed to load RSVPs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRSVPs();
  }, []);

  // Helper function to send WhatsApp notification
  const sendWhatsAppNotification = async (
    type: "rsvp" | "guest",
    id: string,
    name: string,
    phone: string,
    status: "approved" | "rejected",
    oldStatus?: string
  ) => {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-whatsapp-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            type,
            id,
            name,
            phone,
            status,
            old_status: oldStatus,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("WhatsApp notification error:", errorData);
        // Don't throw - we don't want to fail the status update if notification fails
      }
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
      // Don't throw - we don't want to fail the status update if notification fails
    }
  };

  const updateRSVPStatus = async (rsvpId: string, status: "approved" | "rejected") => {
    setUpdating(rsvpId);
    try {
      // Find the RSVP to get current data
      const currentRSVP = rsvps.find((rsvp) => rsvp.id === rsvpId);
      const oldStatus = currentRSVP?.status;

      const { error } = await supabase
        .from("rsvps")
        .update({ status })
        .eq("id", rsvpId);

      if (error) throw error;

      // Update local state
      setRsvps((prev) =>
        prev.map((rsvp) =>
          rsvp.id === rsvpId ? { ...rsvp, status } : rsvp
        )
      );

      toast.success(`RSVP ${status === "approved" ? "approved" : "rejected"}!`);

      // Send WhatsApp notification immediately
      if (currentRSVP) {
        await sendWhatsAppNotification(
          "rsvp",
          rsvpId,
          currentRSVP.full_name,
          currentRSVP.phone,
          status,
          oldStatus
        );
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast.error("Failed to update RSVP status");
    } finally {
      setUpdating(null);
    }
  };

  const updateGuestStatus = async (guestId: string, status: "approved" | "rejected") => {
    setUpdatingGuest(guestId);
    try {
      // Find the guest to get current data
      let currentGuest: RSVPGuest | undefined;
      for (const rsvp of rsvps) {
        const guest = rsvp.guests.find((g) => g.id === guestId);
        if (guest) {
          currentGuest = guest;
          break;
        }
      }
      const oldStatus = currentGuest?.status;

      const { error } = await supabase
        .from("rsvp_guests")
        .update({ status })
        .eq("id", guestId);

      if (error) throw error;

      // Update local state
      setRsvps((prev) =>
        prev.map((rsvp) => ({
          ...rsvp,
          guests: rsvp.guests.map((guest) =>
            guest.id === guestId ? { ...guest, status } : guest
          ),
        }))
      );

      toast.success(`Guest ${status === "approved" ? "approved" : "rejected"}!`);

      // Send WhatsApp notification immediately
      if (currentGuest) {
        await sendWhatsAppNotification(
          "guest",
          guestId,
          currentGuest.name,
          currentGuest.phone,
          status,
          oldStatus
        );
      }
    } catch (error) {
      console.error("Error updating guest:", error);
      toast.error("Failed to update guest status");
    } finally {
      setUpdatingGuest(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  // Toggle selection for a person
  const togglePersonSelection = (personId: string, type: 'rsvp' | 'guest') => {
    const id = `${type}-${personId}`;
    setSelectedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select or deselect all people
  const toggleSelectAll = () => {
    // Get all possible IDs
    const allIds = new Set<string>();
    
    rsvps.forEach((rsvp) => {
      allIds.add(`rsvp-${rsvp.id}`);
      rsvp.guests.forEach((guest) => {
        allIds.add(`guest-${guest.id}`);
      });
    });

    // If all are selected, deselect all. Otherwise, select all.
    const allSelected = allIds.size > 0 && Array.from(allIds).every(id => selectedPeople.has(id));
    
    if (allSelected) {
      setSelectedPeople(new Set());
    } else {
      setSelectedPeople(new Set(allIds));
    }
  };

  // Check if all people are selected
  const areAllSelected = () => {
    const allIds = new Set<string>();
    
    rsvps.forEach((rsvp) => {
      allIds.add(`rsvp-${rsvp.id}`);
      rsvp.guests.forEach((guest) => {
        allIds.add(`guest-${guest.id}`);
      });
    });

    return allIds.size > 0 && Array.from(allIds).every(id => selectedPeople.has(id));
  };

  // Get all selected people with their details
  const getSelectedPeopleDetails = () => {
    const selected: Array<{ name: string; phone: string }> = [];
    
    rsvps.forEach((rsvp) => {
      const rsvpId = `rsvp-${rsvp.id}`;
      if (selectedPeople.has(rsvpId)) {
        selected.push({ name: rsvp.full_name, phone: rsvp.phone });
      }
      
      rsvp.guests.forEach((guest) => {
        const guestId = `guest-${guest.id}`;
        if (selectedPeople.has(guestId)) {
          selected.push({ name: guest.name, phone: guest.phone });
        }
      });
    });
    
    return selected;
  };

  // Show phone numbers dialog for manual copying
  const showPhoneNumbers = () => {
    const selected = getSelectedPeopleDetails();
    
    if (selected.length === 0) {
      toast.error("Please select at least one person");
      return;
    }

    // Format phone numbers - one per line, with name
    const formattedNumbers = selected.map(p => {
      // Format phone number (ensure it starts with +)
      let phone = p.phone.trim();
      if (!phone.startsWith('+')) {
        phone = '+' + phone.replace(/\D/g, '');
      }
      return `${phone}`;
    }).join('\n');

    // Also create a version with just numbers (no names) for easy copying
    const justNumbers = selected.map(p => {
      let phone = p.phone.trim();
      if (!phone.startsWith('+')) {
        phone = '+' + phone.replace(/\D/g, '');
      }
      return phone;
    }).join('\n');

    setPhoneNumbersList(justNumbers);
    setShowPhoneNumbersDialog(true);
    setCopied(false);
  };

  // Copy phone numbers to clipboard
  const copyPhoneNumbers = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumbersList);
      setCopied(true);
      toast.success("Phone numbers copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  // Send party reminder
  const sendPartyReminder = async (testMode: boolean = false) => {
    setSendingReminder(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-party-reminder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ 
            testMode,
            delayBetweenMessages: delayBetweenMessages
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Reminder error:", errorData);
        throw new Error(errorData);
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(
          `Reminders sent! ${result.sent} sent, ${result.failed} failed. Delay: ${result.delayBetweenMessages}s between messages`
        );
        setShowReminderDialog(false);
      } else {
        throw new Error(result.error || "Failed to send reminders");
      }
    } catch (error) {
      console.error("Error sending reminders:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send reminders"
      );
    } finally {
      setSendingReminder(false);
    }
  };

  const pendingRSVPs = rsvps.filter((rsvp) => rsvp.status === "pending");
  const approvedRSVPs = rsvps.filter((rsvp) => rsvp.status === "approved");
  const rejectedRSVPs = rsvps.filter((rsvp) => rsvp.status === "rejected");

  // Calculate reply statuses - include all statuses (approved, rejected, etc.) if they have a reply
  const confirmedRSVPs = rsvps.filter((rsvp) => 
    rsvp.reply_status === "yes"
  );
  const declinedRSVPs = rsvps.filter((rsvp) => 
    rsvp.reply_status === "no"
  );
  
  // Get confirmed and declined guests - include all statuses if they have a reply
  const confirmedGuests = rsvps.flatMap(rsvp => 
    rsvp.guests.filter(guest => guest.reply_status === "yes")
  );
  const declinedGuests = rsvps.flatMap(rsvp => 
    rsvp.guests.filter(guest => guest.reply_status === "no")
  );

  const totalConfirmed = confirmedRSVPs.length + confirmedGuests.length;
  const totalDeclined = declinedRSVPs.length + declinedGuests.length;

  // Calculate totals including all people
  const totalPeople = rsvps.length + rsvps.reduce((sum, rsvp) => sum + rsvp.guests.length, 0);
  const approvedMainRSVPs = rsvps.filter((rsvp) => rsvp.status === "approved").length;
  const approvedGuests = rsvps.reduce(
    (sum, rsvp) => sum + rsvp.guests.filter((guest) => guest.status === "approved").length,
    0
  );
  const totalApprovedAttendees = approvedMainRSVPs + approvedGuests;
  
  // Pending counts
  const pendingMainRSVPs = rsvps.filter((rsvp) => rsvp.status === "pending").length;
  const pendingGuests = rsvps.reduce(
    (sum, rsvp) => sum + rsvp.guests.filter((guest) => guest.status === "pending").length,
    0
  );
  const totalPending = pendingMainRSVPs + pendingGuests;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="section-container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">RSVP Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                disabled={loading || rsvps.length === 0}
              >
                {areAllSelected() ? (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              {selectedPeople.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={showPhoneNumbers}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Get Numbers ({selectedPeople.size})
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowReminderDialog(true)}
                disabled={loading || totalApprovedAttendees === 0}
                className="bg-primary"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Reminder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRSVPs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="section-container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardDescription>Total People</CardDescription>
              <CardTitle className="text-3xl">{totalPeople}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {rsvps.length} main + {rsvps.reduce((sum, rsvp) => sum + rsvp.guests.length, 0)} guests
              </p>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl text-yellow-500">{totalPending}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingMainRSVPs} main + {pendingGuests} guests
              </p>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardDescription>Approved Attendees</CardDescription>
              <CardTitle className="text-3xl text-green-500">{totalApprovedAttendees}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {approvedMainRSVPs} main + {approvedGuests} guests
              </p>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardDescription>Capacity Check</CardDescription>
              <CardTitle className="text-3xl text-primary">{totalApprovedAttendees}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Currently approved
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Reply Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="glass-card border-green-500/20">
            <CardHeader className="pb-3">
              <CardDescription>Confirmed (YES)</CardDescription>
              <CardTitle className="text-3xl text-green-500">{totalConfirmed}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {confirmedRSVPs.length} main + {confirmedGuests.length} guests
              </p>
            </CardHeader>
          </Card>
          <Card className="glass-card border-red-500/20">
            <CardHeader className="pb-3">
              <CardDescription>Declined (NO)</CardDescription>
              <CardTitle className="text-3xl text-red-500">{totalDeclined}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {declinedRSVPs.length} main + {declinedGuests.length} guests
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* RSVP List */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pending">
              Pending ({pendingRSVPs.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedRSVPs.length})
            </TabsTrigger>
            <TabsTrigger value="replies">
              Replies ({totalConfirmed + totalDeclined})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedRSVPs.length + totalDeclined})
            </TabsTrigger>
            <TabsTrigger value="declined">
              Declined ({totalDeclined})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pendingRSVPs.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending RSVPs
                </CardContent>
              </Card>
            ) : (
              pendingRSVPs.map((rsvp) => (
                <RSVPCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                  onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                  onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                  onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                  updating={updating === rsvp.id}
                  updatingGuest={updatingGuest}
                  selectedPeople={selectedPeople}
                  onToggleSelection={togglePersonSelection}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : approvedRSVPs.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approved RSVPs
                </CardContent>
              </Card>
            ) : (
              approvedRSVPs.map((rsvp) => (
                <RSVPCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                  onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                  onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                  onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                  updating={updating === rsvp.id}
                  updatingGuest={updatingGuest}
                  selectedPeople={selectedPeople}
                  onToggleSelection={togglePersonSelection}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="replies" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : totalConfirmed === 0 && totalDeclined === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No replies received yet
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Confirmed Section */}
                {totalConfirmed > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-green-500">
                        Confirmed ({totalConfirmed})
                      </h3>
                    </div>
                    {rsvps
                      .filter(rsvp => rsvp.reply_status === "yes" || rsvp.guests.some(g => g.reply_status === "yes"))
                      .map((rsvp) => (
                        <RSVPCard
                          key={rsvp.id}
                          rsvp={rsvp}
                          onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                          onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                          onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                          onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                          updating={updating === rsvp.id}
                          updatingGuest={updatingGuest}
                          selectedPeople={selectedPeople}
                          onToggleSelection={togglePersonSelection}
                          showReplyStatus={true}
                        />
                      ))}
                  </div>
                )}

                {/* Declined Section */}
                {totalDeclined > 0 && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-red-500">
                        Declined ({totalDeclined})
                      </h3>
                    </div>
                    {rsvps
                      .filter(rsvp => rsvp.reply_status === "no" || rsvp.guests.some(g => g.reply_status === "no"))
                      .map((rsvp) => (
                        <RSVPCard
                          key={rsvp.id}
                          rsvp={rsvp}
                          onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                          onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                          onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                          onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                          updating={updating === rsvp.id}
                          updatingGuest={updatingGuest}
                          selectedPeople={selectedPeople}
                          onToggleSelection={togglePersonSelection}
                          showReplyStatus={true}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rejectedRSVPs.length === 0 && totalDeclined === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rejected RSVPs
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Show declined RSVPs that replied NO */}
                {declinedRSVPs.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-red-500">
                        Declined via Reply ({declinedRSVPs.length})
                      </h3>
                    </div>
                    {declinedRSVPs.map((rsvp) => (
                      <RSVPCard
                        key={rsvp.id}
                        rsvp={rsvp}
                        onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                        onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                        onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                        onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                        updating={updating === rsvp.id}
                        updatingGuest={updatingGuest}
                        selectedPeople={selectedPeople}
                        onToggleSelection={togglePersonSelection}
                        showReplyStatus={true}
                      />
                    ))}
                  </div>
                )}

                {/* Show manually rejected RSVPs */}
                {rejectedRSVPs.filter(rsvp => rsvp.reply_status !== "no").length > 0 && (
                  <div className="space-y-4">
                    {rejectedRSVPs.length > declinedRSVPs.length && (
                      <div className="flex items-center gap-2 mb-4">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-500">
                          Manually Rejected ({rejectedRSVPs.filter(rsvp => rsvp.reply_status !== "no").length})
                        </h3>
                      </div>
                    )}
                    {rejectedRSVPs
                      .filter(rsvp => rsvp.reply_status !== "no")
                      .map((rsvp) => (
                        <RSVPCard
                          key={rsvp.id}
                          rsvp={rsvp}
                          onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                          onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                          onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                          onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                          updating={updating === rsvp.id}
                          updatingGuest={updatingGuest}
                          selectedPeople={selectedPeople}
                          onToggleSelection={togglePersonSelection}
                        />
                      ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="declined" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : totalDeclined === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No declined RSVPs
                </CardContent>
              </Card>
            ) : (
              rsvps
                .filter(rsvp => rsvp.reply_status === "no" || rsvp.guests.some(g => g.reply_status === "no"))
                .map((rsvp) => (
                  <RSVPCard
                    key={rsvp.id}
                    rsvp={rsvp}
                    onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                    onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                    onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                    onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                    updating={updating === rsvp.id}
                    updatingGuest={updatingGuest}
                    selectedPeople={selectedPeople}
                    onToggleSelection={togglePersonSelection}
                    showReplyStatus={true}
                  />
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Phone Numbers Dialog */}
      <Dialog open={showPhoneNumbersDialog} onOpenChange={setShowPhoneNumbersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Phone Numbers ({phoneNumbersList.split('\n').filter(n => n.trim()).length})</DialogTitle>
            <DialogDescription>
              Copy these phone numbers to add them manually to your WhatsApp group. One number per line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <textarea
                readOnly
                value={phoneNumbersList}
                className="w-full h-64 p-4 font-mono text-sm border rounded-md bg-muted resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={(e) => {
                  (e.target as HTMLTextAreaElement).select();
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Click the text area above to select all, or use the copy button below</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPhoneNumbersDialog(false)}
            >
              Close
            </Button>
            <Button onClick={copyPhoneNumbers}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Party Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder to all {totalApprovedAttendees} approved attendees about the party tonight at 21:00.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Send Options:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => sendPartyReminder(false)}
                  disabled={sendingReminder}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-xs">Send Now</span>
                  <span className="text-xs text-muted-foreground">All attendees</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendPartyReminder(true)}
                  disabled={sendingReminder}
                  className="h-auto py-3 flex flex-col items-center gap-1"
                >
                  <Send className="w-5 h-5" />
                  <span className="text-xs">Test Mode</span>
                  <span className="text-xs text-muted-foreground">+31620737097 only</span>
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">Delay Between Messages:</p>
              <p className="text-xs text-muted-foreground mb-2">
                Time to wait between sending each reminder (10-20 seconds)
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={delayBetweenMessages}
                  onChange={(e) => setDelayBetweenMessages(Number(e.target.value))}
                  className="flex-1"
                  disabled={sendingReminder}
                />
                <span className="text-sm font-medium w-12 text-right">
                  {delayBetweenMessages}s
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10s</span>
                <span>20s</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDelayBetweenMessages(10)}
                  disabled={sendingReminder}
                  className="flex-1"
                >
                  10s
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDelayBetweenMessages(15)}
                  disabled={sendingReminder}
                  className="flex-1"
                >
                  15s
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDelayBetweenMessages(20)}
                  disabled={sendingReminder}
                  className="flex-1"
                >
                  20s
                </Button>
              </div>
            </div>

            {sendingReminder && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending reminders with {delayBetweenMessages}s delay between each...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReminderDialog(false)}
              disabled={sendingReminder}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface RSVPCardProps {
  rsvp: RSVP & { guests: RSVPGuest[] };
  onApprove: () => void;
  onReject: () => void;
  onGuestApprove: (guestId: string) => void;
  onGuestReject: (guestId: string) => void;
  updating: boolean;
  updatingGuest: string | null;
  selectedPeople: Set<string>;
  onToggleSelection: (personId: string, type: 'rsvp' | 'guest') => void;
  showReplyStatus?: boolean;
}

const RSVPCard = ({ rsvp, onApprove, onReject, onGuestApprove, onGuestReject, updating, updatingGuest, selectedPeople, onToggleSelection, showReplyStatus = false }: RSVPCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/50">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getReplyBadge = (replyStatus?: string | null, replyReceivedAt?: string | null) => {
    if (!replyStatus) return null;
    
    if (replyStatus === "yes") {
      return (
        <Badge className="bg-green-600/20 text-green-600 border-green-600/50">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Confirmed
          {replyReceivedAt && (
            <span className="ml-1 text-xs">
              ({new Date(replyReceivedAt).toLocaleDateString()})
            </span>
          )}
        </Badge>
      );
    } else if (replyStatus === "no") {
      return (
        <Badge className="bg-red-600/20 text-red-600 border-red-600/50">
          <XCircle className="w-3 h-3 mr-1" />
          Declined
          {replyReceivedAt && (
            <span className="ml-1 text-xs">
              ({new Date(replyReceivedAt).toLocaleDateString()})
            </span>
          )}
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Checkbox
                checked={selectedPeople.has(`rsvp-${rsvp.id}`)}
                onCheckedChange={() => onToggleSelection(rsvp.id, 'rsvp')}
                className="mr-2"
              />
              <CardTitle className="text-xl">{rsvp.full_name}</CardTitle>
              {getStatusBadge(rsvp.status)}
              {showReplyStatus && getReplyBadge(rsvp.reply_status, rsvp.reply_received_at)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{rsvp.phone}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Submitted: {new Date(rsvp.created_at).toLocaleString()}
            </div>
          </div>
          {rsvp.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                onClick={onApprove}
                disabled={updating}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                onClick={onReject}
                disabled={updating}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {rsvp.status !== "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                onClick={onApprove}
                disabled={updating || rsvp.status === "approved"}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                onClick={onReject}
                disabled={updating || rsvp.status === "rejected"}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      {rsvp.guests.length > 0 && (
        <CardContent>
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Guests ({rsvp.guests.length})
              </span>
            </div>
            <div className="space-y-2">
              {rsvp.guests.map((guest) => (
                <div
                  key={guest.id}
                  className="p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Checkbox
                          checked={selectedPeople.has(`guest-${guest.id}`)}
                          onCheckedChange={() => onToggleSelection(guest.id, 'guest')}
                          className="mr-1"
                        />
                        <span className="font-medium">{guest.name}</span>
                        {getStatusBadge(guest.status)}
                        {showReplyStatus && getReplyBadge(guest.reply_status, guest.reply_received_at)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {guest.phone}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-500 hover:bg-green-500/10 h-8 px-2"
                        onClick={() => onGuestApprove(guest.id)}
                        disabled={updatingGuest === guest.id || guest.status === "approved"}
                        title="Approve guest"
                      >
                        {updatingGuest === guest.id ? (
                          <div className="w-3 h-3 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10 h-8 px-2"
                        onClick={() => onGuestReject(guest.id)}
                        disabled={updatingGuest === guest.id || guest.status === "rejected"}
                        title="Reject guest"
                      >
                        {updatingGuest === guest.id ? (
                          <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdminDashboard;
