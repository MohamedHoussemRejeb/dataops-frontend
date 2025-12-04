import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'hl', standalone: true })
export class HighlightPipe implements PipeTransform {
  transform(text: string | undefined, q: string): string {
    if (!text || !q) return text ?? '';
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${esc})`, 'ig'), '<mark>$1</mark>');
  }
}
