"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VideoScoreBreakdown {
  viewScore: number;
  engagementScore: number;
  viralityScore: number;
  recencyScore: number;
  shortsBonus: number;
  totalScore: number;
  details: {
    viewCount: number;
    engagementRate: number;
    viewToSubRatio: number | null;
    daysSincePublished: number;
    isShorts: boolean;
  };
  weights: {
    viewWeight: number;
    engagementWeight: number;
    viralityWeight: number;
    recencyWeight: number;
  };
}

interface ProductScoreBreakdown {
  score: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  videoCount: number;
  avgEngagement: number;
  breakdown: {
    topVideoScores: { rank: number; score: number; weight: number }[];
    weightedAvgScore: number;
    videoCountBonus: number;
  };
}

interface ScoreBreakdownProps {
  productScoreBreakdown: ProductScoreBreakdown;
  videos: {
    id: string;
    title: string;
    scoreBreakdown: VideoScoreBreakdown | null;
  }[];
}

function ProgressBar({
  value,
  max = 1,
  label,
  color = "bg-primary",
}: {
  value: number;
  max?: number;
  label: string;
  color?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBreakdown({
  productScoreBreakdown,
  videos,
}: ScoreBreakdownProps) {
  const [showVideoDetails, setShowVideoDetails] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const selectedVideo = videos.find((v) => v.id === selectedVideoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          점수 산출 상세
          <span className="text-sm font-normal text-muted-foreground">
            (총 점수: {productScoreBreakdown.score.toFixed(1)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Score Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium">상품 점수 계산</h4>

          <div className="grid gap-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>상위 영상 가중 평균 점수</span>
              <span className="font-bold text-primary">
                {productScoreBreakdown.breakdown.weightedAvgScore.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>영상 개수 보너스 ({productScoreBreakdown.videoCount}개)</span>
              <span className="font-bold text-green-500">
                +{productScoreBreakdown.breakdown.videoCountBonus.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <span className="font-medium">최종 점수</span>
              <span className="font-bold text-lg text-primary">
                {productScoreBreakdown.score.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Top Video Scores */}
          {productScoreBreakdown.breakdown.topVideoScores.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm text-muted-foreground">상위 영상별 점수 (가중치)</h5>
              <div className="grid gap-2">
                {productScoreBreakdown.breakdown.topVideoScores.map((item) => (
                  <div
                    key={item.rank}
                    className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded"
                  >
                    <span>#{item.rank} 영상</span>
                    <span>
                      {item.score.toFixed(2)}
                      <span className="text-muted-foreground ml-1">
                        (x{item.weight})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Video Score Details Toggle */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVideoDetails(!showVideoDetails)}
            className="w-full"
          >
            {showVideoDetails ? "개별 영상 점수 숨기기" : "개별 영상 점수 보기"}
          </Button>
        </div>

        {/* Individual Video Scores */}
        {showVideoDetails && (
          <div className="space-y-4">
            <h4 className="font-medium">개별 영상 점수</h4>

            <div className="flex flex-wrap gap-2">
              {videos
                .filter((v) => v.scoreBreakdown)
                .map((video, index) => (
                  <Button
                    key={video.id}
                    variant={selectedVideoId === video.id ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setSelectedVideoId(
                        selectedVideoId === video.id ? null : video.id
                      )
                    }
                  >
                    영상 {index + 1} ({video.scoreBreakdown?.totalScore.toFixed(1)})
                  </Button>
                ))}
            </div>

            {selectedVideo?.scoreBreakdown && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium line-clamp-2">
                  {selectedVideo.title}
                </p>

                <div className="space-y-3">
                  <ProgressBar
                    value={selectedVideo.scoreBreakdown.viewScore}
                    label={`조회수 점수 (${selectedVideo.scoreBreakdown.weights.viewWeight * 100}%)`}
                    color="bg-blue-500"
                  />
                  <ProgressBar
                    value={selectedVideo.scoreBreakdown.engagementScore}
                    label={`참여도 점수 (${selectedVideo.scoreBreakdown.weights.engagementWeight * 100}%)`}
                    color="bg-green-500"
                  />
                  <ProgressBar
                    value={selectedVideo.scoreBreakdown.viralityScore}
                    label={`확산성 점수 (${selectedVideo.scoreBreakdown.weights.viralityWeight * 100}%)`}
                    color="bg-purple-500"
                  />
                  <ProgressBar
                    value={selectedVideo.scoreBreakdown.recencyScore}
                    label={`최신성 점수 (${selectedVideo.scoreBreakdown.weights.recencyWeight * 100}%)`}
                    color="bg-orange-500"
                  />
                </div>

                {/* Calculation Details */}
                <div className="grid grid-cols-2 gap-2 text-xs mt-4">
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">조회수</span>
                    <p className="font-medium">
                      {selectedVideo.scoreBreakdown.details.viewCount.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">참여율</span>
                    <p className="font-medium">
                      {selectedVideo.scoreBreakdown.details.engagementRate.toFixed(2)}%
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">조회/구독 비율</span>
                    <p className="font-medium">
                      {selectedVideo.scoreBreakdown.details.viewToSubRatio?.toFixed(2) ??
                        "N/A"}
                    </p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <span className="text-muted-foreground">게시일로부터</span>
                    <p className="font-medium">
                      {selectedVideo.scoreBreakdown.details.daysSincePublished}일
                    </p>
                  </div>
                </div>

                {/* Shorts Bonus */}
                {selectedVideo.scoreBreakdown.details.isShorts && (
                  <div className="flex items-center gap-2 text-sm text-purple-500">
                    <span>Shorts 보너스 적용</span>
                    <span className="font-bold">x1.1</span>
                  </div>
                )}

                {/* Final Score */}
                <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-medium">영상 점수</span>
                  <span className="font-bold text-lg text-primary">
                    {selectedVideo.scoreBreakdown.totalScore.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scoring Formula Explanation */}
        <div className="border-t pt-4">
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition">
              점수 계산 방식 알아보기
            </summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <div>
                <strong className="text-foreground">영상 점수 계산:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>조회수 점수 (30%): log10(조회수) / 7 (1천만 조회 = 만점)</li>
                  <li>참여도 점수 (30%): (좋아요 + 댓글x2) / 조회수 (10% = 만점)</li>
                  <li>확산성 점수 (25%): 조회수 / 구독자수 (5배 = 만점)</li>
                  <li>최신성 점수 (15%): e^(-일수/30) (반감기 30일)</li>
                  <li>Shorts 영상: 1.1배 보너스</li>
                </ul>
              </div>
              <div>
                <strong className="text-foreground">상품 점수 계산:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>상위 5개 영상의 가중 평균 (1위: x1, 2위: x0.5, ...)</li>
                  <li>영상 개수 보너스: log10(개수+1) / 2 x 10</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
