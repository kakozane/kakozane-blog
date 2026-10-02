export function loader() {
  throw new Response("页面不存在", { status: 404 });
}

export default function NotFound() { return null; }
