import { Component } from '@angular/core';
import { SafeUrlPipe } from '../../shared/pipes/safe-url.pipe';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-powerbi',
  standalone: true,
  imports: [SafeUrlPipe, NgIf],
  templateUrl: './powerbi.component.html',
  styleUrls: ['./powerbi.component.scss']
})
export class PowerbiComponent {
  url = 'https://app.powerbi.com/reportEmbed?reportId=2800b40c-d8b2-45ed-8243-bb80c055dd86&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';

  isFullscreen = false;

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  openInNewTab(): void {
    window.open(this.url, '_blank');
  }
}
