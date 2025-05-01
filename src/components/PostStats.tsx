import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PostStats {
  id: string;
  reach: number;
  impressions: number;
  engagement: number;
  reactions: number;
  comments: number;
  shares: number;
  clicks: number;
}

interface PostStatsProps {
  stats: PostStats;
}

export function PostStats({ stats }: PostStatsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Post Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Reach</p>
            <p className="text-2xl font-bold">{stats.reach.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Impressions</p>
            <p className="text-2xl font-bold">{stats.impressions.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Engagement</p>
            <p className="text-2xl font-bold">{stats.engagement.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Reactions</p>
            <p className="text-2xl font-bold">{stats.reactions.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Comments</p>
            <p className="text-2xl font-bold">{stats.comments.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Shares</p>
            <p className="text-2xl font-bold">{stats.shares.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Clicks</p>
            <p className="text-2xl font-bold">{stats.clicks.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 