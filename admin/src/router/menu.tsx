import { AppstoreOutlined, CommentOutlined, DashboardOutlined, FileTextOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuDataItem } from '@ant-design/pro-components'

export const adminMenu: MenuDataItem[] = [
  { path: '/', name: '工作台', icon: <DashboardOutlined /> },
  { key: 'content', name: '内容管理', icon: <FileTextOutlined />, children: [
    { path: '/posts', name: '文章管理' },
    { path: '/pages', name: '自定义页面' },
    { path: '/trash', name: '回收站' },
    { path: '/categories', name: '分类管理' },
    { path: '/tags', name: '标签管理' },
  ] },
  { key: 'community', name: '读者互动', icon: <CommentOutlined />, children: [
    { path: '/comments', name: '评论审核' },
    { path: '/users', name: '用户管理' },
  ] },
  { key: 'site', name: '站点管理', icon: <AppstoreOutlined />, children: [
    { path: '/media', name: '媒体库' },
    { path: '/friends', name: '友情链接' },
    { path: '/projects', name: '项目管理' },
    { path: '/settings', name: '站点设置', icon: <SettingOutlined /> },
  ] },
  { key: 'monitor', name: '系统监控', icon: <DashboardOutlined />, children: [
    { path: '/monitor', name: '运行监控' },
    { path: '/monitor/login-logs', name: '登录日志' },
    { path: '/monitor/operation-logs', name: '操作日志' },
    { path: '/monitor/request-logs', name: '异常与慢请求' },
  ] },
  { path: '/profile', name: '个人设置', icon: <UserOutlined /> },
]

export function adminPageName(pathname: string): string {
  const items = adminMenu.flatMap(item => item.children ?? [item])
  return (items.find(item => item.path === pathname) ?? items.find(item => item.path !== '/' && pathname.startsWith(`${item.path}/`)))?.name ?? '管理后台'
}
