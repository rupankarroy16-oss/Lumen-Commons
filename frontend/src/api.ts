import type { DisclosurePlan, PublicMetrics, PublicReceipt } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`API request failed (${response.status})`)
  return response.json() as Promise<T>
}

export function composePlan(): Promise<DisclosurePlan> {
  return jsonRequest('/api/v1/plans/compose', {
    method: 'POST',
    body: JSON.stringify({
      public_requirement: 'Residents of North Harbor aged 16+ may submit one response.',
      public_response_labels: ['support', 'unsure', 'concern'],
    }),
  })
}

export function publishReceipt(receipt: PublicReceipt): Promise<PublicReceipt & { id: number }> {
  return jsonRequest('/api/v1/receipts', { method: 'POST', body: JSON.stringify(receipt) })
}

export function getMetrics(): Promise<PublicMetrics[]> {
  return jsonRequest('/api/v1/metrics')
}
