// Shared connections store for real-time streaming
// This ensures the stream and broadcast endpoints use the same connection set

export const connections: Set<ReadableStreamDefaultController> = new Set()

export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}

export function broadcast(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  const deadConnections: ReadableStreamDefaultController[] = []

  for (const controller of connections) {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch (error) {
      console.error('Error broadcasting to client:', error)
      deadConnections.push(controller)
    }
  }

  // Clean up dead connections
  deadConnections.forEach(controller => connections.delete(controller))
}

export function getConnectionCount(): number {
  return connections.size
}