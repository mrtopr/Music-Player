/**
 * Transition helpers — thin re-export of the AutoMix engine's canonical
 * implementation so older call sites keep working.
 *
 * @see ../automix/engine/transitionCurves.js
 */

export * from '../automix/engine/transitionCurves.js';
export {
    findTransitionPoint,
    findIncomingStart,
    detectSections,
    buildPhrases,
} from '../automix/analysis/phrases.js';
