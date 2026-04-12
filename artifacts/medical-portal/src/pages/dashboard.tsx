import { AppLayout } from "@/components/layout/app-layout";
import { useGetStatisticsOverview, useGetAgeDistribution, useGetStageDistribution, useGetPathologyDistribution } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ['hsl(185, 81%, 29%)', 'hsl(200, 65%, 45%)', 'hsl(40, 85%, 55%)', 'hsl(340, 70%, 55%)', 'hsl(130, 50%, 45%)'];

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useGetStatisticsOverview();
  const { data: ageDist, isLoading: ageLoading } = useGetAgeDistribution();
  const { data: stageDist, isLoading: stageLoading } = useGetStageDistribution();

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">研究总览</h1>
          <p className="text-muted-foreground mt-2">宫颈癌临床诊疗及随访数据分析</p>
        </div>

        {overviewLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted" />
            ))}
          </div>
        ) : overview ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">总入组患者</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalPatients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  平均年龄 {Math.round(overview.avgAge)} 岁
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">治疗有效率</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.outcomeRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  CR + PR 占比
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">肿瘤缩小平均值</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.avgTumorSizeChange.toFixed(2)} cm</div>
                <p className="text-xs text-muted-foreground mt-1">
                  治疗前后体积差
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">合并症比例</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.comorbidityRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  含高血压/糖尿病等
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>FIGO分期分布 (2018)</CardTitle>
              <CardDescription>入组患者诊断时分期情况</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {stageLoading ? (
                <div className="h-full w-full animate-pulse bg-muted rounded-md" />
              ) : stageDist ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageDist}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'var(--color-muted)' }} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>年龄分布</CardTitle>
              <CardDescription>各年龄段占比</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              {ageLoading ? (
                <div className="h-full w-full animate-pulse bg-muted rounded-md" />
              ) : ageDist ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ageDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {ageDist.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
