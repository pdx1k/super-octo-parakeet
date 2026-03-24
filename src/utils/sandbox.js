export function compileBehavior(source) {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`
      "use strict";
      ${source}
      if (typeof behavior !== 'function') throw new Error('behavior must be a function');
      return behavior;
    `)();
    return fn;
  } catch (e) {
    console.warn('[Behavior compile error]', e.message);
    return null;
  }
}

export function callBehavior(fn, self, nearby, dt) {
  const start = performance.now();
  try {
    const result = fn(Object.freeze(self), Object.freeze(nearby), dt);
    if (performance.now() - start > 2) {
      console.warn('[Behavior] exceeded 2ms budget for species', self.speciesId);
    }
    return result;
  } catch (e) {
    return { type: 'idle' };
  }
}
