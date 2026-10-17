export interface OfferableRequest {
  id: number;
  paymentStatus: string;
  assignedTailorId?: string | null;
  acceptedAt?: string | null;
}

export interface OfferConversation {
  id: number;
}

export type TailorOfferResult =
  | { status: "sent" }
  | { status: "refresh_failed"; error?: unknown }
  | { status: "stale" }
  | { status: "accept_failed"; error: unknown }
  | { status: "accepted_chat_failed"; error: unknown };

export function tailorDesignRequestsQueryKey(
  userId: string | undefined,
  sort: "newest" | "oldest",
  filter: "all" | "today" | "7d" | "30d",
) {
  return ["tailor-design-requests", userId, sort, filter] as const;
}

export function getTailorOfferAlert(
  result: TailorOfferResult,
): { title: string; message: string } | null {
  if (result.status === "sent") return null;
  if (result.status === "accepted_chat_failed") {
    return {
      title: "Request accepted",
      message: `The request was accepted, but the chat or offer message could not be sent. ${
        result.error instanceof Error ? result.error.message : "Please open the chat to continue."
      }`,
    };
  }

  const message =
    result.status === "refresh_failed"
      ? "Could not refresh design requests. Please try again."
      : result.status === "stale"
        ? "This request is no longer open. Refresh the request list."
        : result.error instanceof Error
          ? result.error.message
          : "Please refresh and try again.";

  return { title: "Could not accept request", message };
}

export async function runTailorOfferFlow({
  requestId,
  message,
  refreshRequests,
  acceptRequest,
  createConversation,
  sendMessage,
  onAccepted,
  onConversationCreated,
  onMessageSent,
}: {
  requestId: number;
  message: string;
  refreshRequests: () => Promise<{ data?: OfferableRequest[]; error?: unknown }>;
  acceptRequest: (requestId: number) => Promise<void>;
  createConversation: () => Promise<OfferConversation>;
  sendMessage: (conversationId: number, message: string) => Promise<void>;
  onAccepted: () => void;
  onConversationCreated: (conversation: OfferConversation) => void;
  onMessageSent: () => void;
}): Promise<TailorOfferResult> {
  let latestRequests: { data?: OfferableRequest[]; error?: unknown };
  try {
    latestRequests = await refreshRequests();
  } catch (error) {
    return { status: "refresh_failed", error };
  }
  if (latestRequests.error) return { status: "refresh_failed", error: latestRequests.error };

  const currentRequest = latestRequests.data?.find(
    (request) =>
      request.id === requestId &&
      request.paymentStatus === "paid_open" &&
      request.assignedTailorId == null &&
      request.acceptedAt == null,
  );
  if (!currentRequest) return { status: "stale" };

  try {
    await acceptRequest(currentRequest.id);
  } catch (error) {
    return { status: "accept_failed", error };
  }

  try {
    onAccepted();
    const conversation = await createConversation();
    onConversationCreated(conversation);
    await sendMessage(conversation.id, message);
    onMessageSent();
    return { status: "sent" };
  } catch (error) {
    return { status: "accepted_chat_failed", error };
  }
}
