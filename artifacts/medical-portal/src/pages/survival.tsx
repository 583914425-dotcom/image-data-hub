import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  Cell, PieChart, Pie,
} from "recharts";
import { TrendingUp, Info } from "lucide-react";

const OUTCOME_COLORS: Record<string, string> = {
  PR: "hsl(185, 81%, 29%)",
  SD: "hsl(40, 85%, 55%)",
  PD: "hsl(0, 70%, 55%)",
  CR: "hsl(130, 50%, 45%)",
};

const OUTCOME_LABELS: Record<string, string> = {
  PR: "PR（部分缓解）",
  SD: "SD（疾病稳定）",
  PD: "PD（疾病进展）",
  CR: "CR（完全缓解）",
};

const STAGE_LABELS: Record<string, string> = {
  "1": "I期",
  "2": "II期",
  "3": "III期",
  "4": "IV期",
};

interface OutcomeByStage {
  stage: string;
  PR: number;
  SD: number;
  PD: number;
  CR: number;
  total: number;
}

interface OutcomeByPathology {
  pathology: string;
  PR: number;
  SD: number;
  PD: number;
  CR: number;
  total: number;
}

interface OutcomeByLymph {
  group: string;
  PR: number;
  SD: number;
  PD: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Survival() {
  const [byStage, setByStage] = useState<OutcomeByStage[]>([]);
  const [byPath, setByPath] = useState<OutcomeByPathology[]>([]);
  const [byLymph, setByLymph] = useState<OutcomeByLymph[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/statistics/outcome-by-stage").then((r) => r.json()),
      fetch("/api/statistics/outcome-by-pathology").then((r) => r.json()),
      fetch("/api/statistics/outcome-by-lymph").then((r) => r.json()),
    ])
      .then(([s, p, l]) => {
        setByStage(s);
        setByPath(p);
        setByLymph(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPatients = byStage.reduce((s, r) => s + r.total, 0);
  const totalPR = byStage.reduce((s, r) => s + r.PR, 0);
  const totalSD = byStage.reduce((s, r) => s + r.SD, 0);
  const totalPD = byStage.reduce((s, r) => s + r.PD, 0);
  const prRate = totalPatients > 0 ? Math.round((totalPR / totalPatients) * 1000) / 10 : 0;

  const stageChartData = byStage.map((r) => ({
    name: STAGE_LABELS[r.stage] ?? `${r.stage}期`,
    PR: r.PR,
    SD: r.SD,
    PD: r.PD,
    CR: r.CR,
  }));

  const pathChartData = byPath.map((r) => ({
    name: r.pathology.length > 6 ? r.pathology.slice(0, 6) + "…" : r.pathology,
    fullName: r.pathology,
    PR: r.PR,
    SD: r.SD,
    PD: r.PD,
    CR: r.CR,
  }));

  const lymphChartData = byLymph.map((r) => ({
    name: r.group,
    PR: r.PR,
    SD: r.SD,
    PD: r.PD,
  }));

  const pieData = [
    { name: "PR（部分缓解）", value: totalPR, color: OUTCOME_COLORS["PR"] },
    { name: "SD（疾病稳定）", value: totalSD, color: OUTCOME_COLORS["SD"] },
    { name: "PD（疾病进展）", value: totalPD, color: OUTCOME_COLORS["PD"] },
  ].filter((d) => d.value > 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">治疗结果分析</h1>
            <p className="text-muted-foreground mt-1">近期疗效评估：PR / SD / PD 多维度分布</p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="纳入患者总数" value={totalPatients} sub="有治疗结果记录" />
              <StatCard label="PR 例数" value={totalPR} sub={`占比 ${prRate}%`} />
              <StatCard label="SD 例数" value={totalSD} sub={`占比 ${totalPatients > 0 ? Math.round((totalSD / totalPatients) * 1000) / 10 : 0}%`} />
              <StatCard label="PD 例数" value={totalPD} sub={`占比 ${totalPatients > 0 ? Math.round((totalPD / totalPatients) * 1000) / 10 : 0}%`} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">总体治疗结果分布</CardTitle>
                  <CardDescription>近期疗效评估汇总</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        isAnimationActive={false}
                        label={({ name, value, percent }) =>
                          `${name.split("（")[0]}: ${value} (${(percent * 100).toFixed(1)}%)`
                        }
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">按FIGO分期的治疗结果</CardTitle>
                  <CardDescription>各分期 PR/SD/PD 例数对比</CardDescription>
                </CardHeader>
                <CardContent>
                  {stageChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">暂无分期数据</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stageChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip />
                        <Legend formatter={(v) => OUTCOME_LABELS[v] ?? v} />
                        {Object.keys(OUTCOME_COLORS).map((k) => (
                          <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k]} name={k} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">按病理类型的治疗结果</CardTitle>
                  <CardDescription>鳞癌/腺癌等各类型疗效分布</CardDescription>
                </CardHeader>
                <CardContent>
                  {pathChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">暂无病理类型数据</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={pathChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                          formatter={(v, n) => [v, OUTCOME_LABELS[n as string] ?? n]}
                        />
                        <Legend formatter={(v) => OUTCOME_LABELS[v] ?? v} />
                        {Object.keys(OUTCOME_COLORS).map((k) => (
                          <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k]} name={k} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">盆腔淋巴结转移与治疗结果</CardTitle>
                  <CardDescription>淋巴结阳性 vs 阴性患者疗效对比</CardDescription>
                </CardHeader>
                <CardContent>
                  {lymphChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">暂无数据</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={lymphChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip formatter={(v, n) => [v, OUTCOME_LABELS[n as string] ?? n]} />
                        <Legend formatter={(v) => OUTCOME_LABELS[v] ?? v} />
                        {Object.keys(OUTCOME_COLORS).filter((k) => k !== "CR").map((k) => (
                          <Bar key={k} dataKey={k} stackId="a" fill={OUTCOME_COLORS[k]} name={k} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">关于生存分析（Kaplan-Meier）</p>
                    <p className="mt-1">
                      当前数据库中 OS/PFS 字段尚无数值型随访月数。待您在数据管理中补充每位患者的随访时间（月）和生存事件后，
                      此页将自动生成 Kaplan-Meier 生存曲线，并支持按分期、病理类型等分组对比。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
