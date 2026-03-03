import type { Task } from '@/types/models'

export function calculateRiskScore(task: Task): number {
  if (task.state === 'done') {
    return 0
  }

  let score = 0

  // Priority points
  switch (task.priority_label) {
    case 'critical':
      score += 30
      break
    case 'high':
      score += 20
      break
    case 'medium':
      score += 10
      break
    default:
      break
  }

  // Difficulty points
  switch (task.difficulty) {
    case 'extreme':
      score += 20
      break
    case 'hard':
      score += 12
      break
    case 'medium':
      score += 6
      break
    default:
      break
  }

  // Blocked points
  if (task.state === 'blocked') {
    score += 20
  }

  // Unscheduled points
  if (!task.planned_start_at) {
    score += 15
  }

  // Due soon points
  if (task.due_at && !['done', 'dropped'].includes(task.state)) {
    const daysUntilDue = Math.floor(
      (new Date(task.due_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysUntilDue <= 1) {
      score += 30
    } else if (daysUntilDue <= 3) {
      score += 20
    } else if (daysUntilDue <= 7) {
      score += 10
    }
  }

  return score
}

export function getRiskScoreColor(score: number): string {
  if (score >= 60) return 'text-red-600 bg-red-50'
  if (score >= 40) return 'text-orange-600 bg-orange-50'
  if (score >= 20) return 'text-yellow-600 bg-yellow-50'
  return 'text-green-600 bg-green-50'
}
