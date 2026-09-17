import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler, Scissors, Shirt } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/resolveImage";

type Gender = string;

interface SizeGuideDialogProps {
  trigger: ReactNode;
  gender?: Gender;
  categorySlug?: string;
  currentSize?: string;
  /** Optional brand size guide id to load from the size_guides table */
  sizeGuideId?: string | null;
}

// Default readymade-blouse chart (inches), used when no brand guide is linked.
const blouseRows = [
  { size: "32", bust: "32", waist: "26", shoulder: "13.5", armhole: "15" },
  { size: "34", bust: "34", waist: "28", shoulder: "14", armhole: "15.5" },
  { size: "36", bust: "36", waist: "30", shoulder: "14.5", armhole: "16" },
  { size: "38", bust: "38", waist: "32", shoulder: "15", armhole: "17" },
  { size: "40", bust: "40", waist: "34", shoulder: "15.5", armhole: "18" },
  { size: "42", bust: "42", waist: "36", shoulder: "16", armhole: "19" },
  { size: "44", bust: "44", waist: "38", shoulder: "16.5", armhole: "20" },
];

type BrandGuide = {
  id: string;
  brand: string;
  title: string;
  notes: string | null;
  image_url: string | null;
  measurements: Array<Record<string, string | number>>;
};

export const SizeGuideDialog = ({ trigger, gender = "", categorySlug = "", currentSize, sizeGuideId }: SizeGuideDialogProps) => {
  const audience = "Blouse";

  const { data: guide } = useQuery({
    queryKey: ["size-guide", sizeGuideId],
    enabled: !!sizeGuideId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("size_guides")
        .select("id, brand, title, notes, image_url, measurements")
        .eq("id", sizeGuideId!)
        .maybeSingle();
      return (data ?? null) as BrandGuide | null;
    },
  });

  // Dynamic brand guide table
  const brandColumns = useMemo(() => {
    if (!guide?.measurements?.length) return [];
    const keys = new Set<string>();
    guide.measurements.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    // Show size first, then everything else in insertion order
    return ["size", ...Array.from(keys).filter((k) => k !== "size")];
  }, [guide]);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Ruler className="h-5 w-5 text-primary" />
            {guide ? `${guide.brand} · ${guide.title}` : `${audience} Size Guide`}
          </DialogTitle>
          <DialogDescription>
            {guide?.notes || "Sarees are free size. Use this chart to pick a readymade blouse — all measurements are in inches."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {guide ? (
            <div className="space-y-4">
              {guide.image_url && (
                <img src={resolveImage(guide.image_url)} alt={`${guide.brand} size chart`} className="w-full max-h-72 object-contain rounded-xl border" />
              )}
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wider">
                      <tr>
                        {brandColumns.map((col) => (
                          <th key={col} className="px-3 py-3 text-left font-semibold capitalize">{col.replace(/_/g, " ")}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {guide.measurements.map((row, i) => {
                        const rowSize = String(row.size ?? "").toLowerCase();
                        const active = currentSize && rowSize === currentSize.toLowerCase();
                        return (
                          <tr key={i} className={`border-t transition-colors ${active ? "bg-primary/10 font-semibold" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                            {brandColumns.map((col) => (
                              <td key={col} className="px-3 py-2.5">
                                {row[col] ?? "—"}
                                {col === "size" && active && <span className="ml-2 text-[10px] uppercase text-primary">Your size</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="apparel" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="apparel" className="gap-1.5"><Shirt className="h-4 w-4" />Blouse Sizes</TabsTrigger>
                <TabsTrigger value="howto" className="gap-1.5"><Scissors className="h-4 w-4" />How to Measure</TabsTrigger>
              </TabsList>

              <TabsContent value="apparel" className="mt-0">
                <div className="rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold">Size</th>
                          <th className="px-3 py-3 text-left font-semibold">Bust</th>
                          <th className="px-3 py-3 text-left font-semibold">Waist</th>
                          <th className="px-3 py-3 text-left font-semibold">Shoulder</th>
                          <th className="px-3 py-3 text-left font-semibold">Armhole</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blouseRows.map((r, i) => {
                          const active = currentSize && r.size.toLowerCase() === currentSize.toLowerCase();
                          return (
                            <tr key={r.size} className={`border-t transition-colors ${active ? "bg-primary/10 font-semibold" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                              <td className="px-3 py-2.5">
                                {r.size}
                                {active && <span className="ml-2 text-[10px] uppercase text-primary">Your size</span>}
                              </td>
                              <td className="px-3 py-2.5">{r.bust}</td>
                              <td className="px-3 py-2.5">{r.waist}</td>
                              <td className="px-3 py-2.5">{r.shoulder}</td>
                              <td className="px-3 py-2.5">{r.armhole}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tip: Our sarees are about 5.5 m long with a 0.8 m unstitched blouse piece. Between sizes? Choose the larger blouse — it can be taken in by your tailor.
                </p>
              </TabsContent>

              <TabsContent value="howto" className="mt-0 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { title: "Bust", body: "Wearing a well-fitting bra, measure around the fullest part of the bust, keeping the tape level." },
                    { title: "Waist", body: "Measure around your natural waist, where you usually tie your saree petticoat." },
                    { title: "Shoulder", body: "Measure across the back from the tip of one shoulder to the other." },
                    { title: "Armhole", body: "Measure around the arm where it meets the shoulder, keeping the tape snug but not tight." },
                  ].map((b) => (
                    <div key={b.title} className="rounded-xl border p-4 bg-muted/20">
                      <p className="font-semibold mb-1">{b.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm">
                    <strong>Need help?</strong> Reach out via chat or WhatsApp and our team will help you choose a blouse size or tailoring option.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeGuideDialog;
