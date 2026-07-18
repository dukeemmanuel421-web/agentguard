export type BinaryDecision = {
  expectedBlocked: boolean
  actualBlocked: boolean
}

export type BenchmarkMetrics = {
  total: number
  truePositive: number
  trueNegative: number
  falsePositive: number
  falseNegative: number
  accuracy: number
  precision: number
  recall: number
  f1: number
  falsePositiveRate: number
  falseNegativeRate: number
}

function divide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

export function calculateMetrics(decisions: readonly BinaryDecision[]): BenchmarkMetrics {
  let truePositive = 0
  let trueNegative = 0
  let falsePositive = 0
  let falseNegative = 0

  for (const decision of decisions) {
    if (decision.expectedBlocked && decision.actualBlocked) truePositive += 1
    else if (!decision.expectedBlocked && !decision.actualBlocked) trueNegative += 1
    else if (!decision.expectedBlocked && decision.actualBlocked) falsePositive += 1
    else falseNegative += 1
  }

  const total = decisions.length
  const precision = divide(truePositive, truePositive + falsePositive)
  const recall = divide(truePositive, truePositive + falseNegative)

  return {
    total,
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    accuracy: divide(truePositive + trueNegative, total),
    precision,
    recall,
    f1: divide(2 * precision * recall, precision + recall),
    falsePositiveRate: divide(falsePositive, falsePositive + trueNegative),
    falseNegativeRate: divide(falseNegative, falseNegative + truePositive),
  }
}
