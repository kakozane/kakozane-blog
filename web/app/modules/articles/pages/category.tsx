import type { loadCategory } from "../loaders/category.server";
import { useLoaderData } from "react-router";
import { TaxonomyPage } from "../components/taxonomy-page";

export default function Category() {
  const { term, results } = useLoaderData<typeof loadCategory>();
  return <TaxonomyPage base={`/categories/${encodeURIComponent(term.slug)}`} label="分类" results={results} term={term} />;
}
