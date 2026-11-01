export class BossWarningState {
    remaining=0;duration=1.25;
    show(duration=1.25):void{this.remaining=this.duration=duration;}
    clear():void{this.remaining=0;}
    advance(seconds:number,covered=false):void{this.remaining=covered?0:Math.max(0,this.remaining-Math.max(0,seconds));}
    get active():boolean{return this.remaining>0;}
    get opacity():number{return this.active?Math.round((.45+.35*Math.abs(Math.cos((1-this.remaining/this.duration)*Math.PI*2)))*255):0;}
}
