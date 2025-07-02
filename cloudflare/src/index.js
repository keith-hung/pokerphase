/**
 * Cloudflare Worker for PokerPhase
 * Main entry point that handles routing and static asset serving
 */

import { Room } from './room.js';
import { indexHTML, styleCSS, scriptJS } from './assets.js';

export { Room };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API routes
    if (path.startsWith('/api/')) {
      return await handleApiRequest(request, env, ctx);
    }

    // Handle WebSocket upgrade requests
    if (request.headers.get('Upgrade') === 'websocket') {
      return await handleWebSocketUpgrade(request, env, ctx);
    }

    // Serve static files
    return await handleStaticRequest(request, env, ctx);
  }
};

/**
 * Handle API requests by forwarding to appropriate Durable Object
 */
async function handleApiRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Extract room ID from path (e.g., /api/rooms/ABC123/join)
  const roomMatch = path.match(/^\/api\/rooms\/([A-Z0-9]+)/);
  if (!roomMatch) {
    return new Response('Invalid room ID', { status: 400 });
  }

  const roomId = roomMatch[1];
  
  // Get Durable Object instance
  const roomNamespace = env.ROOM;
  const roomObjectId = roomNamespace.idFromName(roomId);
  const roomObject = roomNamespace.get(roomObjectId);

  // Forward request to Durable Object
  return await roomObject.fetch(request);
}

/**
 * Handle WebSocket upgrade requests
 */
async function handleWebSocketUpgrade(request, env, ctx) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('room');
  const userId = url.searchParams.get('user');

  if (!roomId || !userId) {
    return new Response('Missing room or user parameter', { status: 400 });
  }

  // Get Durable Object instance
  const roomNamespace = env.ROOM;
  const roomObjectId = roomNamespace.idFromName(roomId);
  const roomObject = roomNamespace.get(roomObjectId);

  // Forward WebSocket upgrade to Durable Object
  return await roomObject.fetch(request);
}

/**
 * Handle static file requests
 */
async function handleStaticRequest(request, env, ctx) {
  const url = new URL(request.url);
  let path = url.pathname;

  // Default to index.html for root path
  if (path === '/') {
    path = '/index.html';
  }

  // Serve CSS
  if (path === '/style.css') {
    return new Response(styleCSS, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }

  // Serve JavaScript
  if (path === '/script.js') {
    return new Response(scriptJS, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }

  // Serve index.html (including for root path)
  if (path === '/index.html') {
    return new Response(indexHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  }

  // Return 404 for other files
  return new Response('Not Found', { status: 404 });
}