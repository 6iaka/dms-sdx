import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PostStats } from './PostStats';
import { MetaBusinessSuiteService, PageInfo, Post } from '../lib/meta-business-suite';

interface PageDashboardProps {
  accessToken: string;
}

export function PageDashboard({ accessToken }: PageDashboardProps) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const metaService = new MetaBusinessSuiteService(accessToken);
    
    const fetchData = async () => {
      try {
        const pagesData = (await metaService.getPages()) as unknown as PageInfo[];
        setPages(pagesData);
        if (pagesData.length > 0) {
          setSelectedPage(pagesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching pages:', error);
      }
    };

    fetchData();
  }, [accessToken]);

  useEffect(() => {
    if (selectedPage) {
      const metaService = new MetaBusinessSuiteService(accessToken);
      
      const fetchPosts = async () => {
        try {
          const postsData = await metaService.getPagePosts(selectedPage);
          setPosts(postsData);
        } catch (error) {
          console.error('Error fetching posts:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchPosts();
    }
  }, [selectedPage, accessToken]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => (
              <Card
                key={page.id}
                className={`cursor-pointer ${
                  selectedPage === page.id ? 'border-primary' : ''
                }`}
                onClick={() => setSelectedPage(page.id)}
              >
                <CardHeader>
                  <CardTitle>{page.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Tasks: {page.tasks?.join(', ') || 'No tasks'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="pt-6">
                    {post.message && (
                      <p className="mb-4">{post.message}</p>
                    )}
                    {post.full_picture && (
                      <img
                        src={post.full_picture}
                        alt="Post"
                        className="rounded-lg mb-4"
                      />
                    )}
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>
                        Posted on: {new Date(post.created_time).toLocaleDateString()}
                      </span>
                      <a
                        href={post.permalink_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View on Facebook
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 