import type { Chart, ExportFormat } from '../types';

const A3_PNG = { width: 4961, height: 3508 };

const readAsDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('An image could not be prepared for export.'));
  reader.readAsDataURL(blob);
});

async function assetDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The export asset “${url}” could not be loaded.`);
  return readAsDataUrl(await response.blob());
}

async function prepareSvg(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-export-ignore]').forEach((element) => element.remove());
  const images = [...clone.querySelectorAll('image')];
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href') ?? image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href) image.setAttribute('href', await assetDataUrl(href));
  }));
  const [gotham, poppins] = await Promise.all([assetDataUrl('/assets/Gotham-Bold.otf'), assetDataUrl('/assets/Poppins-Medium.otf')]);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@font-face{font-family:Gotham;src:url(${gotham}) format('opentype');font-weight:700;ascent-override:80%;descent-override:20%;line-gap-override:0%}@font-face{font-family:Poppins;src:url(${poppins}) format('opentype');font-weight:500;ascent-override:80%;descent-override:20%;line-gap-override:0%}`;
  clone.insertBefore(style, clone.firstChild);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(A3_PNG.width));
  clone.setAttribute('height', String(A3_PNG.height));
  return new XMLSerializer().serializeToString(clone);
}

async function renderCanvas(svg: SVGSVGElement): Promise<HTMLCanvasElement> {
  const source = await prepareSvg(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('The chart could not be rendered for export.'));
      element.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = A3_PNG.width; canvas.height = A3_PNG.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas export is not available in this browser.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The PNG file could not be created.')), 'image/png'));
const filename = (chart: Chart, extension: string) => `${chart.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'organizational-chart'}.${extension}`;
const download = (blob: Blob, name: string) => {
  const link = document.createElement('a'); const url = URL.createObjectURL(blob);
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export async function exportChart(svg: SVGSVGElement, chart: Chart, format: ExportFormat): Promise<void> {
  const canvas = await renderCanvas(svg);
  if (format === 'png') {
    download(await canvasBlob(canvas), filename(chart, 'png'));
    return;
  }
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3', compress: true });
  document.setProperties({ title: chart.name, subject: 'Organizational structure', creator: 'Org Chart Studio' });
  document.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 420, 297, undefined, 'FAST');
  document.save(filename(chart, 'pdf'));
}
