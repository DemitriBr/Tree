// Service Worker for Job Application Tracker
// Step 28: Offline Capability

const CACHE_NAME = 'job-tracker-v1';
const STATIC_CACHE_NAME = 'job-tracker-static-v1';
const DYNAMIC_CACHE_NAME = 'job-tracker-dynamic-v1';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    // Add your app icons here if you have them
    // '/icons/icon-192x192.png',
    // '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[Service Worker] Static files cached');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => {
                        // Delete old cache versions
                        return cacheName.startsWith('job-tracker-') && 
                               cacheName !== STATIC_CACHE_NAME &&
                               cacheName !== DYNAMIC_CACHE_NAME;
                    })
                    .map(cacheName => {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            console.log('[Service Worker] Activated');
            // Take control of all pages immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Handle Google Fonts separately
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(request).then(response => {
                        // Cache font files
                        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(request, response.clone());
                            return response;
                        });
                    });
                })
                .catch(() => {
                    // If font fails to load, just continue without it
                    console.log('[Service Worker] Font request failed, continuing without it');
                })
        );
        return;
    }
    
    // For our own assets, try cache first (Cache First strategy)
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        console.log('[Service Worker] Serving from cache:', request.url);
                        return response;
                    }
                    
                    console.log('[Service Worker] Fetching:', request.url);
                    return fetch(request).then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache the fetched response
                        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                        
                        return response;
                    });
                })
                .catch(error => {
                    console.error('[Service Worker] Fetch failed:', error);
                    
                    // Return offline page for navigation requests
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                    
                    // For other requests, return a basic offline response
                    return new Response('Offline - Content not available', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                })
        );
    } else {
        // For external resources, try network first (Network First strategy)
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone the response
                    const responseToCache = response.clone();
                    
                    // Cache successful responses
                    if (response.status === 200) {
                        caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    
                    return response;
                })
                .catch(() => {
                    // Try to serve from cache if network fails
                    return caches.match(request);
                })
        );
    }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('[Service Worker] All caches cleared');
                // Send message back to client
                if (event.ports[0]) {
                    event.ports[0].postMessage({ success: true });
                }
            })
        );
    }
    
    if (event.data && event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            calculateCacheSize().then(size => {
                if (event.ports[0]) {
                    event.ports[0].postMessage({ size: size });
                }
            })
        );
    }
});

// Helper function to calculate cache size
async function calculateCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Background sync for offline actions (if supported)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);
    
    if (event.tag === 'sync-applications') {
        event.waitUntil(syncApplications());
    }
});

// Sync applications when back online
async function syncApplications() {
    console.log('[Service Worker] Syncing applications...');
    
    // Send message to all clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_REQUIRED',
            message: 'Connection restored - syncing data'
        });
    });
}

// Handle push notifications (for future enhancement)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Job Application Tracker', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});
