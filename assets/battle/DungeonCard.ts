import {Color,Graphics,ImageAsset,isValid,Mask,Node,resources,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {button,makeNode,panel,text} from './BattleUI';
const frames:Record<string,SpriteFrame>={};
/** Existing original scene paintings, reused as cropped illustrated dungeon cards. */
export function dungeonCard(parent:Node,art:string,title:string,tag:string,subtitle:string,detail:string,action:string,color:string,x:number,y:number,onEnter:()=>void):void {
    const card=panel(parent,`DungeonCard-${art}`,x,y,310,354,'#142B40',18);
    const border=makeNode('ComicBorder',card).addComponent(Graphics);border.strokeColor=new Color(color);border.lineWidth=3;border.roundRect(-153,-174,306,348,16);border.stroke();
    const clip=makeNode('ArtworkMask',card,0,39);clip.addComponent(UITransform).setContentSize(292,264);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    const draw=(frame:SpriteFrame)=>{if(!isValid(clip))return;const node=makeNode('ScenePainting',clip);const image=node.addComponent(Sprite);image.spriteFrame=frame;image.sizeMode=Sprite.SizeMode.CUSTOM;node.getComponent(UITransform)!.setContentSize(292,438);node.setPosition(0,-25,0);};
    if(frames[art])draw(frames[art]);else resources.load(`battle-art/${art}`,ImageAsset,(error,image)=>{if(error||!image)return;const texture=new Texture2D();texture.image=image;const frame=new SpriteFrame();frame.texture=texture;frames[art]=frame;draw(frame);});
    panel(card,'TitleWash',0,104,292,68,'#101F32D9',0);text(card,'DungeonTitle',title,0,106,29,'#FFDEA4',282);
    panel(card,'ChapterTag',-76,153,124,27,'#132A3EEB',4);text(card,'Tag',tag,-76,153,16,color,120);
    panel(card,'BottomWash',0,-44,292,101,'#11253BE8',0);text(card,'Subtitle',subtitle,0,-22,18,'#F5DFB4',280);text(card,'ProgressDetail',detail,0,-61,17,'#C3D5DE',278);
    button(card,'EnterDungeon',action,0,-130,272,56,color,onEnter).label.color=new Color('#172334');
    const hatch=makeNode('InkCorners',card).addComponent(Graphics);hatch.strokeColor=new Color(color);hatch.lineWidth=3;for(let i=0;i<4;i++){hatch.moveTo(110+i*8,152);hatch.lineTo(120+i*8,165);hatch.stroke();}
}
