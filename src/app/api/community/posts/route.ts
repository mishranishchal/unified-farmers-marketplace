import { platformStore } from '@/lib/server/store';
import { fail, ok } from '@/lib/server/http';
import { requireSessionUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const posts = await platformStore.listPosts();
    return ok(posts);
  } catch (error) {
    return fail('Failed to fetch posts', 500, (error as Error).message);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { authorName?: string; title?: string; content?: string };
    if (!body.title || !body.content) return fail('title and content are required', 400);
    const created = await platformStore.createPost({
      authorName: body.authorName || user.name,
      authorEmail: user.email,
      title: body.title,
      content: body.content,
    });
    return ok(created, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to create post', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { id?: string; title?: string; content?: string };
    if (!body.id) return fail('id is required', 400);
    const posts = await platformStore.listPosts();
    const existing = posts.find((post) => post.id === body.id);
    if (!existing) return fail('Post not found', 404);
    if (user.role !== 'admin' && existing.authorEmail?.toLowerCase() !== user.email.toLowerCase()) return fail('Forbidden', 403);
    const updated = await platformStore.updatePost(body.id, { title: body.title, content: body.content });
    return ok(updated);
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to update post', message === 'Authentication required' ? 401 : 500, message);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as { id?: string };
    if (!body.id) return fail('id is required', 400);
    const posts = await platformStore.listPosts();
    const existing = posts.find((post) => post.id === body.id);
    if (!existing) return fail('Post not found', 404);
    if (user.role !== 'admin' && existing.authorEmail?.toLowerCase() !== user.email.toLowerCase()) return fail('Forbidden', 403);
    const deleted = await platformStore.deletePost(body.id);
    return ok({ deleted });
  } catch (error) {
    const message = (error as Error).message;
    return fail('Failed to delete post', message === 'Authentication required' ? 401 : 500, message);
  }
}
