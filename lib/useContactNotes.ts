import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addContactNote, deleteContactNote, fetchContactNotes, updateContactNote } from "@/lib/outreachApi";
import { queryKeys } from "@/lib/queryKeys";
import { useAccountMode } from "@/lib/useAccountData";

// No per-user identity anywhere in this app (both logins are account-level, not personal) --
// notes just need *a* non-null author for the schema, not a real one.
const DEFAULT_AUTHOR = "You";

export function useContactNotes(contactId: string, options?: { enabled?: boolean }) {
  const account = useAccountMode();
  const keys = queryKeys.forAccount(account);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: keys.contactNotes(contactId),
    queryFn: () => fetchContactNotes(contactId),
    enabled: options?.enabled ?? true,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: keys.contactNotes(contactId) });
  }

  const addMutation = useMutation<void, Error, void>({
    mutationFn: () => addContactNote(contactId, DEFAULT_AUTHOR, draft.trim()),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
  });

  const updateMutation = useMutation<void, Error, { id: string; text: string }>({
    mutationFn: ({ id, text }) => updateContactNote(id, text),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deleteContactNote(id),
    onSuccess: invalidate,
  });

  return { notes, draft, setDraft, addMutation, updateMutation, deleteMutation };
}
