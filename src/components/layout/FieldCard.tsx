export function FieldCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panelMuted/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.24em] text-textMuted">{label}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
