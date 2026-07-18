import AuthGate from "@/components/AuthGate";
import FunnelBoard from "@/components/FunnelBoard";
import { FunnelBoardSkeleton } from "@/components/Skeleton";

export default function FunnelPage() {
  return (
    <AuthGate fallback={<FunnelBoardSkeleton />}>
      <div className="flex-1 overflow-y-auto">
        <FunnelBoard />
      </div>
    </AuthGate>
  );
}
