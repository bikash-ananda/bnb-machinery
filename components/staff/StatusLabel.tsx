"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { VerificationStatus } from "@/lib/inventory/types";

const statusKeys: Record<VerificationStatus, MessageKey> = {
  DRAFT: "draftStatus",
  AI_IDENTIFICATION_PENDING: "pendingVerification",
  STAFF_REVIEW: "staffReviewStatus",
  OWNER_REVIEW: "ownerReviewStatus",
  APPROVED: "approvedStatus",
  REJECTED: "rejectedStatus",
  NEEDS_CORRECTION: "needsCorrectionStatus",
};

export default function StatusLabel({ status }: { status: VerificationStatus }) {
  const { t } = useLanguage();
  return <>{t(statusKeys[status])}</>;
}
