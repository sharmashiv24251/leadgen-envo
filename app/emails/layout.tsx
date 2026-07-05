import EmailSidebar from "@/components/EmailSidebar";

export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <EmailSidebar />
      {children}
    </div>
  );
}
