import { notFound } from "next/navigation";
import EmailDetail from "@/components/EmailDetail";
import { prospects } from "@/lib/data";

export default async function EmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospect = prospects.find((p) => p.id === id);
  if (!prospect) notFound();

  return <EmailDetail prospect={prospect} />;
}
