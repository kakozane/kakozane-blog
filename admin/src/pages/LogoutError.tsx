import { Link, useLoaderData } from 'react-router'

export default function LogoutError() {
  const { error } = useLoaderData() as { error: string }
  return <main className="login-page"><p>{error} <Link to="/">返回后台重试</Link></p></main>
}
