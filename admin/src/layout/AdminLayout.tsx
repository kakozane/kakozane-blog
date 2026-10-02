import { ProLayout } from '@ant-design/pro-components'
import { Button } from 'antd'
import { Link, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router'

import type { AdminUser } from '../types/auth'

const menu = [
  { path: '/', name: '概览' },
  { path: '/posts', name: '文章管理' },
  { path: '/notes', name: '手记管理' },
  { path: '/thinking', name: '思考管理' },
  { path: '/pages', name: '自定义页面' },
  { path: '/says', name: '一言管理' },
  { path: '/categories', name: '分类管理' },
  { path: '/tags', name: '标签管理' },
  { path: '/users', name: '用户管理' },
  { path: '/comments', name: '评论审核' },
  { path: '/media', name: '媒体库' },
  { path: '/friends', name: '友情链接' },
  { path: '/projects', name: '项目管理' },
  { path: '/settings', name: '站点设置' },
  { path: '/profile', name: '个人设置' },
]

export default function AdminLayout() {
  const user = useLoaderData() as AdminUser
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <ProLayout
      title="Kakozane"
      logo={false}
      locale="zh-CN"
      layout="mix"
      fixedHeader
      route={{ path: '/', routes: menu }}
      location={{ pathname: location.pathname }}
      menuItemRender={(item, defaultDom) => <Link to={item.path ?? '/'}>{defaultDom}</Link>}
      actionsRender={() => [<span key="user">{user.displayName}</span>, <Button key="logout" onClick={() => navigate('/logout')}>退出</Button>]}
      footerRender={false}
    >
      <Outlet />
    </ProLayout>
  )
}
