import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Video, Phone, Calendar, Clock, Tag } from "lucide-react";
import { format } from "date-fns";

type Slot = { id: string; label: string; sort_order: number; active: boolean };
type Consultation = {
  id: string;
  customer_name: string;
  phone: string;
  category: string | null;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const AdminVideoConsultations = () => {
  const qc = useQueryClient();
  const [newSlot, setNewSlot] = useState("");

  const slotsQ = useQuery({
    queryKey: ["admin-vc-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_consultation_slots")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const consultsQ = useQuery({
    queryKey: ["admin-vc-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_consultations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Consultation[];
    },
    refetchInterval: 30_000,
  });

  const addSlot = async () => {
    const label = newSlot.trim();
    if (!label) return;
    const nextSort = ((slotsQ.data ?? []).at(-1)?.sort_order ?? 0) + 10;
    const { error } = await supabase.from("video_consultation_slots").insert({ label, sort_order: nextSort });
    if (error) return toast.error(error.message);
    setNewSlot("");
    toast.success("Slot added");
    qc.invalidateQueries({ queryKey: ["admin-vc-slots"] });
  };

  const toggleSlot = async (s: Slot) => {
    const { error } = await supabase.from("video_consultation_slots").update({ active: !s.active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-vc-slots"] });
  };

  const deleteSlot = async (s: Slot) => {
    if (!confirm(`Delete slot "${s.label}"?`)) return;
    const { error } = await supabase.from("video_consultation_slots").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Slot removed");
    qc.invalidateQueries({ queryKey: ["admin-vc-slots"] });
  };

  const setStatus = async (c: Consultation, status: string) => {
    const { error } = await supabase.from("video_consultations").update({ status }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-vc-list"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Video Consultations</h1>
          <p className="text-xs text-muted-foreground">Review requests and manage available time slots.</p>
        </div>
      </div>

      {/* Slot management */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold mb-3">Time Slots</h2>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="e.g. 08:00 PM - 08:30 PM"
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSlot()}
            className="max-w-xs"
          />
          <Button onClick={addSlot}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {slotsQ.isLoading ? (
          <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(slotsQ.data ?? []).map((s) => (
              <div key={s.id} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${s.active ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-70"}`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={s.active} onCheckedChange={() => toggleSlot(s)} />
                  <button onClick={() => deleteSlot(s)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Requests */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <h2 className="font-semibold mb-3">Requests</h2>
        {consultsQ.isLoading ? (
          <div className="text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" /> Loading…</div>
        ) : (consultsQ.data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No consultation requests yet.</div>
        ) : (
          <div className="space-y-2">
            {(consultsQ.data ?? []).map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c.customer_name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.preferred_date}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {c.preferred_time}</span>
                      {c.category && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" /> {c.category}</span>}
                    </div>
                    {c.notes && <div className="text-xs mt-2 text-slate-600">"{c.notes}"</div>}
                    <div className="text-[10px] text-slate-400 mt-1">Received {format(new Date(c.created_at), "PPp")}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(c, st)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border capitalize ${
                          c.status === st
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] px-2.5 py-1 rounded-full border bg-emerald-500 text-white border-emerald-500"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminVideoConsultations;
