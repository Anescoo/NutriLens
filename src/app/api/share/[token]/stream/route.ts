import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Poll every 5 s; send "deleted" event if the plan link is revoked or plan is gone
      const interval = setInterval(async () => {
        try {
          const shared = await prisma.sharedPlan.findUnique({
            where: { token },
            select: { planId: true },
          });

          if (!shared || shared.planId === null) {
            controller.enqueue(encoder.encode('data: deleted\n\n'));
            clearInterval(interval);
            controller.close();
          }
        } catch {
          // DB error — keep polling
        }
      }, 5000);

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
