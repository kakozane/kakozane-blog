import type { loadTag } from "../loaders/tag.server";
import { useLoaderData } from "react-router";
import { TaxonomyPage } from "../components/taxonomy-page";

export default function Tag() {
  const { term, results } = useLoaderData<typeof loadTag>();
  return <TaxonomyPage base={`/tags/${encodeURIComponent(term.slug)}`} label="标签" results={results} term={term} />;
}
