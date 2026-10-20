export interface TailorConversation {
  id: number;
  title: string;
  customerId: string | null;
  tailorId: string | null;
  customerName: string | null;
  tailorName: string | null;
  fitId?: number | null;
  ideaId?: number | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export function tailorSummaryConversationsQueryOptions(
  userId: string | undefined,
  apiBase: string,
  enabled = true,
) {
  return {
    queryKey: ["chat-conversations", userId] as const,
    queryFn: async (): Promise<TailorConversation[]> => {
      if (!userId) throw new Error("Tailor sign-in required");
      const response = await fetch(`${apiBase}/api/chat/conversations?userId=${encodeURIComponent(userId)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not load conversations");
      return response.json();
    },
    enabled: !!userId && enabled,
  };
}

export function getTailorSummaryItems(conversations: TailorConversation[], tailorId: string) {
  const tailorConversations = conversations
    .filter((conversation) => conversation.tailorId === tailorId)
    .sort((a, b) =>
      new Date(b.lastMessageAt ?? b.createdAt).getTime() - new Date(a.lastMessageAt ?? a.createdAt).getTime(),
    );
  const acceptedJobs = tailorConversations.filter(
    (conversation) => conversation.fitId != null || conversation.ideaId != null,
  );
  const customersById = new Map<string, TailorConversation>();
  tailorConversations.forEach((conversation) => {
    if (conversation.customerId && !customersById.has(conversation.customerId)) {
      customersById.set(conversation.customerId, conversation);
    }
  });

  return { acceptedJobs, customers: [...customersById.values()] };
}
