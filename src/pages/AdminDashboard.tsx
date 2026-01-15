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
  UserPlus
} from "lucide-react";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [rsvps, setRsvps] = useState<(RSVP & { guests: RSVPGuest[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingGuest, setUpdatingGuest] = useState<string | null>(null);

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

  const pendingRSVPs = rsvps.filter((rsvp) => rsvp.status === "pending");
  const approvedRSVPs = rsvps.filter((rsvp) => rsvp.status === "approved");
  const rejectedRSVPs = rsvps.filter((rsvp) => rsvp.status === "rejected");

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

        {/* RSVP List */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending ({pendingRSVPs.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({approvedRSVPs.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({rejectedRSVPs.length})
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
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : rejectedRSVPs.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rejected RSVPs
                </CardContent>
              </Card>
            ) : (
              rejectedRSVPs.map((rsvp) => (
                <RSVPCard
                  key={rsvp.id}
                  rsvp={rsvp}
                  onApprove={() => updateRSVPStatus(rsvp.id, "approved")}
                  onReject={() => updateRSVPStatus(rsvp.id, "rejected")}
                  onGuestApprove={(guestId) => updateGuestStatus(guestId, "approved")}
                  onGuestReject={(guestId) => updateGuestStatus(guestId, "rejected")}
                  updating={updating === rsvp.id}
                  updatingGuest={updatingGuest}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
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
}

const RSVPCard = ({ rsvp, onApprove, onReject, onGuestApprove, onGuestReject, updating, updatingGuest }: RSVPCardProps) => {
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

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl">{rsvp.full_name}</CardTitle>
              {getStatusBadge(rsvp.status)}
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
                        <span className="font-medium">{guest.name}</span>
                        {getStatusBadge(guest.status)}
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
