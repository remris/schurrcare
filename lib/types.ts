export type Role = "oma" | "pflege" | "admin";

export interface ShopList {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Item {
  id: string;
  listId: string;
  text: string; // deutsch, so wie Oma es eingibt
  translations: Record<string, string>;
  createdAt: string;
  createdBy: "oma" | "admin";
  bought: boolean;
  boughtAt?: string;
}

export interface ReceiptMatch {
  itemId: string;
  text: string;
  found: boolean;
  line?: string;
}

export interface Trip {
  id: string;
  listId: string;
  listName: string;
  date: string;
  lang?: string;
  bought: { text: string; translation?: string; addedAt: string }[];
  notBought: { text: string }[];
  receipt?: {
    method: "tesseract" | "claude";
    hasImage: boolean;
    matches: ReceiptMatch[];
    lines: string[];
    total?: string;
  };
}

export interface HelpEntry {
  id: string;
  title: string;
  text: string;
  order: number;
  updatedAt: string;
  translations: Record<string, { title: string; text: string }>;
}

export interface DocPage {
  id: string;
  type: "image" | "pdf";
  name: string;
  size: number; // Bytes
  addedAt: string;
}

export interface Doc {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pages: DocPage[];
}
