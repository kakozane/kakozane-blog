import { getPage } from "../api/pages.server";

export async function loadPage({ params }: { request: Request; params: { slug: string } }) { return getPage(params.slug); }
