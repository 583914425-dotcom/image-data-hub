import { AppLayout } from "@/components/layout/app-layout";
import {
  useGetAgeDistribution,
  useGetStageDistribution,
  useGetPathologyDistribution,
  useGetTreatmentOutcomeStats,
  useGetTumorMarkerStats,
  useGetBloodIndicesStats,
  useGetTreatmentComparison,
  useGetLymphNodeMetastasis,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const COLORS = [
  'hsl(185, 81%, 29%)', 'hsl(200, 65%, 45%)', 'hsl(40, 85%, 55%)',
  'hsl(340, 70%, 55%)', 'hsl(130, 50%, 45%)', 'hsl(270, 60%, 55%)',
  'hsl(20, 80%, 50%)', 'hsl(160, 55%, 40%)', 'hsl(60, 75%, 48%)', 'hsl(300, 55%, 52%)',
];

export default function Statistics() {
  const { data: ageDist } = useGetAgeDistribution();
  const { data: stageDist } = useGetStageDistribution();
  const { data: pathDist } = useGetPathologyDistribution();
  const { data: outcomeDist } = useGetTreatmentOutcomeStats();
  const { data: tumorMarkers } = useGetTumorMarkerStats();
  const { data: bloodIndices } = useGetBloodIndicesStats();
  const { data: treatmentComp } = useGetTreatmentComparison();
  const { data: lymphNode } = useGetLymphNodeMetastasis();

  const tumorMarkerData = tumorMarkers
    ? [
        { name: "SCC-Ag", "治疗前": tumorMarkers.sccAg.preMean, "治疗后": tumorMarkers.sccAg.postMean },
        { name: "CA125", "治疗前": tumorMarkers.ca125.preMean, "治疗后": tumorMarkers.ca125.postMean },
        { name: "CEA", "治疗前": tumorMarkers.cea.preMean, "治疗后": tumorMarkers.cea.postMean },
        { name: "CA199", "治疗前": tumorMarkers.ca199.preMean, "治疗后": tumorMarkers.ca199.postMean },
      ]
    : [];

  const bloodData = bloodIndices
    ? [
        { name: "PLR", mean: bloodIndices.plr.mean, min: bloodIndices.plr.min, max: bloodIndices.plr.max },
        { name: "LMR", mean: bloodIndices.lmr.mean, min: bloodIndices.lmr.min, max: bloodIndices.lmr.max },
        { name: "PNI", mean: bloodIndices.pni.mean, min: bloodIndices.pni.min, max: bloodIndices.pni.max },
      ]
    : [];

  const treatmentCompData = treatmentComp?.map((item) => ({
    name: item.stage,
    "治疗前": item.preTreatmentAvg,
    "治疗后": item.postTreatmentAvg,
    "变化值": item.changeAvg,
  })) ?? [];

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">统计分析</h1>
          <p className="text-muted-foreground mt-1">多维度数据统计与可视化分析</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">年龄分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={ageDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive={false} label={({ name, value }) => `${name}: ${value}`}>
                    {(ageDist ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">FIGO分期分布 (2018)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageDist ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="患者数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">病理类型分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pathDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive={false} label={({ name, value }) => `${name}: ${value}`}>
                    {(pathDist ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">治疗结果分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={outcomeDist ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} isAnimationActive={false} label={({ name, value }) => `${name}: ${value}`}>
                    {(outcomeDist ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">肿瘤标志物治疗前后对比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tumorMarkerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="治疗前" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="治疗后" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">各分期治疗前后肿瘤大小对比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={treatmentCompData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="治疗前" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="治疗后" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="变化值" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">血液炎症指标统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">指标</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">均值</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">最小值</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">最大值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloodIndices && Object.entries(bloodIndices).map(([key, stat]) => (
                      <tr key={key} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{key.toUpperCase()}</td>
                        <td className="py-2 px-3 text-right">{stat.mean.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{stat.min.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{stat.max.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">淋巴结转移分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={lymphNode ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[3]} radius={[0, 4, 4, 0]} name="转移例数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
