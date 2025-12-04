import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  standalone: true,
  selector: 'app-lineage-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  templateUrl: './lineage-shell.component.html',
  styleUrls: ['./lineage-shell.component.scss'],
})
export class LineageShellComponent {}
