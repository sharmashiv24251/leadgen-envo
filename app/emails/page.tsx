import { redirect } from "next/navigation";
import { prospects, type ProspectStatus } from "@/lib/data";

const VALID_STATUSES: ProspectStatus[] = [
  "DRAFTED",
  "DELIVERED",
  "BOUNCED",
  "RESPONDED",
];

export default async function EmailsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = VALID_STATUSES.find(
    (s) => s === status?.toUpperCase(),
  );

  const target = activeStatus
    ? (prospects.find((p) => p.status === activeStatus) ?? prospects[0])
    : prospects[0];

  redirect(`/emails/${target.id}${activeStatus ? `?status=${status}` : ""}`);
}
