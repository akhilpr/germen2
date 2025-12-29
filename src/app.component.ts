
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './components/chat/chat.component';
import { ProgressComponent } from './components/progress/progress.component';
import { WritingComponent } from './components/writing/writing.component';

type View = 'chat' | 'writing' | 'progress';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatComponent, ProgressComponent, WritingComponent],
})
export class AppComponent {
  currentView = signal<View>('chat');

  setView(view: View): void {
    this.currentView.set(view);
  }
}
