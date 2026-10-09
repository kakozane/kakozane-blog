import { getPages } from "../api/pages.server";

export async function loadPages() { return getPages(); }
