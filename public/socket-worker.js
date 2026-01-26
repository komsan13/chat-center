// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET HEARTBEAT WEB WORKER
// ═══════════════════════════════════════════════════════════════════════════════
// This worker runs independently of the main thread and is NOT throttled by Chrome
// when the tab is in the background. This ensures heartbeats are sent reliably.
// ═══════════════════════════════════════════════════════════════════════════════

let heartbeatInterval = null;
let pingInterval = 3000; // Default 3 seconds

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'start':
      // Start heartbeat
      if (data && data.interval) {
        pingInterval = data.interval;
      }
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Send ping immediately
      self.postMessage({ type: 'ping' });
      
      // Then send at regular intervals
      heartbeatInterval = setInterval(() => {
        self.postMessage({ type: 'ping' });
      }, pingInterval);
      
      console.log('[Worker] Heartbeat started with interval:', pingInterval);
      break;
      
    case 'stop':
      // Stop heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      console.log('[Worker] Heartbeat stopped');
      break;
      
    case 'pong':
      // Server responded - connection is alive
      // Just log for debugging, main thread handles the logic
      break;
      
    case 'setInterval':
      // Update interval
      if (data && data.interval) {
        pingInterval = data.interval;
        
        // Restart with new interval if running
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(() => {
            self.postMessage({ type: 'ping' });
          }, pingInterval);
        }
      }
      break;
  }
};
