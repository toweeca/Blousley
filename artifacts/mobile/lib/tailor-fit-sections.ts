export interface TailorFitSectionRecord {
  findMyTailor?: boolean | null;
  assignedTailorId?: string | null;
  conversationId?: number | null;
}

export function getTailorFitSections<T extends TailorFitSectionRecord>(
  fits: T[],
  tailorId: string,
) {
  return {
    availableFitRequests: fits.filter(
      (fit) => fit.findMyTailor === true && !fit.assignedTailorId && !fit.conversationId,
    ),
    customerFits: fits.filter(
      (fit) => fit.assignedTailorId === tailorId && !!fit.conversationId,
    ),
  };
}
