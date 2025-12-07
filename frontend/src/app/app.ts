import { Component, signal } from '@angular/core';
import { LoadingScreen } from './loading-screen/loading-screen';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header'

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingScreen, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('recnet');
}
