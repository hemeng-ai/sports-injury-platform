export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border shadow-sm">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">登录</h1>
          <p className="text-muted-foreground text-sm">
            运动损伤资料管理与指标分析平台
          </p>
        </div>
        {/* LoginForm 组件将在 Task 1.2 实现 */}
        <div className="text-center text-muted-foreground text-sm">
          登录功能将在 Task 1.2 实现
        </div>
      </div>
    </div>
  );
}
