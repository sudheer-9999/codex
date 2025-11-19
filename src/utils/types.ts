export type Post = {
  id: string;
  content: string | null;
  image: string | null;
  video: string | null;
  authorId: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
};
