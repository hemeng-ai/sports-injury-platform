/**
 * (auth) 路由组布局 — 登录/注册页专用
 * 无侧边栏，内容垂直水平居中
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      {children}
    </div>
  );
}
