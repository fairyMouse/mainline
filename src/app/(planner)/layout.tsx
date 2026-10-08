import { Rail } from "./rail";

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      <Rail />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
