import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { PageInfo, Post } from '../lib/meta-business-suite';
import { MetaBusinessSuiteService } from '../lib/meta-business-suite';
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "~/components/ThemeProvider";
import { cn } from "~/lib/utils";
import Image from 'next/image';

interface PageDashboardProps {
  accessToken: string;
}

export function PageDashboard({ accessToken }: PageDashboardProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
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
        if (pagesData[0]?.id) {
          setSelectedPage(pagesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching pages:', error);
      }
    };

    void fetchData();
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

      void fetchPosts();
    }
  }, [selectedPage, accessToken]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className={cn(
        "rounded-lg shadow p-6",
        theme === "dark" ? "bg-gray-800" : "bg-white"
      )}>
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={cn(
            "p-6 rounded-lg",
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          )}>
            <h2 className="text-lg font-semibold mb-2">Welcome</h2>
            <p className={cn(
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            )}>
              {userId ? `User ID: ${userId}` : "Not logged in"}
            </p>
          </div>
          <div className={cn(
            "p-6 rounded-lg",
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          )}>
            <h2 className="text-lg font-semibold mb-2">Theme</h2>
            <p className={cn(
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            )}>
              Current theme: {theme}
            </p>
          </div>
        </div>
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
                      Tasks: {page.tasks ? page.tasks.join(', ') : 'No tasks'}
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
                        <Image
                          src={post.full_picture}
                          alt="Post"
                          width={500}
                          height={300}
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
    </div>
  );
} 