import {
  estimateDurations,
  paginate,
  parse,
  type PaginationOptions,
  type ResolvedLayout
} from '@neoscenar/fountain'

/** Pages et durée estimée d'un scénario, avec la même pagination que l'éditeur et les statistiques. */
export function scriptSummary(
  text: string,
  layout: ResolvedLayout,
  options: PaginationOptions = {}
): { pages: number; seconds: number } {
  const doc = parse(text, { titlePage: false })
  const pagination = paginate(doc, layout, options)
  return {
    pages: pagination.pages.length,
    seconds: Math.round(estimateDurations(doc, pagination).totalSeconds)
  }
}
