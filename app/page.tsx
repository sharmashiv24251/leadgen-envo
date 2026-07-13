import AuthGate from "@/components/AuthGate";
import DashboardView from "@/components/DashboardView";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function Home() {
  return (
    <AuthGate fallback={<DashboardSkeleton />}>
      <div className="flex-1 overflow-y-auto">
        <DashboardView />
      </div>
    </AuthGate>
  );
}
