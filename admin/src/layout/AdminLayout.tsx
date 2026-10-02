import { ExportOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { PageContainer, ProLayout } from '@ant-design/pro-components'
import { Button, Dropdown } from 'antd'
import { Link, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router'

import type { AdminUser } from '../types/auth'
import { adminMenu, adminPageName } from '../router/menu'
import { publicPreviewOrigin } from '../lib/preview-origin'

export default function AdminLayout() {
  const user = useLoaderData() as AdminUser
  const location = useLocation()
  const navigate = useNavigate()
  const title = adminPageName(location.pathname)
  let publicOrigin = ''
  try { publicOrigin = publicPreviewOrigin(window.location.origin) } catch { /* 未配置域名时隐藏外部入口。 */ }

  return (
    <ProLayout
      title="Kakozane Admin"
      logo={<span className="admin-brand" aria-hidden="true">K</span>}
      locale="zh-CN"
      layout="mix"
      fixedHeader
      fixSiderbar
      siderWidth={224}
      contentWidth="Fluid"
      menu={{ locale: false, defaultOpenAll: true }}
      route={{ path: '/', routes: adminMenu }}
      location={{ pathname: location.pathname }}
      menuHeaderRender={(_, dom) => <Link to="/">{dom}</Link>}
      menuItemRender={(item, defaultDom) => <Link to={item.path ?? '/'}>{defaultDom}</Link>}
      actionsRender={() => publicOrigin ? [<Button key="public" href={publicOrigin} target="_blank" rel="noopener noreferrer" type="text" icon={<ExportOutlined />}>访问博客</Button>] : []}
      avatarProps={{
        icon: <UserOutlined />,
        title: user.displayName,
        style: { backgroundColor: '#1677ff' },
        render: (_, dom) => <Dropdown menu={{ items: [
          { key: '/profile', label: '个人设置', icon: <UserOutlined /> },
          { type: 'divider' },
          { key: '/logout', label: '退出登录', icon: <LogoutOutlined />, danger: true },
        ], onClick: ({ key }) => navigate(key) }} trigger={['click']}><button className="admin-account" type="button" aria-label="账号菜单">{dom}</button></Dropdown>,
      }}
      footerRender={false}
    >
      <PageContainer className="admin-page-container" title={false} header={{ breadcrumb: { items: [
        { title: <Link to="/">工作台</Link> }, ...(location.pathname === '/' ? [] : [{ title }]),
      ] } }}>
        <Outlet />
      </PageContainer>
    </ProLayout>
  )
}
