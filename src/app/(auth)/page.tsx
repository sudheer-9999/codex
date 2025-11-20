import { CreatePost } from "../_components/create-post";
import PostsFeed from "../_components/posts-feed";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <CreatePost />
      <PostsFeed />
    </div>
  );
}
