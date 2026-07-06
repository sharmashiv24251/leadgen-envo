import { notFound } from "next/navigation";
import EmailDetail from "@/components/EmailDetail";
import { prospects } from "@/lib/data";

export default async function EmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const prospect = prospects.find((p) => p.id === id);
  if (!prospect) notFound();

  return <EmailDetail prospect={prospect} status={status} />;
}
