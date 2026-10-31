"""Original NES-inspired score/SFX. Offline regeneration: numpy + ffmpeg; no samples."""
from pathlib import Path
import wave,subprocess,numpy as np
R=Path(__file__).resolve().parents[1];S=22050;G=np.random.default_rng(31102026)
(R/'audio').mkdir(exist_ok=True);(R/'audio-source').mkdir(exist_ok=True)
NOTES={'C':0,'C#':1,'D':2,'E':4,'F':5,'G':7,'A':9,'Bb':10,'B':11}
def hz(n):return float(n) if isinstance(n,(int,float)) else 440*2**(((int(n[-1])+1)*12+NOTES[n[:-1]]-69)/12)
def tone(y,start,dur,n,vol=.22,tri=False,duty=.25):
 if not n:return
 i=int(start*S);count=min(int(dur*S),len(y)-i)
 if count<=0:return
 t=np.arange(count)/S;f=hz(n);phase=f*t+.002*np.sin(2*np.pi*5*t)
 if tri:v=2/np.pi*np.arcsin(np.sin(2*np.pi*phase))
 else:
  v=np.zeros(count)
  for k in range(1,9):
   if f*k<S*.44:v+=2*np.sin(np.pi*k*duty)/(np.pi*k)*np.cos(2*np.pi*k*phase-np.pi*k*duty)
 env=np.minimum(1,t/.004)*np.maximum(0,np.minimum(1,(dur-t)/.035))*(.68+.32*np.exp(-t*12));y[i:i+count]+=v*env*vol

def drum(y,start,kind,vol=.15):
 dur={'kick':.16,'snare':.12,'hat':.035,'tom':.13}[kind];i=int(start*S);n=min(int(dur*S),len(y)-i);t=np.arange(n)/S
 if kind in ['kick','tom']:
  f=52 if kind=='kick' else 110;v=np.sin(2*np.pi*(f*t+14*(1-np.exp(-t*50))))*np.exp(-t*25)
 else:
  a=G.uniform(-1,1,n);v=(a-np.r_[0,a[:-1]])*np.exp(-t*(60 if kind=='hat' else 30))
  if kind=='snare':v+=.25*np.sin(2*np.pi*165*t)*np.exp(-t*30)
 y[i:i+n]+=v*vol

def write(name,y,rate=32):
 y=np.tanh(y*1.3);y-=np.mean(y);y=y/max(.01,np.max(np.abs(y)))*.78;n=min(90,len(y)//8);y[:n]*=np.linspace(0,1,n);y[-n:]*=np.linspace(1,0,n)
 wav=R/'audio-source'/f'{name}.wav'
 with wave.open(str(wav),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(S);w.writeframes((y*32767).astype('<i2').tobytes())
 mp3=R/'audio'/f'{name}.mp3';subprocess.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a',f'{rate}k','-ar',str(S),'-ac','1',str(mp3)],check=True);print(name,round(len(y)/S,2),mp3.stat().st_size)
main=[['D5','F5','A5','G5','F5','D5','C5','A4'],['Bb4','D5','F5','A5','F5','D5','C5','Bb4'],['C5','E5','G5','A5','G5','E5','D5','C5'],['A4','C#5','E5','G5','E5','C#5','B4','A4'],['D5','A5','F5','D5','F5','G5','A5',None],['Bb5','A5','F5','D5','F5','D5','C5','Bb4'],['C5','D5','E5','G5','A5','G5','E5','C5'],['A4','C#5','E5','G5','A5','G5','C#5','A4'],['D6','A5','F5','A5','G5','F5','E5','D5'],['F5','Bb5','A5','F5','D5','F5','A5',None],['G5','E5','C5','E5','D5','C5','B4','G4'],['A4','E5','C#5','E5','G5','A5','C#6','A5'],['D6','C6','A5','G5','F5','D5','F5','A5'],['Bb5','A5','G5','F5','D5','F5','C5','Bb4'],['C5','E5','G5','A5','G5','E5','C#5','A4'],['D5','F5','A5',None,'A5','G5','F5','C#5']]
boss=[['D5','D5','A4','D5','F5','D5','E5','C#5'],['Bb4','Bb4','F4','Bb4','D5','F5','E5','D5'],['C5','G4','C5','E5','G5','E5','D5','C5'],['A4','C#5','E5','A5','G5','E5','C#5','A4'],['D6','A5','F5','D5','F5','A5','C6','A5'],['Bb5','F5','D5','Bb4','D5','F5','A5','F5'],['G5','E5','C5','G4','C5','E5','G5','C#5'],['A5','G5','E5','C#5','A4','C#5','E5','C#5']]
chords=[['D3','F3','A3'],['Bb2','D3','F3'],['C3','E3','G3'],['A2','C#3','E3']]
for name,bars in [('main',main),('boss',boss)]:
 beat=60/160;y=np.zeros(round(len(bars)*4*beat*S))
 for bar,notes in enumerate(bars):
  c=chords[bar%4];o=bar*4*beat
  for j,n in enumerate(notes):
   tone(y,o+j*beat*.5,beat*.44,n,.29 if name=='boss' else .24,duty=.125 if name=='boss' else .25);tone(y,o+j*beat*.5,beat*.38,c[j%3],.1,duty=.5);tone(y,o+j*beat*.5,beat*.43,hz(c[0])*(1 if j%2==0 else 2),.25,True);drum(y,o+j*beat*.5,'hat',.055 if j%2 else .08)
  for j in range(4):drum(y,o+j*beat,'kick' if j%2==0 else 'snare',.18)
  if bar%4==3:
   for j in range(4):drum(y,o+3*beat+j*beat*.25,'tom',.11)
 write(name,y)
for name,d in [('lightning',.62),('fire',.65),('blizzard',.7),('wind',.48),('poison',.65),('heal',.8),('guard',.55),('slash',.3),('finale',1.8),('impact',.65),('victory',1.15),('defeat',.85)]:
 y=np.zeros(round(d*S));t=np.arange(len(y))/S
 if name in ['heal','victory','blizzard']:
  notes={'heal':['D5','F5','A5','D6'],'victory':['D5','F5','A5','D6','A5','D6'],'blizzard':['A6','D6','F6','A6','D7']}[name]
  for i,n in enumerate(notes):tone(y,i*d/(len(notes)+1),d*.32,n,.3,name=='heal',.5)
 elif name in ['fire','impact','slash','wind','lightning']:
  decay={'fire':8,'impact':9,'slash':22,'wind':5,'lightning':6}[name];y+=G.uniform(-1,1,len(y))*np.exp(-t*decay)*(.2 if name=='wind' else .4);f=900 if name in ['slash','lightning'] else 130;y+=np.sin(2*np.pi*(f*t+45*(1-np.exp(-t*20))))*np.exp(-t*9)*.24
  if name=='lightning':y*=.4+.6*(np.sin(t*90)>0)
 elif name=='finale':
  for i in range(12):tone(y,i*.13,.2,110*2**(i/5),.25,duty=.125)
  y+=G.uniform(-1,1,len(y))*(t/d)**2*.1
 elif name=='poison':
  for i in range(5):tone(y,i*.11,.15,480-i*65,.32,True)
 elif name=='guard':tone(y,0,.45,'D5',.3);tone(y,.06,.4,'A5',.22)
 else:
  for i,n in enumerate(['A4','F4','D4','A3']):tone(y,i*.16,.24,n,.28,True)
 write(name,y,24)
