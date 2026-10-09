import type { loadArchive } from "../loaders/archive.server";
import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import { SiteFooter } from "../../../layouts/site-footer";
import { SiteHeader } from "../../../layouts/site-header";
import { formatDate } from "../../../shared/lib/date";
import { contentLabel, contentPath } from "../lib/content-path";

function href(year: string, month = "", page = 1) {
  const query = new URLSearchParams();
  if (year) query.set("year", year);
  if (month) query.set("month", month);
  if (page > 1) query.set("page", String(page));
  return `/archive${query.size ? `?${query}` : ""}`;
}

export default function Archive() {
  const { items, years, year, month } = useLoaderData<typeof loadArchive>();
  const [density, setDensity] = useState<"relaxed" | "dense" | "skim">("relaxed");
  let previousYear = "";
  let previousMonth = "";
  return <div className="site-shell">
    <SiteHeader />
    <main className="simple-page timeline-page">
      <div className="page-intro"><h1>归档</h1><p>{month ? `${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月` : "按时间回看写过的文章"}，共 {items.total} 条。</p>
        {month && <Link className="text-link" to={href("")}>清除月份筛选 ↗</Link>}
      </div>
      <div className="timeline-filters">
        <nav aria-label="年份" className="timeline-years">
          <Link aria-current={!year && !month ? "page" : undefined} to={href("")}>全部年份</Link>
          {years.map((value) => <Link aria-current={year === String(value) ? "page" : undefined} key={value} to={href(String(value))}>{value}</Link>)}
        </nav>
      </div>
      <div aria-label="归档显示密度" className="timeline-density" role="group">{([["relaxed", "舒展"], ["dense", "紧凑"], ["skim", "速览"]] as const).map(([value, label]) => <button aria-pressed={density === value} key={value} onClick={() => setDensity(value)} type="button">{label}</button>)}</div>
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
              <div><span className="timeline-kind">{contentLabel(item.kind)}{item.pinned && <span className="timeline-featured"> · 精选</span>}</span><h3><Link to={contentPath(item.kind, item.slug)}>{item.title}</Link></h3>{item.excerpt && <p>{item.excerpt}</p>}</div>
            </article>
          </div>;
        })}
      </div>
      {items.total > items.pageSize && <nav aria-label="归档分页" className="pagination">
        {items.page > 1 && <Link to={href(year, month, items.page - 1)}>← 上一页</Link>}
        {items.page * items.pageSize < items.total && <Link to={href(year, month, items.page + 1)}>下一页 →</Link>}
      </nav>}
    </main>
    <SiteFooter />
  </div>;
}
