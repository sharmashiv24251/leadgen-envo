import AuthGate from "@/components/AuthGate";
import DashboardView from "@/components/DashboardView";

export default function Home() {
  return (
    <AuthGate>
      <div className="flex-1 overflow-y-auto">
        <DashboardView />
      </div>
    </AuthGate>
  );
}
