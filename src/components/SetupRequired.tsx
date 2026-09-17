/** Shown instead of the store when the Supabase environment variables are missing. */
export const SetupRequired = ({ missing }: { missing: string[] }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
    <div className="max-w-lg w-full rounded-2xl border border-border bg-background p-8 shadow-sm">
      <h1 className="font-display text-2xl font-bold">Store setup needed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The site can't reach its database because these environment variables are not set:
      </p>
      <ul className="mt-4 space-y-1 font-mono text-sm">
        {missing.map((name) => (
          <li key={name} className="rounded bg-muted px-2 py-1">{name}</li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">
        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code>, fill in the
        values from your Supabase project (Project Settings → API), then restart the dev server or rebuild. See{" "}
        <code className="font-mono">SETUP.md</code> for the full guide.
      </p>
    </div>
  </div>
);
