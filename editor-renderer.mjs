// Only the latest requested page may replace the visible preview.
export function createPageRenderer({ createCanvas, viewportFor, commit }) {
  let revision = 0, active = null;
  return async (pdf, number, width) => {
    const current = ++revision;
    active?.cancel();
    let canvas;
    try {
      const page = await pdf.getPage(number);
      if (current !== revision) return false;
      const viewport = viewportFor(page, width);
      canvas = createCanvas();
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      active = task;
      await task.promise;
      if (current !== revision) return false;
      commit(canvas, page.getViewport({ scale: 1 }), number);
      return true;
    } catch (error) {
      if (current !== revision) return false;
      throw error;
    } finally {
      if (current === revision) active = null;
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
  };
}
