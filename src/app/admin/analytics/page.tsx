"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

async function fetchAnalytics(type: string, days: number) {
  const res = await fetch(`/api/admin/analytics?type=${type}&days=${days}`);
  return res.json();
}

export default function AdminAnalyticsPage() {
  const [type, setType] = useState<"clicks" | "views">("clicks");
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", type, days],
    queryFn: () => fetchAnalytics(type, days),
  });

  const chartData = data?.data?.byDate
    ? Object.entries(data.data.byDate).map(([date, count]) => ({
        date: date.slice(5), // MM-DD format
        count,
      }))
    : [];

  const topProducts = data?.data?.topProducts || [];
  const byPage = data?.data?.byPage || {};
  const total = data?.data?.total || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">분석</h1>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <Button
            variant={type === "clicks" ? "default" : "outline"}
            onClick={() => setType("clicks")}
          >
            클릭
          </Button>
          <Button
            variant={type === "views" ? "default" : "outline"}
            onClick={() => setType("views")}
          >
            페이지뷰
          </Button>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
              size="sm"
            >
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {type === "clicks" ? "클릭" : "페이지뷰"} 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {total.toLocaleString()}
              </div>
              <div className="text-muted-foreground">
                최근 {days}일간 총{" "}
                {type === "clicks" ? "클릭" : "페이지뷰"} 수
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>일별 추이</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  데이터가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Products (for clicks) */}
            {type === "clicks" && (
              <Card>
                <CardHeader>
                  <CardTitle>인기 상품</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <p className="text-muted-foreground">데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((item: any, index: number) => (
                        <div
                          key={item.id || index}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground w-6">
                              {index + 1}
                            </span>
                            <span className="truncate max-w-[200px]">
                              {item.name || "Unknown"}
                            </span>
                          </div>
                          <span className="font-medium">{item.clicks}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Page Views by Page (for views) */}
            {type === "views" && (
              <Card>
                <CardHeader>
                  <CardTitle>페이지별 조회</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(byPage).length === 0 ? (
                    <p className="text-muted-foreground">데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(byPage)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .slice(0, 10)
                        .map(([page, count], index) => (
                          <div
                            key={page}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <span className="truncate max-w-[200px]">{page}</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
