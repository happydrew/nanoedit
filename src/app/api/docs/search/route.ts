import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(source, {
  // https://docs.orama.com/open-source/supported-languages
  // Remove language specification to support multiple languages
  // language: "english",
});
