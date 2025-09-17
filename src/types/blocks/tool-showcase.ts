import { Image, Video, Button } from "@/types/blocks/base";

export interface CaseItem {
  title?: string;
  description?: string;
  badge?: string;
  features?: CaseFeature[];
  video?: Video;
  image?: Image;
  buttons?: Button[];
  reverse?: boolean;
}

export interface CaseFeature {
  icon?: string;
  title?: string;
  description?: string;
}

export interface ToolShowcase {
  title?: string;
  description?: string;
  label?: string;
  items?: CaseItem[];
}
