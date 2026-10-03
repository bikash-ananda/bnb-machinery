export type StaffRole = "INVENTORY_EDITOR" | "OWNER";

export type VerificationStatus =
  | "DRAFT"
  | "AI_IDENTIFICATION_PENDING"
  | "STAFF_REVIEW"
  | "OWNER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_CORRECTION";

export type PublicationStatus = "PRIVATE" | "PUBLISHED";

export type ProductImage = {
  id: string;
  sort_index: number;
  mime_type: string;
};

export type ProductRecord = {
  id: string;
  slug: string;
  name: string | null;
  name_en: string | null;
  name_ne: string | null;
  description_en: string | null;
  description_ne: string | null;
  category_id: string | null;
  category_name_en: string | null;
  brand_id: string | null;
  brand_name: string | null;
  model: string | null;
  part_number: string | null;
  specifications: { name: string; value: string }[];
  applications: string[];
  stock_quantity: number | null;
  stock_status: string | null;
  price: number | null;
  price_type: string | null;
  verification_status: VerificationStatus;
  publication_status: PublicationStatus;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  ai_suggestions: Record<string, unknown> | null;
  ai_status: "NOT_REQUESTED" | "PENDING" | "READY" | "UNAVAILABLE" | "FAILED";
  images?: ProductImage[];
};

export type ProductFields = Pick<
  ProductRecord,
  | "name_en"
  | "name_ne"
  | "description_en"
  | "description_ne"
  | "category_name_en"
  | "brand_name"
  | "model"
  | "part_number"
  | "stock_quantity"
  | "specifications"
  | "applications"
>;

export type StaffSession = {
  email: string;
  name: string;
  role: StaffRole;
  expiresAt: number;
  tokenHash: string;
};
