import { useState } from "react";
import { Link, useLoaderData } from "react-router";

import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { formatDate } from "../lib/date";
import { getTimeline, getTimelineYears } from "../lib/posts.server";
import { contentLabel, contentPath } from "../lib/content-path";
import type { Route } from "./+types/timeline";

export function meta({ loaderData, matches }: Route.MetaArgs) {
  return [{ title: `${loaderData?.featured ? "精选手记" : "时间线"} · ${matches[0].loaderData.site.title}` }, { name: "description", content: "按时间回看文章、手记与思考。" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const featured = params.get("featured") === "1";
  const query = new URLSearchParams(params);
  if (featured) query.set("kind", "note");
  const [items, years] = await Promise.all([getTimeline(query), getTimelineYears(featured)]);
  return { items, years: years.years, year: params.get("year") ?? "", month: params.get("month") ?? "", kind: featured ? "note" : params.get("kind") ?? "all", featured };
}

function href(year: string, kind: string, month = "", page = 1, featured = false) {
  const query = new URLSearchParams();
  if (year) query.set("year", year);
  if (month) query.set("month", month);
  if (kind !== "all") query.set("kind", kind);
  if (featured) query.set("featured", "1");
  if (page > 1) query.set("page", String(page));
  return `/timeline${query.size ? `?${query}` : ""}`;
}

export default function Timeline() {
  const { items, years, year, month, kind, featured } = useLoaderData<typeof loader>();
  const [density, setDensity] = useState<"relaxed" | "dense" | "skim">("relaxed");
  let previousYear = "";
  let previousMonth = "";
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page timeline-page">
      <div className="page-intro"><h1>{featured ? "精选手记" : "时间线"}</h1><p>{month ? `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月` : featured ? "回看值得收藏的手记" : "按时间回看写过的文章、手记与思考"}，共 {items.total} 条。</p>
        {month && <Link className="text-link" to={href("", kind, "", 1, featured)}>清除月份筛选 ↗</Link>}
      </div>
      <nav aria-label="时间线视图" className="timeline-views"><Link aria-current={!featured ? "page" : undefined} to="/timeline">全部内容</Link><Link aria-current={featured ? "page" : undefined} to={href("", "note", "", 1, true)}>精选手记</Link></nav>
      <div className={`timeline-filters${featured ? " is-featured" : ""}`}>
        {!featured && <nav aria-label="内容类型" className="timeline-types">
          {[["all", "全部"], ["post", "文章"], ["note", "手记"], ["thought", "思考"]].map(([value, label]) =>
            <Link aria-current={kind === value ? "page" : undefined} key={value} to={href(year, value, month)}>{label}</Link>)}
        </nav>}
        <nav aria-label="年份" className="timeline-years">
          <Link aria-current={!year && !month ? "page" : undefined} to={href("", kind, "", 1, featured)}>全部年份</Link>
          {years.map((value) => <Link aria-current={year === String(value) ? "page" : undefined} key={value} to={href(String(value), kind, "", 1, featured)}>{value}</Link>)}
        </nav>
      </div>
      <div aria-label="时间线显示密度" className="timeline-density" role="group">{([["relaxed", "舒展"], ["dense", "紧凑"], ["skim", "速览"]] as const).map(([value, label]) => <button aria-pressed={density === value} key={value} onClick={() => setDensity(value)} type="button">{label}</button>)}</div>
      <div className="timeline-list" data-density={density}>
        {items.items.length === 0 && <p className="empty-posts">这一时间段还没有公开内容。</p>}
        {items.items.map((item) => {
          const date = item.publishedAt ?? item.createdAt;
          const itemYear = new Date(date).toLocaleDateString("en", { year: "numeric", timeZone: "Asia/Shanghai" });
          const itemMonth = new Date(date).toLocaleDateString("zh-CN", { month: "long", timeZone: "Asia/Shanghai" });
          const showMonth = `${itemYear}-${itemMonth}` !== previousMonth;
          previousMonth = `${itemYear}-${itemMonth}`;
          const showYear = itemYear !== previousYear;
          previousYear = itemYear;
          return <div key={item.id}>
            {showYear && <h2 className="timeline-year-heading">{itemYear}</h2>}
            {showMonth && <h3 className="timeline-month-heading">{itemMonth}</h3>}
            <article className="timeline-entry">
              <time dateTime={date}>{formatDate(date, true)}</time>
              <span className="timeline-dot" aria-hidden="true" />
              <div><span className="timeline-kind">{contentLabel(item.kind)}{item.kind === "note" && item.pinned && <span className="timeline-featured"> · 精选</span>}</span><h3><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link></h3>{item.excerpt && <p>{item.excerpt}</p>}</div>
            </article>
          </div>;
        })}
      </div>
      {items.total > items.pageSize && <nav aria-label="时间线分页" className="pagination">
        {items.page > 1 && <Link to={href(year, kind, month, items.page - 1, featured)}>← 上一页</Link>}
        {items.page * items.pageSize < items.total && <Link to={href(year, kind, month, items.page + 1, featured)}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
