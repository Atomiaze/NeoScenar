import {
  estimateDurations,
  paginate,
  parse,
  type PaginationOptions,
  type ResolvedLayout
} from '@neoscenar/fountain'
import { withoutDrafts } from '../scriptLink/draftScene'

/** Pages et durée estimée d'un scénario, avec la même pagination que l'éditeur et les statistiques. */
export function scriptSummary(
  text: string,
  layout: ResolvedLayout,
  options: PaginationOptions = {}
): { pages: number; seconds: number } {
  // Les scènes brouillon ne comptent pas (18C-13).
  const doc = withoutDrafts(parse(text, { titlePage: false }))
  const pagination = paginate(doc, layout, options)
  return {
    pages: pagination.pages.length,
    seconds: Math.round(estimateDurations(doc, pagination).totalSeconds)
  }
}
