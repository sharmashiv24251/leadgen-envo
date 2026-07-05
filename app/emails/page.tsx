import { redirect } from "next/navigation";
import { prospects } from "@/lib/data";

export default function EmailsIndexPage() {
  redirect(`/emails/${prospects[0].id}`);
}
