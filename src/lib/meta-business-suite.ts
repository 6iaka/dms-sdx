/*
import axios from 'axios';

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

export interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
}

export interface Post {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
}

interface FacebookApiResponse<T> {
  data: T[];
}

interface MetricValue {
  value: number;
}

interface MetricData {
  name: string;
  values: MetricValue[];
}

interface InsightsResponse {
  data: MetricData[];
}

export class MetaBusinessSuiteService {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Get list of pages the user has access to
  async getPages(): Promise<PageInfo[]> {
    try {
      const response = await axios.get<FacebookApiResponse<PageInfo>>(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,access_token,tasks',
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching pages:', error);
      return [];
    }
  }

  // Get posts from a specific page
  async getPagePosts(pageId: string, limit = 10): Promise<Post[]> {
    try {
      const response = await axios.get<FacebookApiResponse<Post>>(`${this.baseUrl}/${pageId}/posts`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,message,created_time,full_picture,permalink_url',
          limit,
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching page posts:', error);
      throw error;
    }
  }

  // Get detailed post statistics
  async getPostStats(postId: string): Promise<PostStats> {
    try {
      const response = await axios.get<InsightsResponse>(`${this.baseUrl}/${postId}/insights`, {
        params: {
          access_token: this.accessToken,
          metric: 'post_impressions,post_reach,post_engaged_users,post_reactions_by_type,post_comments,post_shares,post_clicks',
        },
      });

      const metrics = response.data.data.reduce<Record<string, number>>((acc, metric) => {
        if (metric.values[0]) {
          acc[metric.name] = metric.values[0].value;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        id: postId,
        reach: metrics.post_reach || 0,
        impressions: metrics.post_impressions || 0,
        engagement: metrics.post_engaged_users || 0,
        reactions: metrics.post_reactions_by_type || 0,
        comments: metrics.post_comments || 0,
        shares: metrics.post_shares || 0,
        clicks: metrics.post_clicks || 0,
      };
    } catch (error) {
      console.error('Error fetching post stats:', error);
      throw error;
    }
  }

  // Get multiple post statistics
  async getMultiplePostStats(postIds: string[]): Promise<PostStats[]> {
    const statsPromises = postIds.map(postId => this.getPostStats(postId));
    return Promise.all(statsPromises);
  }

  // Create a new post on a page
  async createPost(pageId: string, message: string): Promise<Post> {
    try {
      const response = await axios.post<Post>(`${this.baseUrl}/${pageId}/feed`, {
        message,
        access_token: this.accessToken,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // Get page insights
  async getPageInsights(pageId: string, metric: string, period: 'day' | 'week' | 'month' = 'day'): Promise<MetricData[]> {
    try {
      const response = await axios.get<InsightsResponse>(`${this.baseUrl}/${pageId}/insights`, {
        params: {
          access_token: this.accessToken,
          metric,
          period,
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching page insights:', error);
      throw error;
    }
  }
}
*/ 