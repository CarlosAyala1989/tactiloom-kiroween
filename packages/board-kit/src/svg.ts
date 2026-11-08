import type { Drawing, Primitive } from './display-list';

const FONT_STACK = 'Helvetica, Arial, sans-serif';

function num(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
}

function strokeAttrs(stroke: string | undefined, strokeWidth: number | undefined, dash?: readonly number[]): string {
  if (!stroke) return '';
  const dashAttr = dash && dash.length > 0 ? ` stroke-dasharray="${dash.map(num).join(' ')}"` : '';
  return ` stroke="${stroke}" stroke-width="${num(strokeWidth ?? 0.25)}"${dashAttr}`;
}

function renderItem(item: Primitive): string {
  switch (item.type) {
    case 'rect': {
      const radius = item.radius ? ` rx="${num(item.radius)}" ry="${num(item.radius)}"` : '';
      return `<rect x="${num(item.x)}" y="${num(item.y)}" width="${num(item.width)}" height="${num(item.height)}"${radius} fill="${item.fill ?? 'none'}"${strokeAttrs(item.stroke, item.strokeWidth, item.dash)}/>`;
    }
    case 'line':
      return `<line x1="${num(item.x1)}" y1="${num(item.y1)}" x2="${num(item.x2)}" y2="${num(item.y2)}"${strokeAttrs(item.stroke, item.strokeWidth, item.dash)}/>`;
    case 'text':
      return `<text x="${num(item.x)}" y="${num(item.y)}" font-family="${FONT_STACK}" font-size="${num(item.size)}" font-weight="${item.weight === 'bold' ? 700 : 400}" text-anchor="${item.anchor}" fill="${item.fill}">${escapeXml(item.text)}</text>`;
    case 'path': {
      const stroke = item.stroke ? strokeAttrs(item.stroke, (item.strokeWidth ?? 0.25) / item.scale) : '';
      return `<path d="${item.d}" transform="translate(${num(item.x)} ${num(item.y)}) scale(${num(item.scale)})" fill="${item.fill ?? 'none'}"${stroke}/>`;
    }
    case 'marker': {
      const module = item.size / item.modules.length;
      const runs: string[] = [];
      item.modules.forEach((row, rowIndex) => {
        let start = -1;
        for (let col = 0; col <= row.length; col += 1) {
          const white = col < row.length && row[col] === true;
          if (white && start < 0) start = col;
          if (!white && start >= 0) {
            runs.push(
              `<rect x="${num(item.x + start * module)}" y="${num(item.y + rowIndex * module)}" width="${num((col - start) * module)}" height="${num(module)}" fill="#ffffff"/>`,
            );
            start = -1;
          }
        }
      });
      return `<g data-aruco-id="${item.markerId}" shape-rendering="crispEdges"><rect x="${num(item.x)}" y="${num(item.y)}" width="${num(item.size)}" height="${num(item.size)}" fill="#000000"/>${runs.join('')}</g>`;
    }
    case 'group': {
      const id = item.id ? ` id="${escapeXml(item.id)}"` : '';
      return `<g${id} transform="translate(${num(item.x)} ${num(item.y)}) scale(${num(item.scale)})">${item.items.map(renderItem).join('')}</g>`;
    }
  }
}

/** Renders a drawing as a standalone SVG whose user unit is 1 mm. */
export function renderSvg(drawing: Drawing, title: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(drawing.width)}mm" height="${num(drawing.height)}mm" viewBox="0 0 ${num(drawing.width)} ${num(drawing.height)}" role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    ...drawing.items.map(renderItem),
    '</svg>',
    '',
  ].join('\n');
}
