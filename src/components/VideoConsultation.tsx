import { useEffect, useState } from "react";
import { Video, X, Loader2, CheckCircle2, Calendar, Clock, Phone, User, Tag, MessageSquare } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { site } from "@/config/site";
import { content } from "@/config/content";

const CATEGORIES = [
  "Bridal Sarees",
  "Banarasi Silk",
  "Kanjeevaram Silk",
  "Tussar Silk",
  "Tripura Handloom",
  "Cotton & Linen Sarees",
  "Designer & Party Wear",
  "Festive Collection",
  "Blouse Styling",
];

const DEFAULT_TIME_SLOTS = [
  "10:00 AM - 10:30 AM",
  "11:00 AM - 11:30 AM",
  "12:00 PM - 12:30 PM",
  "01:00 PM - 01:30 PM",
  "03:00 PM - 03:30 PM",
  "04:00 PM - 04:30 PM",
  "05:00 PM - 05:30 PM",
  "06:00 PM - 06:30 PM",
  "07:00 PM - 07:30 PM",
];

const WHATSAPP_NUMBER = site.contact.whatsapp;

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),

  category: z.string().min(1, "Please pick a collection"),
  preferred_date: z.string().min(1, "Please select a date"),
  preferred_time: z.string().min(1, "Please pick a time slot"),
  notes: z.string().max(500).optional(),
});

type BookingForm = z.infer<typeof bookingSchema>;

const initialForm: BookingForm = {
  customer_name: "",
  phone: "",
  category: "",
  preferred_date: "",
  preferred_time: "",
  notes: "",
};

const todayISO = () => format(new Date(), "yyyy-MM-dd");

const parseSlotStartMinutes = (label: string): number => {
  const m = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + parseInt(m[2], 10);
};

const sortByStartTime = (labels: string[]) =>
  [...labels].sort((a, b) => parseSlotStartMinutes(a) - parseSlotStartMinutes(b));


export const VideoConsultation = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<BookingForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingForm, string>>>({});
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("video_consultation_slots")
      .select("label,sort_order,active")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (cancelled) return;
        const labels = (data ?? []).map((r: any) => r.label).filter(Boolean);
        if (labels.length > 0) setTimeSlots(sortByStartTime(labels));
      });
    return () => { cancelled = true; };
  }, [open]);


  useEffect(() => {
    const openDialog = () => setOpen(true);
    window.addEventListener("store:open-video-consultation", openDialog);
    return () => window.removeEventListener("store:open-video-consultation", openDialog);
  }, []);

  const update = <K extends keyof BookingForm>(key: K, value: BookingForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const reset = () => {
    setForm(initialForm);
    setErrors({});
    setSuccess(false);
  };

  const handleClose = (next: boolean) => {
    setOpen(next);
    if (!next) setTimeout(reset, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bookingSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrs: Partial<Record<keyof BookingForm, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const k = issue.path[0] as keyof BookingForm;
        if (!fieldErrs[k]) fieldErrs[k] = issue.message;
      });
      setErrors(fieldErrs);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("video_consultations").insert({
      user_id: user?.id ?? null,
      customer_name: parsed.data.customer_name,
      phone: parsed.data.phone,
      category: parsed.data.category,
      preferred_date: parsed.data.preferred_date,
      preferred_time: parsed.data.preferred_time,
      notes: parsed.data.notes || null,
    });
    setSubmitting(false);

    if (error) {
      console.error(error);
      toast.error("Could not submit booking", { description: error.message });
      return;
    }

    setSuccess(true);
    toast.success("Video consultation booked!", {
      description: "Our stylist will contact you shortly.",
    });
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `${content.whatsapp.videoBooking}\n\n` +
        `Name: ${form.customer_name}\n` +
        `Phone: +91 ${form.phone}\n` +
        `Collection: ${form.category}\n` +
        `Date: ${form.preferred_date}\n` +
        `Time: ${form.preferred_time}` +
        (form.notes ? `\nNotes: ${form.notes}` : ""),
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white p-6 pb-7">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-lg font-display font-bold text-white">
                    Book Video Consultation
                  </DialogTitle>
                  <DialogDescription className="text-white/85 text-xs">
                    Personal styling session with our experts
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleClose(false)}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {success ? (
              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <h3 className="font-display text-xl font-bold">You're booked!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Our stylist will reach you on{" "}
                  <span className="font-semibold text-foreground">+91 {form.phone}</span> at your chosen
                  slot.
                </p>
                <div className="bg-muted/40 rounded-xl p-3 mt-4 text-left text-xs space-y-1">
                  <p><span className="text-muted-foreground">Date:</span> <span className="font-semibold">{form.preferred_date}</span></p>
                  <p><span className="text-muted-foreground">Time:</span> <span className="font-semibold">{form.preferred_time}</span></p>
                  <p><span className="text-muted-foreground">Collection:</span> <span className="font-semibold">{form.category}</span></p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <Button
                    type="button"
                    onClick={openWhatsApp}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                  >
                    Notify on WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClose(false)}
                    className="flex-1 rounded-full"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Customer Name" icon={<User className="w-3.5 h-3.5" />} error={errors.customer_name}>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => update("customer_name", e.target.value)}
                    placeholder="Jane Doe"
                    maxLength={80}
                    className="rounded-lg"
                  />
                </Field>

                <Field label="Phone Number" icon={<Phone className="w-3.5 h-3.5" />} error={errors.phone}>
                  <div className="flex items-stretch rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                    <span className="inline-flex items-center px-3 text-sm font-medium text-muted-foreground bg-muted/60 border-r border-input select-none">
                      +91
                    </span>
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      inputMode="numeric"
                      maxLength={10}
                      className="flex-1 h-10 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </Field>


                <Field label="Preferred Collection" icon={<Tag className="w-3.5 h-3.5" />} error={errors.category}>
                  <Select value={form.category} onValueChange={(v) => update("category", v)}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="Choose a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Preferred Date" icon={<Calendar className="w-3.5 h-3.5" />} error={errors.preferred_date}>
                    <Input
                      type="date"
                      min={todayISO()}
                      value={form.preferred_date}
                      onChange={(e) => update("preferred_date", e.target.value)}
                      className="rounded-lg"
                    />
                  </Field>

                  <Field label="Time Slot" icon={<Clock className="w-3.5 h-3.5" />} error={errors.preferred_time}>
                    <Select value={form.preferred_time} onValueChange={(v) => update("preferred_time", v)}>
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="Pick a slot" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 overflow-y-auto">
                        {timeSlots.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>

                    </Select>
                  </Field>
                </div>

                <Field label="Notes (optional)" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Anything specific you'd like us to prepare?"
                    rows={2}
                    maxLength={500}
                    className="rounded-lg resize-none"
                  />
                </Field>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-semibold shadow-lg hover:shadow-xl hover:brightness-110 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Booking…
                    </>
                  ) : (
                    "Book Consultation"
                  )}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Free 30-min styling session · No obligations
                </p>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Field = ({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
      <span className="text-primary">{icon}</span>
      {label}
    </Label>
    {children}
    {error && <p className="text-[11px] text-destructive">{error}</p>}
  </div>
);
