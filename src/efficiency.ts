/** Official hackathon efficiency formula. Output tokens are weighted most heavily. */
export function officialEfficiencyScore(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
}): number {
  const score = usage.input_tokens + usage.output_tokens * 3 + usage.cache_read_tokens * 0.1;
  return Math.round(score * 10) / 10;
}
