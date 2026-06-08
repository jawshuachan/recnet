import { Component, signal, effect, inject } from '@angular/core';
type Cell = { i:number, j:number, delayMs:number }

@Component({
  selector: 'app-loading-screen',
  imports: [],
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.css',
})

export class LoadingScreen {
  rows = 8;
  cols = 8;

  cells = signal<Cell[]>([])

  ngOnInit(){
    const arr: Cell[]=[];
    for (let i=0; i< this.rows; i++) {
      for (let j=0; j<this.cols; j++) {
        arr.push({ i, j, delayMs: (i + j) * 80 });
      }
    }
    this.cells.set(arr);
  }
}
