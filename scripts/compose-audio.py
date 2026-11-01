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
# Twenty-four-bar arrangements: A/B/bridge, with different keys, grooves and pulse colors.
boat=[['F5','A5','C6',None,'A5','G5','F5','D5'],['Bb4','D5','F5','A5','F5',None,'D5','F5'],['C5','E5','G5','C6','G5','E5','D5','C5'],['A4','C5','E5','G5','E5','C5','A4',None],['D5','F5','A5','C6','A5','F5','E5','D5'],['G4','Bb4','D5','F5','D5','Bb4','A4','G4'],['C5','F5','E5','G5','C6','Bb5','G5','E5'],['F5','A5','C6','A5','G5','F5',None,'C5']]
themes=[
 ('menu',boat[:8]+boat[::-1]+boat,100,7,.5,'menu'),
 ('main',main+main[:8],160,0,.25,'march'),
 ('city',boss+main[:8]+boss,144,-5,.125,'siege'),
 ('trial',main[8:]+boss+main[:8],188,2,.25,'rush'),
 ('boat',boat+boat[::-1]+boat,132,0,.5,'boat'),
 ('mainboss',boss+main[8:]+boss[::-1],176,0,.125,'danger'),
 ('boss',boss+boss[::-1]+main[8:],148,-2,.125,'heavy'),
 ('boss-zhangjiao',main[8:]+boss+main[:8],184,5,.125,'storm'),
 ('boss-menghuo',boss[::-1]+main[:8]+boss,164,-5,.25,'tribal'),
]
for name,bars,bpm,transpose,duty,groove in themes:
 beat=60/bpm;y=np.zeros(round(len(bars)*4*beat*S));shift=2**(transpose/12)
 for bar,notes in enumerate(bars):
  c=chords[bar%4] if groove!='boat' else [['F3','A3','C4'],['Bb2','D3','F3'],['C3','E3','G3'],['A2','C3','E3'],['D3','F3','A3'],['G2','Bb2','D3'],['C3','E3','G3'],['F3','A3','C4']][bar%8]
  o=bar*4*beat;section=bar//8
  for j,n in enumerate(notes):
   swing=.07*beat if groove=='boat' and j%2 else 0
   start=o+j*beat*.5+swing
   # A contrasting bridge changes register/spacing rather than repeating one eight-note cell.
   melody=hz(n)*shift*(2 if section==2 and j in [2,5] else 1) if n else None
   tone(y,start,beat*(.68 if groove=='boat' and j%3==0 else .43),melody,.16 if groove=='menu' else .24 if groove=='boat' else .29,tri=groove=='menu',duty=duty)
   if section==1 and j%2==0:tone(y,start+beat*.03,beat*.4,hz(c[(j+1)%3])*shift*4,.12,duty=.5)
   tone(y,start,beat*.35,hz(c[j%3])*shift,.095,duty=.5)
   bass=hz(c[0])*shift*(1 if j%2==0 else 2)
   tone(y,start,beat*.43,bass,.24,True)
   if groove!='menu' and (groove!='boat' or j%2==0):drum(y,start,'hat',.04 if groove=='boat' else .07)
  for j in range(4):
   drum(y,o+j*beat,'kick' if j%2==0 else 'snare',.05 if groove=='menu' else .23 if groove in ['siege','heavy'] else .15)
   if groove=='tribal':drum(y,o+(j+.5)*beat,'tom',.15)
   if groove=='rush' and j%2==0:drum(y,o+(j+.5)*beat,'kick',.1)
  if bar%4==3:
   for j in range(4 if section!=2 else 8):drum(y,o+3*beat+j*beat/(4 if section!=2 else 8),'tom',.12)
  if groove=='storm' and bar%4==2:
   for j in range(3):tone(y,o+j*beat*.2,.09,1400+j*360,.035,duty=.125)
 # Short wraparound echoes add depth while keeping the loop length exact.
 y+=np.roll(y,int(.75*beat*S))*.1+np.roll(y,int(1.5*beat*S))*.04
 if '--only-new' not in __import__('sys').argv or name=='menu':write(name,y)

fx=[('lightning',1.05),('fire',1.15),('blizzard',1.3),('wind',.85),('poison',.95),('heal',1.25),('guard',.8),('slash',.5),('finale',1.8),('impact',.75),('victory',1.35),('defeat',1.1),('boss-arrive',.95),('critical',.38)]
for name,d in fx:
 y=np.zeros(round(d*S));t=np.arange(len(y))/S
 if name in ['heal','victory','blizzard']:
  notes={'heal':['F5','A5','C6','F6','A6'],'victory':['D5','F5','A5','D6','A5','D6','F6'],'blizzard':['A6','D6','F6','A6','D7','A6','F6']}[name]
  for i,n in enumerate(notes):tone(y,i*d/(len(notes)+2),d*.37,n,.27,name=='heal',.5)
  for i,n in enumerate(notes):tone(y,i*d/(len(notes)+2)+.1,d*.32,n,.08,True)
 elif name in ['fire','impact','slash','wind','lightning']:
  decay={'fire':4,'impact':7,'slash':15,'wind':3,'lightning':3}[name];noise=G.uniform(-1,1,len(y));noise=noise-np.r_[0,noise[:-1]]*.7
  y+=noise*np.exp(-t*decay)*(.2 if name=='wind' else .35);f=1000 if name in ['slash','lightning'] else 130
  y+=np.sin(2*np.pi*(f*t+55*(1-np.exp(-t*16))))*np.exp(-t*6)*.25
  if name=='lightning':y*=.25+.75*(np.sin(t*78)>0);y+=np.roll(y,int(.12*S))*.25
  if name=='fire':
   for i in range(3):drum(y,.1+i*.16,'tom',.12)
 elif name=='finale':
  for i in range(12):tone(y,i*.13,.22,110*2**(i/5),.25,duty=.125)
  y+=G.uniform(-1,1,len(y))*(t/d)**2*.1
 elif name=='boss-arrive':
  # Two isolated scanner-style electronic pips. No drum/chord/third tail.
  for start in [0,.42]:
   i=int(start*S);n=int(.19*S);q=np.arange(n)/S
   env=np.minimum(1,q/.008)*np.minimum(1,(.19-q)/.018)
   y[i:i+n]+=(np.sin(2*np.pi*1050*q)+.22*np.sin(2*np.pi*2100*q))*env*.46
 elif name=='critical':
  tone(y,0,.11,960,.3,duty=.125);tone(y,.045,.22,480,.32,duty=.25);drum(y,.015,'snare',.27)
 elif name=='poison':
  for i in range(7):tone(y,i*.1,.19,540-i*53,.3,True)
 elif name=='guard':
  for f,v in [(587,.28),(880,.19),(1174,.1)]:tone(y,.02,.68,f,v)
  drum(y,0,'snare',.17)
 else:
  for i,n in enumerate(['A4','F4','D4','A3']):tone(y,i*.19,.34,n,.28,True)
 if '--only-new' not in __import__('sys').argv or name=='boss-arrive':write(name,y,32)

for kind in ['slash','pierce','bow','magic']:
 for variant in range(2):
  d=.18 if kind!='magic' else .26;y=np.zeros(round(d*S));t=np.arange(len(y))/S
  if kind=='bow':tone(y,0,.12,520+variant*70,.23,True);y+=G.uniform(-1,1,len(y))*np.exp(-t*48)*.13
  elif kind=='magic':
   for i,f in enumerate([880,1174,1568]):tone(y,i*.035,.14,f*(1+variant*.05),.16,True)
  else:
   noise=G.uniform(-1,1,len(y));y+=noise*np.exp(-t*(35 if kind=='slash' else 48))*.23
   tone(y,0,.13,(220 if kind=='slash' else 740)+variant*90,.24,duty=.125)
  if '--only-new' not in __import__('sys').argv:write(f'hit-{kind}-{variant}',y,32)
